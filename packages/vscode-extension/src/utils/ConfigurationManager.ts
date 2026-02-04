import * as vscode from 'vscode';

export interface CodeFlowProConfig {
    apiUrl: string;
    autoAnalysis: boolean;
    showComplexityIndicators: boolean;
    enableSecurityScanning: boolean;
    flowchartTheme: 'light' | 'dark' | 'ocean';
    maxFileSize: number;
    excludePatterns: string[];
}

export class ConfigurationManager {
    private static readonly CONFIG_SECTION = 'codeflow-pro';

    getConfiguration(): CodeFlowProConfig {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        
        return {
            apiUrl: config.get<string>('apiUrl', 'http://localhost:3001'),
            autoAnalysis: config.get<boolean>('autoAnalysis', true),
            showComplexityIndicators: config.get<boolean>('showComplexityIndicators', true),
            enableSecurityScanning: config.get<boolean>('enableSecurityScanning', true),
            flowchartTheme: config.get<'light' | 'dark' | 'ocean'>('flowchartTheme', 'light'),
            maxFileSize: config.get<number>('maxFileSize', 1048576), // 1MB
            excludePatterns: config.get<string[]>('excludePatterns', [
                'node_modules/**',
                'dist/**',
                'build/**',
                '*.min.js'
            ])
        };
    }

    async updateConfiguration(key: keyof CodeFlowProConfig, value: any): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        await config.update(key, value, vscode.ConfigurationTarget.Global);
    }

    isFileExcluded(filePath: string): boolean {
        const config = this.getConfiguration();
        const relativePath = vscode.workspace.asRelativePath(filePath);
        
        return config.excludePatterns.some(pattern => {
            // Simple glob pattern matching
            const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
            return regex.test(relativePath);
        });
    }

    isFileSizeAllowed(fileSize: number): boolean {
        const config = this.getConfiguration();
        return fileSize <= config.maxFileSize;
    }

    onConfigurationChanged(callback: (config: CodeFlowProConfig) => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration(ConfigurationManager.CONFIG_SECTION)) {
                callback(this.getConfiguration());
            }
        });
    }
}