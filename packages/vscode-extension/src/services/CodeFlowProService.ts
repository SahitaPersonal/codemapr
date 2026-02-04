import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';
import { ConfigurationManager, CodeFlowProConfig } from '../utils/ConfigurationManager';
import { DataTransformer } from '../utils/DataTransformer';
import { Logger } from '../utils/Logger';
import { 
    FlowchartData, 
    ComplexityAnalysis, 
    SecurityScanResult,
    PerformanceAnalysis,
    ProjectAnalysis
} from '../types/shared';

export class CodeFlowProService {
    private httpClient: AxiosInstance;
    private config: CodeFlowProConfig;

    constructor(private configManager: ConfigurationManager) {
        this.config = configManager.getConfiguration();
        this.httpClient = this.createHttpClient();
        
        // Listen for configuration changes
        configManager.onConfigurationChanged((newConfig) => {
            this.config = newConfig;
            this.httpClient = this.createHttpClient();
        });
    }

    private createHttpClient(): AxiosInstance {
        return axios.create({
            baseURL: this.config.apiUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'CodeFlow-Pro-VSCode-Extension/1.0.0'
            }
        });
    }

    async analyzeFile(uri: vscode.Uri): Promise<any> {
        try {
            Logger.info(`Analyzing file: ${uri.fsPath}`);
            
            // Check if file should be excluded
            if (this.configManager.isFileExcluded(uri.fsPath)) {
                Logger.info(`File excluded from analysis: ${uri.fsPath}`);
                return null;
            }

            // Check file size
            const stat = await vscode.workspace.fs.stat(uri);
            if (!this.configManager.isFileSizeAllowed(stat.size)) {
                Logger.warn(`File too large for analysis: ${uri.fsPath} (${stat.size} bytes)`);
                throw new Error(`File too large for analysis (${stat.size} bytes)`);
            }

            // Read file content
            const content = await vscode.workspace.fs.readFile(uri);
            const fileContent = Buffer.from(content).toString('utf8');

            const requestData = DataTransformer.createAnalysisRequest(uri, fileContent);

            const response = await this.httpClient.post('/api/analysis/analyze-file', requestData);

            Logger.info(`File analysis completed: ${uri.fsPath}`);
            return response.data;
        } catch (error) {
            Logger.error(`Failed to analyze file: ${uri.fsPath}`, error);
            throw error;
        }
    }

    async generateFlowchart(uri: vscode.Uri, type: 'project' | 'file' | 'function' = 'file'): Promise<FlowchartData> {
        try {
            Logger.info(`Generating ${type} flowchart for: ${uri.fsPath}`);

            let endpoint = '/api/flowchart/generate';
            let requestData: any = {
                type,
                theme: this.config.flowchartTheme
            };

            if (type === 'project') {
                const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
                if (!workspaceFolder) {
                    throw new Error('No workspace folder found');
                }
                
                requestData.projectPath = workspaceFolder.uri.fsPath;
            } else {
                // Read file content for file-specific flowchart
                const content = await vscode.workspace.fs.readFile(uri);
                const fileContent = Buffer.from(content).toString('utf8');
                
                requestData = DataTransformer.createAnalysisRequest(uri, fileContent, {
                    type,
                    theme: this.config.flowchartTheme
                });
            }

            const response = await this.httpClient.post(endpoint, requestData);
            
            Logger.info(`Flowchart generated successfully for: ${uri.fsPath}`);
            return DataTransformer.transformFlowchartData(response.data);
        } catch (error) {
            Logger.error(`Failed to generate flowchart for: ${uri.fsPath}`, error);
            throw error;
        }
    }

    async analyzeComplexity(uri: vscode.Uri): Promise<ComplexityAnalysis> {
        try {
            Logger.info(`Analyzing complexity for: ${uri.fsPath}`);

            const content = await vscode.workspace.fs.readFile(uri);
            const fileContent = Buffer.from(content).toString('utf8');

            const requestData = DataTransformer.createAnalysisRequest(uri, fileContent, {
                includeComplexity: true
            });

            const response = await this.httpClient.post('/api/analysis/complexity', requestData);

            Logger.info(`Complexity analysis completed for: ${uri.fsPath}`);
            return DataTransformer.transformComplexityAnalysis(response.data);
        } catch (error) {
            Logger.error(`Failed to analyze complexity for: ${uri.fsPath}`, error);
            throw error;
        }
    }

    async scanSecurity(uri: vscode.Uri): Promise<SecurityScanResult> {
        try {
            Logger.info(`Scanning security for: ${uri.fsPath}`);

            const content = await vscode.workspace.fs.readFile(uri);
            const fileContent = Buffer.from(content).toString('utf8');

            const requestData = DataTransformer.createAnalysisRequest(uri, fileContent, {
                includeSecurity: true
            });

            const response = await this.httpClient.post('/api/analysis/security-vulnerability/scan-file', requestData);

            Logger.info(`Security scan completed for: ${uri.fsPath}`);
            return DataTransformer.transformSecurityScanResult(response.data);
        } catch (error) {
            Logger.error(`Failed to scan security for: ${uri.fsPath}`, error);
            throw error;
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            Logger.info('Testing connection to CodeFlow Pro backend');
            
            const response = await this.httpClient.get('/api/health');
            const isHealthy = response.status === 200 && response.data.status === 'ok';
            
            if (isHealthy) {
                Logger.info('Connection to backend successful');
            } else {
                Logger.warn('Backend connection test failed', response.data);
            }
            
            return isHealthy;
        } catch (error) {
            Logger.error('Failed to connect to backend', error);
            return false;
        }
    }

    updateConfiguration(): void {
        this.config = this.configManager.getConfiguration();
        this.httpClient = this.createHttpClient();
        Logger.info('CodeFlow Pro service configuration updated');
    }

    private getLanguageFromUri(uri: vscode.Uri): string {
        const extension = uri.fsPath.split('.').pop()?.toLowerCase();
        
        switch (extension) {
            case 'ts':
                return 'typescript';
            case 'tsx':
                return 'typescriptreact';
            case 'js':
                return 'javascript';
            case 'jsx':
                return 'javascriptreact';
            default:
                return 'javascript';
        }
    }

    dispose(): void {
        Logger.info('CodeFlow Pro service disposed');
    }
}