import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  FileAnalysis,
  FunctionDeclaration,
  ClassDeclaration,
  ServiceCall,
  EndToEndFlow,
  ComplexityMetrics,
} from '@codemapr/shared';
import { AICacheService } from './ai-cache.service';

export interface AIExplanationRequest {
  type: ExplanationType;
  context: ExplanationContext;
  options?: ExplanationOptions;
}

export interface ExplanationContext {
  code?: string;
  filePath?: string;
  fileAnalysis?: FileAnalysis;
  functionDeclaration?: FunctionDeclaration;
  classDeclaration?: ClassDeclaration;
  serviceCall?: ServiceCall;
  endToEndFlow?: EndToEndFlow;
  complexity?: ComplexityMetrics;
  additionalContext?: string;
}

export interface ExplanationOptions {
  includeCodeSuggestions?: boolean;
  includeSecurityAnalysis?: boolean;
  includePerformanceAnalysis?: boolean;
  maxTokens?: number;
  temperature?: number;
  language?: 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja';
}

export interface AIExplanationResponse {
  explanation: string;
  suggestions?: CodeSuggestion[];
  securityIssues?: SecurityIssue[];
  performanceIssues?: PerformanceIssue[];
  confidence: number;
  tokensUsed: number;
  processingTime: number;
}

export interface CodeSuggestion {
  type: 'refactor' | 'optimization' | 'best_practice' | 'bug_fix';
  title: string;
  description: string;
  originalCode?: string;
  suggestedCode?: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
}

export interface SecurityIssue {
  type: 'vulnerability' | 'best_practice' | 'configuration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location?: {
    line: number;
    column: number;
  };
  recommendation: string;
  cweId?: string;
}

export interface PerformanceIssue {
  type: 'bottleneck' | 'memory' | 'cpu' | 'io' | 'algorithm';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  location?: {
    line: number;
    column: number;
  };
  recommendation: string;
  estimatedImpact?: string;
}

export enum ExplanationType {
  CODE_EXPLANATION = 'code_explanation',
  FUNCTION_ANALYSIS = 'function_analysis',
  CLASS_ANALYSIS = 'class_analysis',
  SERVICE_CALL_ANALYSIS = 'service_call_analysis',
  FLOW_ANALYSIS = 'flow_analysis',
  SECURITY_ANALYSIS = 'security_analysis',
  PERFORMANCE_ANALYSIS = 'performance_analysis',
  CODE_REVIEW = 'code_review',
  REFACTORING_SUGGESTIONS = 'refactoring_suggestions',
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly openai: OpenAI;
  private readonly rateLimiter: Map<string, number[]> = new Map();
  private readonly maxRequestsPerMinute = 60;
  private readonly maxTokensPerRequest = 4000;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: AICacheService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    if (!apiKey) {
      this.logger.warn('OpenAI API key not configured. AI features will be disabled.');
      return;
    }

    this.openai = new OpenAI({
      apiKey,
      timeout: 30000, // 30 second timeout
      maxRetries: 3,
    });

    this.logger.log('OpenAI client initialized successfully');
  }

  async generateExplanation(request: AIExplanationRequest): Promise<AIExplanationResponse> {
    const startTime = Date.now();

    try {
      // Check if OpenAI is configured
      if (!this.openai) {
        throw new Error('OpenAI API key not configured');
      }

      // Check cache first
      const cachedResponse = await this.cacheService.get(request);
      if (cachedResponse) {
        this.logger.debug(`Returning cached response for ${request.type}`);
        return {
          ...cachedResponse,
          processingTime: Date.now() - startTime,
        };
      }

      // Apply rate limiting
      await this.checkRateLimit();

      // Prepare the prompt based on explanation type
      const prompt = this.buildPrompt(request);
      
      // Validate token count
      const estimatedTokens = this.estimateTokenCount(prompt);
      if (estimatedTokens > this.maxTokensPerRequest) {
        throw new Error(`Request too large: ${estimatedTokens} tokens (max: ${this.maxTokensPerRequest})`);
      }

      this.logger.debug(`Generating ${request.type} explanation (estimated ${estimatedTokens} tokens)`);

      // Call OpenAI API with exponential backoff
      const completion = await this.callOpenAIWithRetry(prompt, request.options);

      // Parse the response
      const response = this.parseAIResponse(completion, request.type);
      
      const processingTime = Date.now() - startTime;
      this.logger.debug(`AI explanation generated in ${processingTime}ms`);

      const finalResponse = {
        ...response,
        processingTime,
        tokensUsed: completion.usage?.total_tokens || 0,
      };

      // Cache the response
      await this.cacheService.set(request, finalResponse);

      return finalResponse;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`AI explanation failed after ${processingTime}ms:`, error.message);
      
      // Return fallback response
      return this.getFallbackResponse(request.type, error.message, processingTime);
    }
  }

  async analyzeCodeSecurity(
    code: string,
    filePath: string,
    fileAnalysis?: FileAnalysis
  ): Promise<SecurityIssue[]> {
    try {
      // First, get static analysis results if available
      let staticVulnerabilities: any[] = [];
      if (fileAnalysis?.securityVulnerabilities) {
        staticVulnerabilities = fileAnalysis.securityVulnerabilities;
      }

      const request: AIExplanationRequest = {
        type: ExplanationType.SECURITY_ANALYSIS,
        context: {
          code,
          filePath,
          fileAnalysis,
          additionalContext: staticVulnerabilities.length > 0 
            ? `Static analysis found ${staticVulnerabilities.length} potential security issues: ${staticVulnerabilities.map(v => v.title).join(', ')}`
            : undefined,
        },
        options: {
          includeSecurityAnalysis: true,
          maxTokens: 2000,
        },
      };

      const response = await this.generateExplanation(request);
      
      // Combine static analysis results with AI analysis
      const aiIssues = response.securityIssues || [];
      const combinedIssues = [...staticVulnerabilities.map(this.mapStaticToAISecurityIssue), ...aiIssues];
      
      return combinedIssues;
    } catch (error) {
      this.logger.error(`Security analysis failed for ${filePath}:`, error.message);
      
      // Return static analysis results as fallback
      if (fileAnalysis?.securityVulnerabilities) {
        return fileAnalysis.securityVulnerabilities.map(this.mapStaticToAISecurityIssue);
      }
      
      return [];
    }
  }

  async analyzeCodePerformance(
    code: string,
    filePath: string,
    complexity?: ComplexityMetrics,
    fileAnalysis?: FileAnalysis
  ): Promise<PerformanceIssue[]> {
    try {
      // First, get static analysis results if available
      let staticIssues: any[] = [];
      if (fileAnalysis?.performanceIssues) {
        staticIssues = fileAnalysis.performanceIssues;
      }

      const request: AIExplanationRequest = {
        type: ExplanationType.PERFORMANCE_ANALYSIS,
        context: {
          code,
          filePath,
          complexity,
          fileAnalysis,
          additionalContext: staticIssues.length > 0 
            ? `Static analysis found ${staticIssues.length} performance issues: ${staticIssues.map(i => i.title).join(', ')}`
            : undefined,
        },
        options: {
          includePerformanceAnalysis: true,
          maxTokens: 2000,
        },
      };

      const response = await this.generateExplanation(request);
      
      // Combine static analysis results with AI analysis
      const aiIssues = response.performanceIssues || [];
      const combinedIssues = [...staticIssues.map(this.mapStaticToAIPerformanceIssue), ...aiIssues];
      
      return combinedIssues;
    } catch (error) {
      this.logger.error(`Performance analysis failed for ${filePath}:`, error.message);
      
      // Return static analysis results as fallback
      if (fileAnalysis?.performanceIssues) {
        return fileAnalysis.performanceIssues.map(this.mapStaticToAIPerformanceIssue);
      }
      
      return [];
    }
  }

  async generateCodeSuggestions(
    code: string,
    filePath: string,
    fileAnalysis?: FileAnalysis
  ): Promise<CodeSuggestion[]> {
    try {
      const request: AIExplanationRequest = {
        type: ExplanationType.REFACTORING_SUGGESTIONS,
        context: {
          code,
          filePath,
          fileAnalysis,
        },
        options: {
          includeCodeSuggestions: true,
          maxTokens: 3000,
        },
      };

      const response = await this.generateExplanation(request);
      return response.suggestions || [];
    } catch (error) {
      this.logger.error(`Code suggestions failed for ${filePath}:`, error.message);
      return [];
    }
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    
    // Clean old requests
    for (const [key, timestamps] of this.rateLimiter.entries()) {
      const validTimestamps = timestamps.filter(t => t > windowStart);
      if (validTimestamps.length === 0) {
        this.rateLimiter.delete(key);
      } else {
        this.rateLimiter.set(key, validTimestamps);
      }
    }

    // Check current rate
    const currentRequests = this.rateLimiter.get('global') || [];
    if (currentRequests.length >= this.maxRequestsPerMinute) {
      const oldestRequest = Math.min(...currentRequests);
      const waitTime = oldestRequest + 60000 - now;
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    // Record this request
    currentRequests.push(now);
    this.rateLimiter.set('global', currentRequests);
  }

  private buildPrompt(request: AIExplanationRequest): string {
    const { type, context, options } = request;
    
    let prompt = '';

    // System prompt
    prompt += this.getSystemPrompt(type);
    prompt += '\n\n';

    // Context-specific prompt
    switch (type) {
      case ExplanationType.CODE_EXPLANATION:
        prompt += this.buildCodeExplanationPrompt(context);
        break;
      case ExplanationType.FUNCTION_ANALYSIS:
        prompt += this.buildFunctionAnalysisPrompt(context);
        break;
      case ExplanationType.CLASS_ANALYSIS:
        prompt += this.buildClassAnalysisPrompt(context);
        break;
      case ExplanationType.SERVICE_CALL_ANALYSIS:
        prompt += this.buildServiceCallAnalysisPrompt(context);
        break;
      case ExplanationType.FLOW_ANALYSIS:
        prompt += this.buildFlowAnalysisPrompt(context);
        break;
      case ExplanationType.SECURITY_ANALYSIS:
        prompt += this.buildSecurityAnalysisPrompt(context);
        break;
      case ExplanationType.PERFORMANCE_ANALYSIS:
        prompt += this.buildPerformanceAnalysisPrompt(context);
        break;
      case ExplanationType.CODE_REVIEW:
        prompt += this.buildCodeReviewPrompt(context);
        break;
      case ExplanationType.REFACTORING_SUGGESTIONS:
        prompt += this.buildRefactoringPrompt(context);
        break;
      default:
        prompt += this.buildGenericPrompt(context);
    }

    // Add options-based instructions
    if (options?.includeCodeSuggestions) {
      prompt += '\n\nPlease include specific code improvement suggestions with before/after examples.';
    }
    if (options?.includeSecurityAnalysis) {
      prompt += '\n\nPlease analyze for security vulnerabilities and provide specific recommendations.';
    }
    if (options?.includePerformanceAnalysis) {
      prompt += '\n\nPlease analyze for performance issues and optimization opportunities.';
    }

    return prompt;
  }

  private getSystemPrompt(type: ExplanationType): string {
    const basePrompt = `You are an expert software engineer and code analyst. You provide clear, accurate, and actionable explanations about code structure, functionality, and quality.`;

    switch (type) {
      case ExplanationType.SECURITY_ANALYSIS:
        return `${basePrompt} You specialize in identifying security vulnerabilities, following OWASP guidelines, and providing specific remediation steps.`;
      case ExplanationType.PERFORMANCE_ANALYSIS:
        return `${basePrompt} You specialize in performance optimization, identifying bottlenecks, and suggesting algorithmic improvements.`;
      case ExplanationType.CODE_REVIEW:
        return `${basePrompt} You conduct thorough code reviews focusing on maintainability, readability, and best practices.`;
      default:
        return basePrompt;
    }
  }

  private buildCodeExplanationPrompt(context: ExplanationContext): string {
    let prompt = 'Please explain the following code:\n\n';
    
    if (context.filePath) {
      prompt += `File: ${context.filePath}\n\n`;
    }
    
    if (context.code) {
      prompt += `\`\`\`\n${context.code}\n\`\`\`\n\n`;
    }

    prompt += 'Provide a clear explanation of:\n';
    prompt += '1. What this code does\n';
    prompt += '2. How it works\n';
    prompt += '3. Key components and their relationships\n';
    prompt += '4. Any notable patterns or techniques used\n';

    return prompt;
  }

  private buildFunctionAnalysisPrompt(context: ExplanationContext): string {
    let prompt = 'Please analyze the following function:\n\n';
    
    if (context.functionDeclaration) {
      const func = context.functionDeclaration;
      prompt += `Function: ${func.name}\n`;
      prompt += `Parameters: ${func.parameters.map(p => `${p.name}: ${p.type || 'any'}`).join(', ')}\n`;
      prompt += `Return Type: ${func.returnType || 'unknown'}\n`;
      prompt += `Async: ${func.isAsync ? 'Yes' : 'No'}\n`;
      prompt += `Complexity: ${func.complexity}\n\n`;
    }

    if (context.code) {
      prompt += `\`\`\`\n${context.code}\n\`\`\`\n\n`;
    }

    prompt += 'Provide analysis of:\n';
    prompt += '1. Function purpose and behavior\n';
    prompt += '2. Input/output analysis\n';
    prompt += '3. Complexity assessment\n';
    prompt += '4. Potential improvements\n';

    return prompt;
  }

  private buildClassAnalysisPrompt(context: ExplanationContext): string {
    let prompt = 'Please analyze the following class:\n\n';
    
    if (context.classDeclaration) {
      const cls = context.classDeclaration;
      prompt += `Class: ${cls.name}\n`;
      if (cls.extends) prompt += `Extends: ${cls.extends}\n`;
      if (cls.implements?.length) prompt += `Implements: ${cls.implements.join(', ')}\n`;
      prompt += `Methods: ${cls.methods.length}\n`;
      prompt += `Properties: ${cls.properties.length}\n\n`;
    }

    if (context.code) {
      prompt += `\`\`\`\n${context.code}\n\`\`\`\n\n`;
    }

    prompt += 'Provide analysis of:\n';
    prompt += '1. Class responsibility and design\n';
    prompt += '2. Inheritance and composition patterns\n';
    prompt += '3. Method and property organization\n';
    prompt += '4. Design pattern usage\n';

    return prompt;
  }

  private buildServiceCallAnalysisPrompt(context: ExplanationContext): string {
    let prompt = 'Please analyze the following service call:\n\n';
    
    if (context.serviceCall) {
      const call = context.serviceCall;
      prompt += `Service: ${call.service}\n`;
      prompt += `Type: ${call.type}\n`;
      if (call.method) prompt += `Method: ${call.method}\n`;
      if (call.endpoint) prompt += `Endpoint: ${call.endpoint}\n`;
      if (call.operation) prompt += `Operation: ${call.operation}\n`;
      prompt += `External: ${call.isExternal ? 'Yes' : 'No'}\n\n`;
    }

    if (context.code) {
      prompt += `\`\`\`\n${context.code}\n\`\`\`\n\n`;
    }

    prompt += 'Provide analysis of:\n';
    prompt += '1. Service integration pattern\n';
    prompt += '2. Error handling approach\n';
    prompt += '3. Security considerations\n';
    prompt += '4. Performance implications\n';

    return prompt;
  }

  private buildFlowAnalysisPrompt(context: ExplanationContext): string {
    let prompt = 'Please analyze the following end-to-end flow:\n\n';
    
    if (context.endToEndFlow) {
      const flow = context.endToEndFlow;
      prompt += `Flow: ${flow.name}\n`;
      prompt += `Type: ${flow.type}\n`;
      prompt += `Steps: ${flow.steps.length}\n`;
      prompt += `Max Depth: ${flow.metadata.maxDepth}\n`;
      prompt += `Has External Calls: ${flow.metadata.hasExternalCalls ? 'Yes' : 'No'}\n`;
      prompt += `Has Database Operations: ${flow.metadata.hasDatabaseOperations ? 'Yes' : 'No'}\n\n`;
      
      prompt += 'Flow Steps:\n';
      flow.steps.forEach((step, index) => {
        prompt += `${index + 1}. ${step.name} (${step.type})\n`;
      });
      prompt += '\n';
    }

    prompt += 'Provide analysis of:\n';
    prompt += '1. Flow architecture and design\n';
    prompt += '2. Data flow and transformations\n';
    prompt += '3. Potential bottlenecks\n';
    prompt += '4. Error handling and resilience\n';

    return prompt;
  }

  private buildSecurityAnalysisPrompt(context: ExplanationContext): string {
    let prompt = 'Please perform a security analysis of the following code:\n\n';
    
    if (context.filePath) {
      prompt += `File: ${context.filePath}\n\n`;
    }
    
    if (context.code) {
      prompt += `\`\`\`\n${context.code}\n\`\`\`\n\n`;
    }

    prompt += 'Focus on identifying:\n';
    prompt += '1. Input validation issues\n';
    prompt += '2. Authentication and authorization flaws\n';
    prompt += '3. Data exposure risks\n';
    prompt += '4. Injection vulnerabilities\n';
    prompt += '5. Cryptographic issues\n';
    prompt += '6. Configuration security\n\n';
    
    prompt += 'For each issue found, provide:\n';
    prompt += '- Severity level (low/medium/high/critical)\n';
    prompt += '- Specific location if applicable\n';
    prompt += '- Detailed explanation\n';
    prompt += '- Remediation steps\n';
    prompt += '- CWE reference if applicable\n';

    return prompt;
  }

  private buildPerformanceAnalysisPrompt(context: ExplanationContext): string {
    let prompt = 'Please perform a performance analysis of the following code:\n\n';
    
    if (context.filePath) {
      prompt += `File: ${context.filePath}\n\n`;
    }
    
    if (context.complexity) {
      prompt += `Complexity Metrics:\n`;
      prompt += `- Cyclomatic: ${context.complexity.cyclomatic}\n`;
      prompt += `- Cognitive: ${context.complexity.cognitive}\n`;
      prompt += `- Maintainability: ${context.complexity.maintainability}\n`;
      prompt += `- Technical Debt: ${context.complexity.technicalDebt}\n\n`;
    }
    
    if (context.code) {
      prompt += `\`\`\`\n${context.code}\n\`\`\`\n\n`;
    }

    prompt += 'Focus on identifying:\n';
    prompt += '1. Algorithmic inefficiencies\n';
    prompt += '2. Memory usage issues\n';
    prompt += '3. I/O bottlenecks\n';
    prompt += '4. CPU-intensive operations\n';
    prompt += '5. Unnecessary computations\n';
    prompt += '6. Caching opportunities\n\n';
    
    prompt += 'For each issue found, provide:\n';
    prompt += '- Performance impact level\n';
    prompt += '- Specific location\n';
    prompt += '- Explanation of the issue\n';
    prompt += '- Optimization recommendations\n';
    prompt += '- Estimated improvement\n';

    return prompt;
  }

  private buildCodeReviewPrompt(context: ExplanationContext): string {
    let prompt = 'Please conduct a comprehensive code review:\n\n';
    
    if (context.filePath) {
      prompt += `File: ${context.filePath}\n\n`;
    }
    
    if (context.code) {
      prompt += `\`\`\`\n${context.code}\n\`\`\`\n\n`;
    }

    prompt += 'Review for:\n';
    prompt += '1. Code quality and maintainability\n';
    prompt += '2. Best practices adherence\n';
    prompt += '3. Error handling\n';
    prompt += '4. Testing considerations\n';
    prompt += '5. Documentation quality\n';
    prompt += '6. Performance considerations\n';
    prompt += '7. Security aspects\n';

    return prompt;
  }

  private buildRefactoringPrompt(context: ExplanationContext): string {
    let prompt = 'Please suggest refactoring improvements for the following code:\n\n';
    
    if (context.filePath) {
      prompt += `File: ${context.filePath}\n\n`;
    }
    
    if (context.code) {
      prompt += `\`\`\`\n${context.code}\n\`\`\`\n\n`;
    }

    prompt += 'Provide specific suggestions for:\n';
    prompt += '1. Code structure improvements\n';
    prompt += '2. Design pattern applications\n';
    prompt += '3. Function/method extraction\n';
    prompt += '4. Variable and naming improvements\n';
    prompt += '5. Complexity reduction\n';
    prompt += '6. Duplication elimination\n\n';
    
    prompt += 'For each suggestion, provide:\n';
    prompt += '- Before and after code examples\n';
    prompt += '- Explanation of benefits\n';
    prompt += '- Implementation effort estimate\n';
    prompt += '- Impact assessment\n';

    return prompt;
  }

  private buildGenericPrompt(context: ExplanationContext): string {
    let prompt = 'Please analyze the following code:\n\n';
    
    if (context.filePath) {
      prompt += `File: ${context.filePath}\n\n`;
    }
    
    if (context.code) {
      prompt += `\`\`\`\n${context.code}\n\`\`\`\n\n`;
    }

    if (context.additionalContext) {
      prompt += `Additional Context: ${context.additionalContext}\n\n`;
    }

    prompt += 'Provide a comprehensive analysis covering relevant aspects of the code.';

    return prompt;
  }

  private async callOpenAIWithRetry(
    prompt: string,
    options?: ExplanationOptions,
    retryCount = 0
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: options?.maxTokens || 2000,
        temperature: options?.temperature || 0.3,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      return completion;
    } catch (error) {
      if (retryCount < maxRetries && this.isRetryableError(error)) {
        const delay = baseDelay * Math.pow(2, retryCount);
        this.logger.warn(`OpenAI API call failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.callOpenAIWithRetry(prompt, options, retryCount + 1);
      }

      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    // Retry on rate limits, temporary server errors, and network issues
    if (error.status) {
      return error.status === 429 || error.status >= 500;
    }
    
    // Retry on network errors
    return error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' || 
           error.code === 'ENOTFOUND';
  }

  private parseAIResponse(
    completion: OpenAI.Chat.Completions.ChatCompletion,
    type: ExplanationType
  ): Omit<AIExplanationResponse, 'processingTime' | 'tokensUsed'> {
    const content = completion.choices[0]?.message?.content || '';
    
    // Basic response structure
    const response: Omit<AIExplanationResponse, 'processingTime' | 'tokensUsed'> = {
      explanation: content,
      confidence: this.calculateConfidence(completion),
    };

    // Parse structured responses for specific types
    try {
      if (type === ExplanationType.SECURITY_ANALYSIS) {
        response.securityIssues = this.parseSecurityIssues(content);
      } else if (type === ExplanationType.PERFORMANCE_ANALYSIS) {
        response.performanceIssues = this.parsePerformanceIssues(content);
      } else if (type === ExplanationType.REFACTORING_SUGGESTIONS) {
        response.suggestions = this.parseCodeSuggestions(content);
      }
    } catch (error) {
      this.logger.warn('Failed to parse structured AI response:', error.message);
    }

    return response;
  }

  private calculateConfidence(completion: OpenAI.Chat.Completions.ChatCompletion): number {
    // Simple confidence calculation based on response characteristics
    const choice = completion.choices[0];
    if (!choice) return 0.5;

    let confidence = 0.8; // Base confidence

    // Adjust based on finish reason
    if (choice.finish_reason === 'stop') {
      confidence += 0.1;
    } else if (choice.finish_reason === 'length') {
      confidence -= 0.2;
    }

    // Adjust based on content length (very short responses are less confident)
    const contentLength = choice.message?.content?.length || 0;
    if (contentLength < 100) {
      confidence -= 0.2;
    } else if (contentLength > 1000) {
      confidence += 0.1;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private parseSecurityIssues(content: string): SecurityIssue[] {
    // Simple parsing - in production, this would be more sophisticated
    const issues: SecurityIssue[] = [];
    
    // Look for common security issue patterns in the response
    const lines = content.split('\n');
    let currentIssue: Partial<SecurityIssue> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for severity indicators
      if (trimmed.match(/\b(critical|high|medium|low)\b/i)) {
        if (currentIssue) {
          issues.push(currentIssue as SecurityIssue);
        }
        
        const severity = trimmed.match(/\b(critical|high|medium|low)\b/i)?.[1].toLowerCase() as SecurityIssue['severity'];
        currentIssue = {
          type: 'vulnerability',
          severity: severity || 'medium',
          title: trimmed,
          description: '',
          recommendation: '',
        };
      } else if (currentIssue && trimmed) {
        if (!currentIssue.description) {
          currentIssue.description = trimmed;
        } else if (trimmed.toLowerCase().includes('recommend')) {
          currentIssue.recommendation = trimmed;
        }
      }
    }

    if (currentIssue) {
      issues.push(currentIssue as SecurityIssue);
    }

    return issues;
  }

  private parsePerformanceIssues(content: string): PerformanceIssue[] {
    // Simple parsing - in production, this would be more sophisticated
    const issues: PerformanceIssue[] = [];
    
    const lines = content.split('\n');
    let currentIssue: Partial<PerformanceIssue> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.match(/\b(bottleneck|performance|slow|inefficient)\b/i)) {
        if (currentIssue) {
          issues.push(currentIssue as PerformanceIssue);
        }
        
        currentIssue = {
          type: 'bottleneck',
          severity: 'medium',
          title: trimmed,
          description: '',
          recommendation: '',
        };
      } else if (currentIssue && trimmed) {
        if (!currentIssue.description) {
          currentIssue.description = trimmed;
        } else if (trimmed.toLowerCase().includes('recommend') || trimmed.toLowerCase().includes('optimize')) {
          currentIssue.recommendation = trimmed;
        }
      }
    }

    if (currentIssue) {
      issues.push(currentIssue as PerformanceIssue);
    }

    return issues;
  }

  private parseCodeSuggestions(content: string): CodeSuggestion[] {
    // Simple parsing - in production, this would be more sophisticated
    const suggestions: CodeSuggestion[] = [];
    
    const lines = content.split('\n');
    let currentSuggestion: Partial<CodeSuggestion> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.match(/\b(refactor|optimize|improve|suggest)\b/i)) {
        if (currentSuggestion) {
          suggestions.push(currentSuggestion as CodeSuggestion);
        }
        
        currentSuggestion = {
          type: 'refactor',
          title: trimmed,
          description: '',
          impact: 'medium',
          effort: 'medium',
        };
      } else if (currentSuggestion && trimmed) {
        if (!currentSuggestion.description) {
          currentSuggestion.description = trimmed;
        }
      }
    }

    if (currentSuggestion) {
      suggestions.push(currentSuggestion as CodeSuggestion);
    }

    return suggestions;
  }

  private getFallbackResponse(
    type: ExplanationType,
    errorMessage: string,
    processingTime: number
  ): AIExplanationResponse {
    return {
      explanation: `AI analysis is currently unavailable: ${errorMessage}. Please try again later or contact support if the issue persists.`,
      confidence: 0,
      tokensUsed: 0,
      processingTime,
    };
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  async getServiceHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    configured: boolean;
    rateLimitStatus: {
      requestsInLastMinute: number;
      maxRequestsPerMinute: number;
    };
    cacheStats?: any;
  }> {
    const now = Date.now();
    const windowStart = now - 60000;
    const currentRequests = (this.rateLimiter.get('global') || [])
      .filter(t => t > windowStart);

    return {
      status: this.openai ? 'healthy' : 'unhealthy',
      configured: !!this.openai,
      rateLimitStatus: {
        requestsInLastMinute: currentRequests.length,
        maxRequestsPerMinute: this.maxRequestsPerMinute,
      },
      cacheStats: this.cacheService.getStats(),
    };
  }

  async invalidateCache(filePath?: string): Promise<number> {
    if (filePath) {
      return await this.cacheService.invalidateByFileChange(filePath);
    } else {
      await this.cacheService.clear();
      return 0;
    }
  }

  async getCacheStats(): Promise<any> {
    return this.cacheService.getStats();
  }

  private mapStaticToAISecurityIssue = (staticVuln: any): SecurityIssue => {
    return {
      type: this.mapSecurityVulnType(staticVuln.type),
      severity: this.mapSecuritySeverity(staticVuln.severity),
      title: staticVuln.title,
      description: staticVuln.description,
      location: staticVuln.location ? {
        line: staticVuln.location.start.line,
        column: staticVuln.location.start.column,
      } : undefined,
      recommendation: staticVuln.recommendation,
      cweId: staticVuln.cweId,
    };
  };

  private mapStaticToAIPerformanceIssue = (staticIssue: any): PerformanceIssue => {
    return {
      type: this.mapPerformanceIssueType(staticIssue.type),
      severity: this.mapPerformanceSeverity(staticIssue.severity),
      title: staticIssue.title,
      description: staticIssue.description,
      location: staticIssue.location ? {
        line: staticIssue.location.start.line,
        column: staticIssue.location.start.column,
      } : undefined,
      recommendation: staticIssue.recommendation,
      estimatedImpact: staticIssue.estimatedImpact,
    };
  };

  private mapSecurityVulnType(staticType: string): SecurityIssue['type'] {
    switch (staticType) {
      case 'sql_injection':
        return 'vulnerability';
      case 'xss':
        return 'vulnerability';
      case 'command_injection':
        return 'vulnerability';
      case 'hardcoded_secrets':
        return 'configuration';
      case 'insecure_crypto':
        return 'best_practice';
      default:
        return 'vulnerability';
    }
  }

  private mapSecuritySeverity(staticSeverity: string): SecurityIssue['severity'] {
    switch (staticSeverity.toLowerCase()) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'medium';
    }
  }

  private mapPerformanceIssueType(staticType: string): PerformanceIssue['type'] {
    switch (staticType) {
      case 'algorithmic_complexity':
        return 'algorithm';
      case 'memory_leak':
        return 'memory';
      case 'blocking_operation':
        return 'cpu';
      case 'frequent_dom_access':
        return 'io';
      case 'database_n_plus_one':
        return 'io';
      default:
        return 'bottleneck';
    }
  }

  private mapPerformanceSeverity(staticSeverity: string): PerformanceIssue['severity'] {
    switch (staticSeverity.toLowerCase()) {
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'medium';
    }
  }
}