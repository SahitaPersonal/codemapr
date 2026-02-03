import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ProjectAnalysis,
  FileAnalysis,
  SupportedLanguage,
  AnalysisStatus,
  ProjectMetadata,
  DependencyGraph,
  EndToEndFlow,
} from '@codemapr/shared';
import { TypeScriptAnalyzer } from './analyzers/typescript.analyzer';
import { JavaScriptAnalyzer } from './analyzers/javascript.analyzer';
import { ReactAnalyzer } from './analyzers/react.analyzer';
import { ServiceAnalyzer } from './analyzers/service.analyzer';
import { DependencyTracer } from './tracers/dependency.tracer';
import { FlowTracer } from './tracers/flow.tracer';
import { AnalyzeProjectDto, AnalyzeFileDto } from './dto/analysis.dto';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private readonly analysisResults = new Map<string, any>();
  private readonly analysisStatus = new Map<string, AnalysisStatus>();

  constructor(
    private readonly typeScriptAnalyzer: TypeScriptAnalyzer,
    private readonly javaScriptAnalyzer: JavaScriptAnalyzer,
    private readonly reactAnalyzer: ReactAnalyzer,
    private readonly serviceAnalyzer: ServiceAnalyzer,
    private readonly dependencyTracer: DependencyTracer,
    private readonly flowTracer: FlowTracer,
  ) {}

  async analyzeProject(
    files: Express.Multer.File[],
    dto: AnalyzeProjectDto,
  ): Promise<{ analysisId: string; status: AnalysisStatus }> {
    const analysisId = randomUUID();
    this.analysisStatus.set(analysisId, AnalysisStatus.PENDING);

    this.logger.log(`Starting project analysis: ${analysisId}`);

    // Start analysis in background
    this.performProjectAnalysis(analysisId, files, dto).catch((error) => {
      this.logger.error(`Analysis failed for ${analysisId}:`, error);
      this.analysisStatus.set(analysisId, AnalysisStatus.FAILED);
    });

    return {
      analysisId,
      status: AnalysisStatus.PENDING,
    };
  }

  async analyzeFile(dto: AnalyzeFileDto): Promise<FileAnalysis> {
    this.logger.log(`Analyzing file: ${dto.filePath}`);

    try {
      const analyzer = this.getAnalyzerForLanguage(dto.language);
      return await analyzer.analyzeFile(dto.filePath, dto.content);
    } catch (error) {
      this.logger.error(`File analysis failed for ${dto.filePath}:`, error);
      throw new BadRequestException(`Failed to analyze file: ${error.message}`);
    }
  }

  async getAnalysisResult(id: string): Promise<ProjectAnalysis | null> {
    return this.analysisResults.get(id) || null;
  }

  async getAnalysisStatus(id: string): Promise<{ status: AnalysisStatus }> {
    const status = this.analysisStatus.get(id) || AnalysisStatus.FAILED;
    return { status };
  }

  async getProjectAnalysisResults(
    projectId: string,
    limit = 10,
    offset = 0,
  ): Promise<{ results: any[]; total: number }> {
    // In a real implementation, this would query the database
    // For now, return mock data
    return {
      results: [],
      total: 0,
    };
  }

  private async performProjectAnalysis(
    analysisId: string,
    files: Express.Multer.File[],
    dto: AnalyzeProjectDto,
  ): Promise<void> {
    this.analysisStatus.set(analysisId, AnalysisStatus.IN_PROGRESS);

    try {
      const startTime = Date.now();
      const fileAnalyses: FileAnalysis[] = [];
      const entryPoints: string[] = [];

      // Filter and validate files
      const validFiles = this.filterValidFiles(files, dto);
      this.logger.log(`Processing ${validFiles.length} valid files`);

      // Analyze each file
      for (const file of validFiles) {
        try {
          const content = file.buffer.toString('utf-8');
          const language = this.detectLanguage(file.originalname);
          const analyzer = this.getAnalyzerForLanguage(language);

          const fileAnalysis = await analyzer.analyzeFile(file.originalname, content);
          
          // Add service call detection
          const serviceDetection = await this.analyzeServiceCalls(fileAnalysis, content);
          fileAnalysis.serviceCalls = serviceDetection.serviceCalls;
          fileAnalysis.externalServices = serviceDetection.externalServices;
          fileAnalysis.databaseOperations = serviceDetection.databaseOperations;
          
          fileAnalyses.push(fileAnalysis);

          // Detect entry points (files with main exports or specific patterns)
          if (this.isEntryPoint(file.originalname, content)) {
            entryPoints.push(file.originalname);
          }
        } catch (error) {
          this.logger.warn(`Failed to analyze file ${file.originalname}:`, error.message);
        }
      }

      // Build dependency graph
      const dependencyGraph = await this.dependencyTracer.buildDependencyGraph(fileAnalyses);

      // Trace end-to-end flows
      const endToEndFlows = await this.flowTracer.traceEndToEndFlows(fileAnalyses, dependencyGraph);

      // Create project metadata
      const metadata: ProjectMetadata = {
        name: dto.name,
        version: '1.0.0',
        language: dto.language,
        packageManager: 'npm', // Could be detected from lock files
        totalFiles: fileAnalyses.length,
        totalLines: fileAnalyses.reduce((sum, file) => sum + this.countLines(file), 0),
      };

      // Create final analysis result
      const projectAnalysis: ProjectAnalysis = {
        id: analysisId,
        projectId: randomUUID(), // In real app, this would be provided
        files: fileAnalyses,
        dependencies: dependencyGraph,
        entryPoints,
        metadata,
        endToEndFlows,
        createdAt: new Date(startTime),
        updatedAt: new Date(),
      };

      this.analysisResults.set(analysisId, projectAnalysis);
      this.analysisStatus.set(analysisId, AnalysisStatus.COMPLETED);

      const duration = Date.now() - startTime;
      this.logger.log(`Project analysis completed in ${duration}ms: ${analysisId}`);
    } catch (error) {
      this.logger.error(`Project analysis failed:`, error);
      this.analysisStatus.set(analysisId, AnalysisStatus.FAILED);
      throw error;
    }
  }

  private filterValidFiles(files: Express.Multer.File[], dto: AnalyzeProjectDto): Express.Multer.File[] {
    const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
    const excludePatterns = dto.excludePatterns || ['node_modules', '.git', 'dist', 'build'];

    return files.filter((file) => {
      // Check file extension
      const hasValidExtension = supportedExtensions.some((ext) =>
        file.originalname.toLowerCase().endsWith(ext)
      );

      if (!hasValidExtension) return false;

      // Check exclude patterns
      const isExcluded = excludePatterns.some((pattern) =>
        file.originalname.includes(pattern)
      );

      if (isExcluded) return false;

      // Check file size
      const maxSize = dto.maxFileSize || 1024 * 1024; // 1MB default
      if (file.size > maxSize) return false;

      // Check test files
      if (!dto.includeTestFiles && this.isTestFile(file.originalname)) {
        return false;
      }

      return true;
    });
  }

  private detectLanguage(filename: string): SupportedLanguage {
    const ext = filename.toLowerCase().split('.').pop();
    
    switch (ext) {
      case 'ts':
        return SupportedLanguage.TYPESCRIPT;
      case 'tsx':
        return SupportedLanguage.TSX;
      case 'jsx':
        return SupportedLanguage.JSX;
      case 'js':
      case 'mjs':
      case 'cjs':
      default:
        return SupportedLanguage.JAVASCRIPT;
    }
  }

  private getAnalyzerForLanguage(language: SupportedLanguage) {
    switch (language) {
      case SupportedLanguage.TYPESCRIPT:
      case SupportedLanguage.TSX:
        return this.typeScriptAnalyzer;
      case SupportedLanguage.JSX:
        return this.reactAnalyzer;
      case SupportedLanguage.JAVASCRIPT:
      default:
        return this.javaScriptAnalyzer;
    }
  }

  private isEntryPoint(filename: string, content: string): boolean {
    // Common entry point patterns
    const entryPointNames = ['index', 'main', 'app', 'server'];
    const baseName = filename.split('/').pop()?.split('.')[0]?.toLowerCase();
    
    if (entryPointNames.includes(baseName)) return true;
    
    // Check for main function or export patterns
    if (content.includes('export default') || content.includes('module.exports')) {
      return true;
    }
    
    return false;
  }

  private isTestFile(filename: string): boolean {
    const testPatterns = ['.test.', '.spec.', '__tests__', '__test__'];
    return testPatterns.some((pattern) => filename.includes(pattern));
  }

  private countLines(fileAnalysis: FileAnalysis): number {
    // This would count actual lines in the file
    // For now, return a mock value
    return 100;
  }

  private async analyzeServiceCalls(fileAnalysis: FileAnalysis, content: string): Promise<{
    serviceCalls: any[];
    externalServices: string[];
    databaseOperations: any[];
  }> {
    try {
      if (fileAnalysis.language === SupportedLanguage.TYPESCRIPT || fileAnalysis.language === SupportedLanguage.TSX) {
        return await this.serviceAnalyzer.analyzeTypeScriptFile(fileAnalysis.filePath, fileAnalysis.ast);
      } else {
        return await this.serviceAnalyzer.analyzeJavaScriptFile(fileAnalysis.filePath, fileAnalysis.ast);
      }
    } catch (error) {
      this.logger.warn(`Failed to analyze service calls in ${fileAnalysis.filePath}:`, error.message);
      return {
        serviceCalls: [],
        externalServices: [],
        databaseOperations: [],
      };
    }
  }
}