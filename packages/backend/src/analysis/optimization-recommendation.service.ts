import { Injectable, Logger } from '@nestjs/common';
import { ComplexityAnalyzer } from './analyzers/complexity.analyzer';
import { PerformanceAnalyzer } from './analyzers/performance.analyzer';
import { SecurityAnalyzer } from './analyzers/security.analyzer';
import { TypeScriptAnalyzer } from './analyzers/typescript.analyzer';
import { JavaScriptAnalyzer } from './analyzers/javascript.analyzer';
import { FileAnalysis, SupportedLanguage, ComplexityMetrics } from '@codemapr/shared';
import * as fs from 'fs';
import * as path from 'path';

export interface OptimizationRecommendation {
  id: string;
  type: OptimizationType;
  priority: OptimizationPriority;
  title: string;
  description: string;
  category: OptimizationCategory;
  affectedFiles: string[];
  codeExamples: CodeExample[];
  actionItems: string[];
  estimatedImpact: ImpactLevel;
  difficulty: DifficultyLevel;
  tags: string[];
  metadata: Record<string, any>;
}

export interface CodeExample {
  title: string;
  before: string;
  after: string;
  explanation: string;
}

export interface OptimizationAnalysisResult {
  projectPath: string;
  totalFiles: number;
  analyzedFiles: number;
  recommendations: OptimizationRecommendation[];
  summary: OptimizationSummary;
  analysisTime: number;
}

export interface OptimizationSummary {
  totalRecommendations: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  categoryCounts: Record<OptimizationCategory, number>;
  estimatedTotalImpact: ImpactLevel;
}

export enum OptimizationType {
  PERFORMANCE = 'performance',
  CODE_QUALITY = 'code_quality',
  MAINTAINABILITY = 'maintainability',
  SECURITY = 'security',
  BEST_PRACTICES = 'best_practices',
  REFACTORING = 'refactoring',
  ARCHITECTURE = 'architecture',
}

export enum OptimizationPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum OptimizationCategory {
  PERFORMANCE = 'Performance',
  CODE_STRUCTURE = 'Code Structure',
  ERROR_HANDLING = 'Error Handling',
  ASYNC_PATTERNS = 'Async Patterns',
  MEMORY_MANAGEMENT = 'Memory Management',
  ALGORITHM_OPTIMIZATION = 'Algorithm Optimization',
  DESIGN_PATTERNS = 'Design Patterns',
  TESTING = 'Testing',
  DOCUMENTATION = 'Documentation',
  SECURITY = 'Security',
  BEST_PRACTICES = 'Best Practices',
}

export enum ImpactLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

@Injectable()
export class OptimizationRecommendationService {
  private readonly logger = new Logger(OptimizationRecommendationService.name);

  constructor(
    private readonly complexityAnalyzer: ComplexityAnalyzer,
    private readonly performanceAnalyzer: PerformanceAnalyzer,
    private readonly securityAnalyzer: SecurityAnalyzer,
    private readonly typeScriptAnalyzer: TypeScriptAnalyzer,
    private readonly javaScriptAnalyzer: JavaScriptAnalyzer,
  ) {}

  async analyzeProject(projectPath: string): Promise<OptimizationAnalysisResult> {
    const startTime = Date.now();
    this.logger.log(`Starting optimization analysis for project: ${projectPath}`);

    try {
      // Get all TypeScript and JavaScript files
      const files = await this.getProjectFiles(projectPath);
      const recommendations: OptimizationRecommendation[] = [];
      let analyzedFiles = 0;

      // Analyze each file
      for (const filePath of files) {
        try {
          const fileRecommendations = await this.analyzeFile(filePath);
          recommendations.push(...fileRecommendations);
          analyzedFiles++;
        } catch (error) {
          this.logger.warn(`Failed to analyze file ${filePath}: ${error.message}`);
        }
      }

      // Generate project-level recommendations
      const projectRecommendations = await this.generateProjectLevelRecommendations(files, recommendations);
      recommendations.push(...projectRecommendations);

      // Create summary
      const summary = this.createOptimizationSummary(recommendations);
      const analysisTime = Date.now() - startTime;

      const result: OptimizationAnalysisResult = {
        projectPath,
        totalFiles: files.length,
        analyzedFiles,
        recommendations: this.prioritizeRecommendations(recommendations),
        summary,
        analysisTime,
      };

      this.logger.log(`Optimization analysis completed in ${analysisTime}ms. Generated ${recommendations.length} recommendations.`);
      return result;

    } catch (error) {
      this.logger.error(`Optimization analysis failed for project ${projectPath}:`, error);
      throw error;
    }
  }

  async analyzeFile(filePath: string): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    try {
      // Read file content
      const content = fs.readFileSync(filePath, 'utf-8');
      const language = this.detectLanguage(filePath);
      
      if (!language) {
        return recommendations;
      }

      // Analyze the file
      let fileAnalysis: FileAnalysis;
      
      if (language === SupportedLanguage.TYPESCRIPT || language === SupportedLanguage.TSX) {
        fileAnalysis = await this.typeScriptAnalyzer.analyzeFile(filePath, content);
      } else if (language === SupportedLanguage.JAVASCRIPT || language === SupportedLanguage.JSX) {
        fileAnalysis = await this.javaScriptAnalyzer.analyzeFile(filePath, content);
      } else {
        return recommendations;
      }

      // Generate different types of recommendations
      recommendations.push(...await this.generateComplexityRecommendations(fileAnalysis));
      recommendations.push(...await this.generatePerformanceRecommendations(fileAnalysis, content));
      recommendations.push(...await this.generateCodeQualityRecommendations(fileAnalysis, content));
      recommendations.push(...await this.generateBestPracticeRecommendations(fileAnalysis, content));
      recommendations.push(...await this.generateRefactoringRecommendations(fileAnalysis, content));

      return recommendations;

    } catch (error) {
      this.logger.warn(`Failed to analyze file ${filePath}:`, error);
      return recommendations;
    }
  }

  private async generateComplexityRecommendations(fileAnalysis: FileAnalysis): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];
    const { complexity } = fileAnalysis;

    // High cyclomatic complexity
    if (complexity.cyclomatic > 15) {
      recommendations.push({
        id: `complexity-high-${fileAnalysis.filePath}`,
        type: OptimizationType.REFACTORING,
        priority: OptimizationPriority.HIGH,
        title: 'Reduce Cyclomatic Complexity',
        description: `File has high cyclomatic complexity (${complexity.cyclomatic}). Consider breaking down complex functions into smaller, more manageable pieces.`,
        category: OptimizationCategory.CODE_STRUCTURE,
        affectedFiles: [fileAnalysis.filePath],
        codeExamples: [{
          title: 'Extract Complex Logic',
          before: `function processData(data) {
  if (data.type === 'A') {
    if (data.status === 'active') {
      // 20+ lines of logic
    } else if (data.status === 'inactive') {
      // 15+ lines of logic
    }
  } else if (data.type === 'B') {
    // More complex logic
  }
}`,
          after: `function processData(data) {
  if (data.type === 'A') {
    return processTypeA(data);
  } else if (data.type === 'B') {
    return processTypeB(data);
  }
}

function processTypeA(data) {
  return data.status === 'active' 
    ? handleActiveData(data)
    : handleInactiveData(data);
}`,
          explanation: 'Break complex functions into smaller, focused functions with single responsibilities.'
        }],
        actionItems: [
          'Identify functions with complexity > 10',
          'Extract logical blocks into separate functions',
          'Use early returns to reduce nesting',
          'Consider using strategy pattern for complex conditionals',
        ],
        estimatedImpact: ImpactLevel.HIGH,
        difficulty: DifficultyLevel.MEDIUM,
        tags: ['complexity', 'refactoring', 'maintainability'],
        metadata: { currentComplexity: complexity.cyclomatic, targetComplexity: 10 },
      });
    }

    // Low maintainability
    if (complexity.maintainability < 60) {
      recommendations.push({
        id: `maintainability-low-${fileAnalysis.filePath}`,
        type: OptimizationType.MAINTAINABILITY,
        priority: OptimizationPriority.MEDIUM,
        title: 'Improve Code Maintainability',
        description: `File has low maintainability score (${complexity.maintainability.toFixed(1)}). Consider refactoring to improve readability and maintainability.`,
        category: OptimizationCategory.CODE_STRUCTURE,
        affectedFiles: [fileAnalysis.filePath],
        codeExamples: [{
          title: 'Add Clear Variable Names and Comments',
          before: `const d = new Date();
const x = d.getTime() - u.lastLogin;
if (x > 86400000) { /* magic number */ }`,
          after: `const currentDate = new Date();
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const timeSinceLastLogin = currentDate.getTime() - user.lastLoginTime;

if (timeSinceLastLogin > MILLISECONDS_PER_DAY) {
  // User hasn't logged in for more than a day
}`,
          explanation: 'Use descriptive variable names and extract magic numbers into named constants.'
        }],
        actionItems: [
          'Use descriptive variable and function names',
          'Extract magic numbers into named constants',
          'Add meaningful comments for complex logic',
          'Remove dead code and unused variables',
        ],
        estimatedImpact: ImpactLevel.MEDIUM,
        difficulty: DifficultyLevel.EASY,
        tags: ['maintainability', 'readability', 'code-quality'],
        metadata: { currentMaintainability: complexity.maintainability, targetMaintainability: 80 },
      });
    }

    return recommendations;
  }

  private async generatePerformanceRecommendations(fileAnalysis: FileAnalysis, content: string): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Check for performance anti-patterns
    if (content.includes('for (') && content.includes('.push(')) {
      recommendations.push({
        id: `perf-array-push-${fileAnalysis.filePath}`,
        type: OptimizationType.PERFORMANCE,
        priority: OptimizationPriority.MEDIUM,
        title: 'Optimize Array Operations',
        description: 'Detected potential inefficient array operations. Consider using more efficient alternatives.',
        category: OptimizationCategory.PERFORMANCE,
        affectedFiles: [fileAnalysis.filePath],
        codeExamples: [{
          title: 'Use Array Methods Instead of Loops',
          before: `const results = [];
for (let i = 0; i < items.length; i++) {
  if (items[i].active) {
    results.push(transform(items[i]));
  }
}`,
          after: `const results = items
  .filter(item => item.active)
  .map(item => transform(item));`,
          explanation: 'Array methods like filter() and map() are often more readable and can be optimized by the JavaScript engine.'
        }],
        actionItems: [
          'Replace manual loops with array methods where appropriate',
          'Use filter(), map(), reduce() for data transformations',
          'Consider using Set for unique value operations',
          'Pre-allocate arrays when size is known',
        ],
        estimatedImpact: ImpactLevel.MEDIUM,
        difficulty: DifficultyLevel.EASY,
        tags: ['performance', 'arrays', 'optimization'],
        metadata: { pattern: 'array_operations' },
      });
    }

    // Check for synchronous operations that could be async
    if (content.includes('fs.readFileSync') || content.includes('fs.writeFileSync')) {
      recommendations.push({
        id: `perf-sync-fs-${fileAnalysis.filePath}`,
        type: OptimizationType.PERFORMANCE,
        priority: OptimizationPriority.HIGH,
        title: 'Use Asynchronous File Operations',
        description: 'Detected synchronous file system operations that can block the event loop.',
        category: OptimizationCategory.ASYNC_PATTERNS,
        affectedFiles: [fileAnalysis.filePath],
        codeExamples: [{
          title: 'Replace Sync with Async Operations',
          before: `const data = fs.readFileSync('file.txt', 'utf8');
processData(data);`,
          after: `const data = await fs.promises.readFile('file.txt', 'utf8');
processData(data);

// Or with callback
fs.readFile('file.txt', 'utf8', (err, data) => {
  if (err) throw err;
  processData(data);
});`,
          explanation: 'Async operations prevent blocking the event loop and improve application responsiveness.'
        }],
        actionItems: [
          'Replace fs.readFileSync with fs.promises.readFile or fs.readFile',
          'Replace fs.writeFileSync with fs.promises.writeFile or fs.writeFile',
          'Use async/await or promises for better error handling',
          'Consider using streams for large files',
        ],
        estimatedImpact: ImpactLevel.HIGH,
        difficulty: DifficultyLevel.EASY,
        tags: ['performance', 'async', 'file-system'],
        metadata: { pattern: 'sync_fs_operations' },
      });
    }

    return recommendations;
  }

  private async generateCodeQualityRecommendations(fileAnalysis: FileAnalysis, content: string): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Check for missing error handling
    if (content.includes('await ') && !content.includes('try') && !content.includes('catch')) {
      recommendations.push({
        id: `quality-error-handling-${fileAnalysis.filePath}`,
        type: OptimizationType.CODE_QUALITY,
        priority: OptimizationPriority.HIGH,
        title: 'Add Error Handling for Async Operations',
        description: 'Detected async operations without proper error handling.',
        category: OptimizationCategory.ERROR_HANDLING,
        affectedFiles: [fileAnalysis.filePath],
        codeExamples: [{
          title: 'Add Try-Catch for Async Operations',
          before: `async function fetchData() {
  const response = await fetch('/api/data');
  const data = await response.json();
  return data;
}`,
          after: `async function fetchData() {
  try {
    const response = await fetch('/api/data');
    
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw error; // Re-throw or handle appropriately
  }
}`,
          explanation: 'Always handle potential errors in async operations to prevent unhandled promise rejections.'
        }],
        actionItems: [
          'Wrap async operations in try-catch blocks',
          'Check response status for HTTP requests',
          'Provide meaningful error messages',
          'Consider using error boundaries in React applications',
        ],
        estimatedImpact: ImpactLevel.HIGH,
        difficulty: DifficultyLevel.EASY,
        tags: ['error-handling', 'async', 'reliability'],
        metadata: { pattern: 'missing_error_handling' },
      });
    }

    // Check for console.log statements (should use proper logging)
    if (content.includes('console.log') || content.includes('console.error')) {
      recommendations.push({
        id: `quality-logging-${fileAnalysis.filePath}`,
        type: OptimizationType.BEST_PRACTICES,
        priority: OptimizationPriority.LOW,
        title: 'Use Proper Logging Instead of Console',
        description: 'Replace console statements with proper logging for production applications.',
        category: OptimizationCategory.BEST_PRACTICES,
        affectedFiles: [fileAnalysis.filePath],
        codeExamples: [{
          title: 'Use Structured Logging',
          before: `console.log('User logged in:', userId);
console.error('Database error:', error);`,
          after: `import { Logger } from '@nestjs/common';

const logger = new Logger('UserService');

logger.log(\`User logged in: \${userId}\`);
logger.error('Database error:', error.stack);`,
          explanation: 'Proper logging provides better control over log levels, formatting, and output destinations.'
        }],
        actionItems: [
          'Replace console.log with proper logging library',
          'Use appropriate log levels (debug, info, warn, error)',
          'Include contextual information in log messages',
          'Configure log rotation and retention policies',
        ],
        estimatedImpact: ImpactLevel.LOW,
        difficulty: DifficultyLevel.EASY,
        tags: ['logging', 'best-practices', 'maintainability'],
        metadata: { pattern: 'console_logging' },
      });
    }

    return recommendations;
  }

  private async generateBestPracticeRecommendations(fileAnalysis: FileAnalysis, content: string): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Check for missing TypeScript types
    if (fileAnalysis.language === SupportedLanguage.TYPESCRIPT && content.includes(': any')) {
      recommendations.push({
        id: `bp-typescript-types-${fileAnalysis.filePath}`,
        type: OptimizationType.BEST_PRACTICES,
        priority: OptimizationPriority.MEDIUM,
        title: 'Replace "any" Types with Specific Types',
        description: 'Using "any" type defeats the purpose of TypeScript. Define specific types for better type safety.',
        category: OptimizationCategory.CODE_STRUCTURE,
        affectedFiles: [fileAnalysis.filePath],
        codeExamples: [{
          title: 'Define Specific Types',
          before: `function processUser(user: any): any {
  return {
    id: user.id,
    name: user.name,
    email: user.email
  };
}`,
          after: `interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

interface ProcessedUser {
  id: string;
  name: string;
  email: string;
}

function processUser(user: User): ProcessedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email
  };
}`,
          explanation: 'Specific types provide better IDE support, catch errors at compile time, and improve code documentation.'
        }],
        actionItems: [
          'Define interfaces for complex objects',
          'Use union types for limited value sets',
          'Leverage TypeScript utility types (Partial, Pick, Omit)',
          'Enable strict TypeScript compiler options',
        ],
        estimatedImpact: ImpactLevel.MEDIUM,
        difficulty: DifficultyLevel.MEDIUM,
        tags: ['typescript', 'type-safety', 'best-practices'],
        metadata: { pattern: 'any_types' },
      });
    }

    return recommendations;
  }

  private async generateRefactoringRecommendations(fileAnalysis: FileAnalysis, content: string): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Check for large functions (more than 50 lines)
    const lines = content.split('\n');
    if (lines.length > 100) {
      recommendations.push({
        id: `refactor-large-file-${fileAnalysis.filePath}`,
        type: OptimizationType.REFACTORING,
        priority: OptimizationPriority.MEDIUM,
        title: 'Consider Breaking Down Large File',
        description: `File is quite large (${lines.length} lines). Consider splitting into smaller, more focused modules.`,
        category: OptimizationCategory.CODE_STRUCTURE,
        affectedFiles: [fileAnalysis.filePath],
        codeExamples: [{
          title: 'Split Large Files into Modules',
          before: `// user-service.ts (200+ lines)
class UserService {
  // User CRUD operations
  // Email sending logic
  // Password validation
  // Profile image handling
  // Notification preferences
}`,
          after: `// user-service.ts
class UserService {
  constructor(
    private emailService: EmailService,
    private passwordValidator: PasswordValidator,
    private imageHandler: ImageHandler
  ) {}
}

// email.service.ts
class EmailService { /* email logic */ }

// password-validator.ts  
class PasswordValidator { /* validation logic */ }`,
          explanation: 'Smaller, focused modules are easier to test, maintain, and understand.'
        }],
        actionItems: [
          'Identify distinct responsibilities within the file',
          'Extract related functions into separate modules',
          'Use dependency injection for loose coupling',
          'Follow single responsibility principle',
        ],
        estimatedImpact: ImpactLevel.MEDIUM,
        difficulty: DifficultyLevel.HARD,
        tags: ['refactoring', 'modularity', 'architecture'],
        metadata: { currentLines: lines.length, recommendedMaxLines: 100 },
      });
    }

    return recommendations;
  }

  private async generateProjectLevelRecommendations(files: string[], recommendations: OptimizationRecommendation[]): Promise<OptimizationRecommendation[]> {
    const projectRecommendations: OptimizationRecommendation[] = [];

    // Check if project needs testing infrastructure
    const hasTestFiles = files.some(file => file.includes('.test.') || file.includes('.spec.'));
    const testCoverage = hasTestFiles ? files.filter(f => f.includes('.test.') || f.includes('.spec.')).length / files.length : 0;

    if (testCoverage < 0.3) {
      projectRecommendations.push({
        id: 'project-testing-infrastructure',
        type: OptimizationType.BEST_PRACTICES,
        priority: OptimizationPriority.HIGH,
        title: 'Improve Test Coverage',
        description: `Project has low test coverage (${(testCoverage * 100).toFixed(1)}%). Consider adding comprehensive tests.`,
        category: OptimizationCategory.TESTING,
        affectedFiles: files,
        codeExamples: [{
          title: 'Add Unit Tests',
          before: `// No tests for user service`,
          after: `// user.service.spec.ts
describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
  });

  it('should create user with valid data', () => {
    const userData = { name: 'John', email: 'john@example.com' };
    const user = service.createUser(userData);
    expect(user.id).toBeDefined();
    expect(user.name).toBe('John');
  });
});`,
          explanation: 'Tests ensure code reliability and make refactoring safer.'
        }],
        actionItems: [
          'Set up testing framework (Jest, Vitest, etc.)',
          'Write unit tests for core business logic',
          'Add integration tests for API endpoints',
          'Set up test coverage reporting',
          'Aim for at least 80% test coverage',
        ],
        estimatedImpact: ImpactLevel.HIGH,
        difficulty: DifficultyLevel.MEDIUM,
        tags: ['testing', 'quality-assurance', 'reliability'],
        metadata: { currentCoverage: testCoverage, targetCoverage: 0.8 },
      });
    }

    return projectRecommendations;
  }

  private async getProjectFiles(projectPath: string): Promise<string[]> {
    const files: string[] = [];
    const supportedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
    const excludePatterns = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];

    const walkDir = (dir: string) => {
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            if (!excludePatterns.some(pattern => item.includes(pattern))) {
              walkDir(fullPath);
            }
          } else if (stat.isFile()) {
            if (supportedExtensions.some(ext => item.endsWith(ext))) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to read directory ${dir}:`, error.message);
      }
    };

    walkDir(projectPath);
    return files;
  }

  private detectLanguage(filePath: string): SupportedLanguage | null {
    const ext = path.extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.ts':
        return SupportedLanguage.TYPESCRIPT;
      case '.tsx':
        return SupportedLanguage.TSX;
      case '.js':
      case '.mjs':
      case '.cjs':
        return SupportedLanguage.JAVASCRIPT;
      case '.jsx':
        return SupportedLanguage.JSX;
      default:
        return null;
    }
  }

  private createOptimizationSummary(recommendations: OptimizationRecommendation[]): OptimizationSummary {
    const categoryCounts = {} as Record<OptimizationCategory, number>;
    
    // Initialize category counts
    Object.values(OptimizationCategory).forEach(category => {
      categoryCounts[category] = 0;
    });

    // Count recommendations by category and priority
    let highPriorityCount = 0;
    let mediumPriorityCount = 0;
    let lowPriorityCount = 0;

    recommendations.forEach(rec => {
      categoryCounts[rec.category]++;
      
      switch (rec.priority) {
        case OptimizationPriority.HIGH:
          highPriorityCount++;
          break;
        case OptimizationPriority.MEDIUM:
          mediumPriorityCount++;
          break;
        case OptimizationPriority.LOW:
          lowPriorityCount++;
          break;
      }
    });

    // Estimate overall impact
    let estimatedTotalImpact = ImpactLevel.LOW;
    if (highPriorityCount > 5 || recommendations.some(r => r.estimatedImpact === ImpactLevel.HIGH)) {
      estimatedTotalImpact = ImpactLevel.HIGH;
    } else if (mediumPriorityCount > 3 || recommendations.some(r => r.estimatedImpact === ImpactLevel.MEDIUM)) {
      estimatedTotalImpact = ImpactLevel.MEDIUM;
    }

    return {
      totalRecommendations: recommendations.length,
      highPriorityCount,
      mediumPriorityCount,
      lowPriorityCount,
      categoryCounts,
      estimatedTotalImpact,
    };
  }

  private prioritizeRecommendations(recommendations: OptimizationRecommendation[]): OptimizationRecommendation[] {
    return recommendations.sort((a, b) => {
      // Sort by priority first
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by impact
      const impactOrder = { high: 3, medium: 2, low: 1 };
      const impactDiff = impactOrder[b.estimatedImpact] - impactOrder[a.estimatedImpact];
      if (impactDiff !== 0) return impactDiff;

      // Finally by difficulty (easier first)
      const difficultyOrder = { easy: 3, medium: 2, hard: 1 };
      return difficultyOrder[b.difficulty] - difficultyOrder[a.difficulty];
    });
  }
}