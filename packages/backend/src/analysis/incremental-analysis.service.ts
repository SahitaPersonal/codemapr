import { Injectable, Logger } from '@nestjs/common';
import { FileAnalysis, ProjectAnalysis, AnalysisStatus, SupportedLanguage } from '@codemapr/shared';
import { AnalysisService } from './analysis.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface FileChangeInfo {
  filePath: string;
  lastModified: Date;
  size: number;
  hash: string;
  changeType: FileChangeType;
}

export interface AnalysisCache {
  projectPath: string;
  lastAnalysis: Date;
  fileHashes: Map<string, string>;
  analysisResults: Map<string, FileAnalysis>;
  projectAnalysis?: ProjectAnalysis;
  version: number;
}

export interface IncrementalAnalysisResult {
  analysisId: string;
  projectPath: string;
  totalFiles: number;
  changedFiles: number;
  newFiles: number;
  deletedFiles: number;
  unchangedFiles: number;
  analysisTime: number;
  cacheHitRate: number;
  changes: FileChangeInfo[];
  projectAnalysis: ProjectAnalysis;
  status: AnalysisStatus;
}

export interface AnalysisComparison {
  previousVersion: number;
  currentVersion: number;
  addedFiles: string[];
  modifiedFiles: string[];
  deletedFiles: string[];
  unchangedFiles: string[];
  complexityChanges: ComplexityChange[];
  performanceChanges: PerformanceChange[];
  securityChanges: SecurityChange[];
}

export interface ComplexityChange {
  filePath: string;
  previousComplexity: number;
  currentComplexity: number;
  changeType: 'increased' | 'decreased' | 'unchanged';
  changeAmount: number;
}

export interface PerformanceChange {
  filePath: string;
  previousScore: number;
  currentScore: number;
  changeType: 'improved' | 'degraded' | 'unchanged';
  changeAmount: number;
}

export interface SecurityChange {
  filePath: string;
  previousVulnerabilities: number;
  currentVulnerabilities: number;
  changeType: 'improved' | 'degraded' | 'unchanged';
  newVulnerabilities: string[];
  resolvedVulnerabilities: string[];
}

export enum FileChangeType {
  ADDED = 'added',
  MODIFIED = 'modified',
  DELETED = 'deleted',
  UNCHANGED = 'unchanged',
}

@Injectable()
export class IncrementalAnalysisService {
  private readonly logger = new Logger(IncrementalAnalysisService.name);
  private readonly cacheDir = path.join(process.cwd(), '.cache', 'analysis');
  private readonly analysisCache = new Map<string, AnalysisCache>();

  constructor(private readonly analysisService: AnalysisService) {
    this.ensureCacheDirectory();
    this.loadCacheFromDisk();
  }

  async performIncrementalAnalysis(projectPath: string): Promise<IncrementalAnalysisResult> {
    const startTime = Date.now();
    const analysisId = this.generateAnalysisId();
    
    this.logger.log(`Starting incremental analysis for project: ${projectPath}`);

    try {
      // Get current file states
      const currentFiles = await this.scanProjectFiles(projectPath);
      const cache = this.getOrCreateCache(projectPath);
      
      // Detect changes
      const changes = await this.detectFileChanges(currentFiles, cache);
      const changedFiles = changes.filter(c => c.changeType !== FileChangeType.UNCHANGED);
      
      this.logger.log(`Detected ${changedFiles.length} changed files out of ${currentFiles.size} total files`);

      // Analyze only changed files
      const analysisResults = new Map<string, FileAnalysis>();
      let analyzedCount = 0;

      // Copy unchanged files from cache
      for (const change of changes) {
        if (change.changeType === FileChangeType.UNCHANGED && cache.analysisResults.has(change.filePath)) {
          analysisResults.set(change.filePath, cache.analysisResults.get(change.filePath)!);
        } else if (change.changeType !== FileChangeType.DELETED) {
          // Analyze changed/new files
          try {
            const fileAnalysis = await this.analyzeFile(change.filePath);
            if (fileAnalysis) {
              // Clean AST to avoid circular references in cache
              const cleanedAnalysis = {
                ...fileAnalysis,
                ast: null,
              };
              analysisResults.set(change.filePath, cleanedAnalysis);
              analyzedCount++;
            }
          } catch (error) {
            this.logger.warn(`Failed to analyze file ${change.filePath}: ${error.message}`);
          }
        }
      }

      // Build project analysis from individual file analyses
      const projectAnalysis = await this.buildProjectAnalysis(
        analysisId,
        projectPath,
        Array.from(analysisResults.values())
      );

      // Update cache
      await this.updateCache(projectPath, currentFiles, analysisResults, projectAnalysis);

      const analysisTime = Date.now() - startTime;
      const cacheHitRate = (currentFiles.size - analyzedCount) / currentFiles.size;

      const result: IncrementalAnalysisResult = {
        analysisId,
        projectPath,
        totalFiles: currentFiles.size,
        changedFiles: changes.filter(c => c.changeType === FileChangeType.MODIFIED).length,
        newFiles: changes.filter(c => c.changeType === FileChangeType.ADDED).length,
        deletedFiles: changes.filter(c => c.changeType === FileChangeType.DELETED).length,
        unchangedFiles: changes.filter(c => c.changeType === FileChangeType.UNCHANGED).length,
        analysisTime,
        cacheHitRate,
        changes,
        projectAnalysis,
        status: AnalysisStatus.COMPLETED,
      };

      this.logger.log(`Incremental analysis completed in ${analysisTime}ms with ${(cacheHitRate * 100).toFixed(1)}% cache hit rate`);
      return result;

    } catch (error) {
      this.logger.error(`Incremental analysis failed for project ${projectPath}:`, error);
      throw error;
    }
  }

  async compareAnalysisVersions(projectPath: string, previousVersion?: number): Promise<AnalysisComparison> {
    const cache = this.analysisCache.get(this.getCacheKey(projectPath));
    
    if (!cache || !cache.projectAnalysis) {
      throw new Error('No analysis cache found for project');
    }

    const currentVersion = cache.version;
    const targetPreviousVersion = previousVersion || currentVersion - 1;

    // Load previous version from disk if needed
    const previousCache = await this.loadCacheVersion(projectPath, targetPreviousVersion);
    
    if (!previousCache) {
      throw new Error(`Previous version ${targetPreviousVersion} not found`);
    }

    // Compare file lists
    const currentFiles = new Set(cache.projectAnalysis.files.map(f => f.filePath));
    const previousFiles = new Set(previousCache.projectAnalysis?.files.map(f => f.filePath) || []);

    const addedFiles = Array.from(currentFiles).filter(f => !previousFiles.has(f));
    const deletedFiles = Array.from(previousFiles).filter(f => !currentFiles.has(f));
    const commonFiles = Array.from(currentFiles).filter(f => previousFiles.has(f));
    const modifiedFiles: string[] = [];
    const unchangedFiles: string[] = [];

    // Check for modifications in common files
    for (const filePath of commonFiles) {
      const currentHash = cache.fileHashes.get(filePath);
      const previousHash = previousCache.fileHashes.get(filePath);
      
      if (currentHash !== previousHash) {
        modifiedFiles.push(filePath);
      } else {
        unchangedFiles.push(filePath);
      }
    }

    // Compare complexity changes
    const complexityChanges = this.compareComplexity(
      cache.projectAnalysis.files,
      previousCache.projectAnalysis?.files || []
    );

    // Compare performance changes
    const performanceChanges = this.comparePerformance(
      cache.projectAnalysis.files,
      previousCache.projectAnalysis?.files || []
    );

    // Compare security changes
    const securityChanges = this.compareSecurity(
      cache.projectAnalysis.files,
      previousCache.projectAnalysis?.files || []
    );

    return {
      previousVersion: targetPreviousVersion,
      currentVersion,
      addedFiles,
      modifiedFiles,
      deletedFiles,
      unchangedFiles,
      complexityChanges,
      performanceChanges,
      securityChanges,
    };
  }

  async invalidateCache(projectPath: string, filePaths?: string[]): Promise<void> {
    const cacheKey = this.getCacheKey(projectPath);
    const cache = this.analysisCache.get(cacheKey);

    if (!cache) {
      return;
    }

    if (filePaths) {
      // Invalidate specific files
      for (const filePath of filePaths) {
        cache.fileHashes.delete(filePath);
        cache.analysisResults.delete(filePath);
      }
      this.logger.log(`Invalidated cache for ${filePaths.length} files in project ${projectPath}`);
    } else {
      // Invalidate entire project cache
      this.analysisCache.delete(cacheKey);
      await this.deleteCacheFile(projectPath);
      this.logger.log(`Invalidated entire cache for project ${projectPath}`);
    }

    await this.saveCacheToDisk();
  }

  async getCacheStatistics(projectPath: string): Promise<{
    cacheSize: number;
    fileCount: number;
    lastAnalysis: Date | null;
    version: number;
    hitRate: number;
    diskSize: number;
  }> {
    const cache = this.analysisCache.get(this.getCacheKey(projectPath));
    
    if (!cache) {
      return {
        cacheSize: 0,
        fileCount: 0,
        lastAnalysis: null,
        version: 0,
        hitRate: 0,
        diskSize: 0,
      };
    }

    const cacheFile = this.getCacheFilePath(projectPath);
    let diskSize = 0;
    
    try {
      const stats = fs.statSync(cacheFile);
      diskSize = stats.size;
    } catch (error) {
      // File doesn't exist
    }

    return {
      cacheSize: cache.analysisResults.size,
      fileCount: cache.fileHashes.size,
      lastAnalysis: cache.lastAnalysis,
      version: cache.version,
      hitRate: 0, // Would be calculated from recent analysis runs
      diskSize,
    };
  }

  private async scanProjectFiles(projectPath: string): Promise<Map<string, FileChangeInfo>> {
    const files = new Map<string, FileChangeInfo>();
    const supportedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
    const excludePatterns = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];

    const walkDir = async (dir: string) => {
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            if (!excludePatterns.some(pattern => item.includes(pattern))) {
              await walkDir(fullPath);
            }
          } else if (stat.isFile()) {
            if (supportedExtensions.some(ext => item.endsWith(ext))) {
              const content = fs.readFileSync(fullPath, 'utf-8');
              const hash = this.calculateFileHash(content);
              
              files.set(fullPath, {
                filePath: fullPath,
                lastModified: stat.mtime,
                size: stat.size,
                hash,
                changeType: FileChangeType.UNCHANGED, // Will be determined later
              });
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to read directory ${dir}:`, error.message);
      }
    };

    await walkDir(projectPath);
    return files;
  }

  private async detectFileChanges(
    currentFiles: Map<string, FileChangeInfo>,
    cache: AnalysisCache
  ): Promise<FileChangeInfo[]> {
    const changes: FileChangeInfo[] = [];
    const cachedFiles = new Set(cache.fileHashes.keys());

    // Check current files against cache
    for (const [filePath, fileInfo] of currentFiles) {
      const cachedHash = cache.fileHashes.get(filePath);
      
      if (!cachedHash) {
        // New file
        changes.push({ ...fileInfo, changeType: FileChangeType.ADDED });
      } else if (cachedHash !== fileInfo.hash) {
        // Modified file
        changes.push({ ...fileInfo, changeType: FileChangeType.MODIFIED });
      } else {
        // Unchanged file
        changes.push({ ...fileInfo, changeType: FileChangeType.UNCHANGED });
      }
    }

    // Check for deleted files
    for (const cachedFilePath of cachedFiles) {
      if (!currentFiles.has(cachedFilePath)) {
        changes.push({
          filePath: cachedFilePath,
          lastModified: new Date(),
          size: 0,
          hash: '',
          changeType: FileChangeType.DELETED,
        });
      }
    }

    return changes;
  }

  private async analyzeFile(filePath: string): Promise<FileAnalysis | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const language = this.detectLanguage(filePath);
      
      if (!language) {
        return null;
      }

      // Use the existing analysis service to analyze the file
      const fileAnalysis = await this.analysisService.analyzeFile({
        filePath,
        content,
        language,
      });

      return fileAnalysis;
    } catch (error) {
      this.logger.warn(`Failed to analyze file ${filePath}:`, error);
      return null;
    }
  }

  private async buildProjectAnalysis(
    analysisId: string,
    projectPath: string,
    fileAnalyses: FileAnalysis[]
  ): Promise<ProjectAnalysis> {
    // Clean AST objects to avoid circular references for JSON serialization
    const cleanedFileAnalyses = fileAnalyses.map(file => ({
      ...file,
      ast: null, // Remove AST to avoid circular references
    }));

    // This is a simplified version - in a real implementation,
    // you'd want to rebuild dependency graphs and flows
    return {
      id: analysisId,
      projectId: this.generateProjectId(projectPath),
      files: cleanedFileAnalyses,
      dependencies: { nodes: [], edges: [], cycles: [] },
      entryPoints: [],
      metadata: {
        name: path.basename(projectPath),
        version: '1.0.0',
        language: fileAnalyses[0]?.language || SupportedLanguage.TYPESCRIPT,
        packageManager: 'npm',
        totalFiles: fileAnalyses.length,
        totalLines: fileAnalyses.reduce((sum, file) => sum + this.estimateLines(file), 0),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private getOrCreateCache(projectPath: string): AnalysisCache {
    const cacheKey = this.getCacheKey(projectPath);
    
    if (!this.analysisCache.has(cacheKey)) {
      this.analysisCache.set(cacheKey, {
        projectPath,
        lastAnalysis: new Date(0),
        fileHashes: new Map(),
        analysisResults: new Map(),
        version: 1,
      });
    }

    return this.analysisCache.get(cacheKey)!;
  }

  private async updateCache(
    projectPath: string,
    currentFiles: Map<string, FileChangeInfo>,
    analysisResults: Map<string, FileAnalysis>,
    projectAnalysis: ProjectAnalysis
  ): Promise<void> {
    const cache = this.getOrCreateCache(projectPath);
    
    // Update file hashes
    cache.fileHashes.clear();
    for (const [filePath, fileInfo] of currentFiles) {
      cache.fileHashes.set(filePath, fileInfo.hash);
    }

    // Update analysis results
    cache.analysisResults = analysisResults;
    cache.projectAnalysis = projectAnalysis;
    cache.lastAnalysis = new Date();
    cache.version += 1;

    await this.saveCacheToDisk();
  }

  private compareComplexity(currentFiles: FileAnalysis[], previousFiles: FileAnalysis[]): ComplexityChange[] {
    const changes: ComplexityChange[] = [];
    const previousMap = new Map(previousFiles.map(f => [f.filePath, f]));

    for (const currentFile of currentFiles) {
      const previousFile = previousMap.get(currentFile.filePath);
      
      if (previousFile) {
        const currentComplexity = currentFile.complexity.cyclomatic;
        const previousComplexity = previousFile.complexity.cyclomatic;
        const changeAmount = currentComplexity - previousComplexity;

        let changeType: 'increased' | 'decreased' | 'unchanged' = 'unchanged';
        if (changeAmount > 0) changeType = 'increased';
        else if (changeAmount < 0) changeType = 'decreased';

        if (changeAmount !== 0) {
          changes.push({
            filePath: currentFile.filePath,
            previousComplexity,
            currentComplexity,
            changeType,
            changeAmount: Math.abs(changeAmount),
          });
        }
      }
    }

    return changes;
  }

  private comparePerformance(currentFiles: FileAnalysis[], previousFiles: FileAnalysis[]): PerformanceChange[] {
    const changes: PerformanceChange[] = [];
    const previousMap = new Map(previousFiles.map(f => [f.filePath, f]));

    for (const currentFile of currentFiles) {
      const previousFile = previousMap.get(currentFile.filePath);
      
      if (previousFile && currentFile.performanceScore !== undefined && previousFile.performanceScore !== undefined) {
        const currentScore = currentFile.performanceScore;
        const previousScore = previousFile.performanceScore;
        const changeAmount = currentScore - previousScore;

        let changeType: 'improved' | 'degraded' | 'unchanged' = 'unchanged';
        if (changeAmount > 0) changeType = 'improved';
        else if (changeAmount < 0) changeType = 'degraded';

        if (Math.abs(changeAmount) > 5) { // Only report significant changes
          changes.push({
            filePath: currentFile.filePath,
            previousScore,
            currentScore,
            changeType,
            changeAmount: Math.abs(changeAmount),
          });
        }
      }
    }

    return changes;
  }

  private compareSecurity(currentFiles: FileAnalysis[], previousFiles: FileAnalysis[]): SecurityChange[] {
    const changes: SecurityChange[] = [];
    const previousMap = new Map(previousFiles.map(f => [f.filePath, f]));

    for (const currentFile of currentFiles) {
      const previousFile = previousMap.get(currentFile.filePath);
      
      if (previousFile) {
        const currentVulns = currentFile.securityVulnerabilities || [];
        const previousVulns = previousFile.securityVulnerabilities || [];
        
        const currentCount = currentVulns.length;
        const previousCount = previousVulns.length;

        let changeType: 'improved' | 'degraded' | 'unchanged' = 'unchanged';
        if (currentCount < previousCount) changeType = 'improved';
        else if (currentCount > previousCount) changeType = 'degraded';

        if (currentCount !== previousCount) {
          const previousVulnIds = new Set(previousVulns.map(v => v.id));
          const currentVulnIds = new Set(currentVulns.map(v => v.id));

          const newVulnerabilities = currentVulns
            .filter(v => !previousVulnIds.has(v.id))
            .map(v => v.id);
          
          const resolvedVulnerabilities = previousVulns
            .filter(v => !currentVulnIds.has(v.id))
            .map(v => v.id);

          changes.push({
            filePath: currentFile.filePath,
            previousVulnerabilities: previousCount,
            currentVulnerabilities: currentCount,
            changeType,
            newVulnerabilities,
            resolvedVulnerabilities,
          });
        }
      }
    }

    return changes;
  }

  private calculateFileHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
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

  private generateAnalysisId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateProjectId(projectPath: string): string {
    return crypto.createHash('md5').update(projectPath).digest('hex');
  }

  private estimateLines(fileAnalysis: FileAnalysis): number {
    // Simple estimation based on functions and classes
    return (fileAnalysis.functions.length * 10) + (fileAnalysis.classes.length * 20) + 50;
  }

  private getCacheKey(projectPath: string): string {
    return crypto.createHash('md5').update(projectPath).digest('hex');
  }

  private getCacheFilePath(projectPath: string): string {
    const cacheKey = this.getCacheKey(projectPath);
    return path.join(this.cacheDir, `${cacheKey}.json`);
  }

  private ensureCacheDirectory(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private async loadCacheFromDisk(): Promise<void> {
    try {
      const files = fs.readdirSync(this.cacheDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.cacheDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const cacheData = JSON.parse(content);
          
          // Convert Maps back from JSON
          const cache: AnalysisCache = {
            ...cacheData,
            fileHashes: new Map(cacheData.fileHashes),
            analysisResults: new Map(cacheData.analysisResults),
            lastAnalysis: new Date(cacheData.lastAnalysis),
          };
          
          const cacheKey = this.getCacheKey(cache.projectPath);
          this.analysisCache.set(cacheKey, cache);
        }
      }
      
      this.logger.log(`Loaded ${this.analysisCache.size} project caches from disk`);
    } catch (error) {
      this.logger.warn('Failed to load cache from disk:', error.message);
    }
  }

  private async saveCacheToDisk(): Promise<void> {
    try {
      for (const [cacheKey, cache] of this.analysisCache) {
        const filePath = path.join(this.cacheDir, `${cacheKey}.json`);
        
        // Convert Maps to JSON-serializable format
        const cacheData = {
          ...cache,
          fileHashes: Array.from(cache.fileHashes.entries()),
          analysisResults: Array.from(cache.analysisResults.entries()),
        };
        
        fs.writeFileSync(filePath, JSON.stringify(cacheData, null, 2));
      }
    } catch (error) {
      this.logger.error('Failed to save cache to disk:', error);
    }
  }

  private async loadCacheVersion(projectPath: string, version: number): Promise<AnalysisCache | null> {
    // In a real implementation, you'd store versioned caches
    // For now, just return null if version doesn't match current
    const cache = this.analysisCache.get(this.getCacheKey(projectPath));
    return cache && cache.version === version ? cache : null;
  }

  private async deleteCacheFile(projectPath: string): Promise<void> {
    try {
      const cacheFile = this.getCacheFilePath(projectPath);
      if (fs.existsSync(cacheFile)) {
        fs.unlinkSync(cacheFile);
      }
    } catch (error) {
      this.logger.warn(`Failed to delete cache file for ${projectPath}:`, error.message);
    }
  }
}