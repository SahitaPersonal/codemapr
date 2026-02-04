import * as vscode from 'vscode';
import { ConfigurationManager } from '../utils/ConfigurationManager';
import { Logger } from '../utils/Logger';

export class SettingsProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codeflow-pro.settingsView';
    
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _configManager: ConfigurationManager
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.type) {
                    case 'ready':
                        Logger.info('Settings webview ready');
                        await this._sendCurrentConfiguration();
                        break;
                    
                    case 'updateConfiguration':
                        await this._updateConfiguration(message.key, message.value);
                        break;
                    
                    case 'resetConfiguration':
                        await this._resetConfiguration();
                        break;
                    
                    case 'testConnection':
                        await this._testConnection();
                        break;
                    
                    case 'exportSettings':
                        await this._exportSettings();
                        break;
                    
                    case 'importSettings':
                        await this._importSettings();
                        break;
                }
            },
            undefined,
            []
        );

        // Listen for configuration changes
        this._configManager.onConfigurationChanged((config) => {
            this._sendConfiguration(config);
        });
    }

    private async _sendCurrentConfiguration(): Promise<void> {
        const config = this._configManager.getConfiguration();
        this._sendConfiguration(config);
    }

    private _sendConfiguration(config: any): void {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'configurationUpdate',
                data: config
            });
        }
    }

    private async _updateConfiguration(key: string, value: any): Promise<void> {
        try {
            await this._configManager.updateConfiguration(key as any, value);
            
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'configurationUpdated',
                    key,
                    value
                });
            }
            
            vscode.window.showInformationMessage(`Configuration updated: ${key}`);
            Logger.info(`Configuration updated: ${key} = ${JSON.stringify(value)}`);
        } catch (error) {
            Logger.error(`Failed to update configuration: ${key}`, error);
            vscode.window.showErrorMessage(`Failed to update configuration: ${error}`);
            
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'error',
                    message: `Failed to update ${key}: ${error}`
                });
            }
        }
    }

    private async _resetConfiguration(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('codeflow-pro');
            const keys = [
                'apiUrl',
                'autoAnalysis',
                'showComplexityIndicators',
                'enableSecurityScanning',
                'flowchartTheme',
                'maxFileSize',
                'excludePatterns'
            ];

            for (const key of keys) {
                await config.update(key, undefined, vscode.ConfigurationTarget.Global);
            }

            vscode.window.showInformationMessage('Configuration reset to defaults');
            Logger.info('Configuration reset to defaults');
            
            // Send updated configuration
            await this._sendCurrentConfiguration();
        } catch (error) {
            Logger.error('Failed to reset configuration', error);
            vscode.window.showErrorMessage(`Failed to reset configuration: ${error}`);
        }
    }

    private async _testConnection(): Promise<void> {
        try {
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'connectionTesting',
                    message: 'Testing connection...'
                });
            }

            const config = this._configManager.getConfiguration();
            
            // Use axios instead of fetch for Node.js compatibility
            const axios = require('axios');
            const response = await axios.get(`${config.apiUrl}/api/health`, {
                timeout: 5000
            });
            
            if (response.status === 200) {
                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'connectionTestResult',
                        success: true,
                        data: response.data
                    });
                }
                
                vscode.window.showInformationMessage('Connection test successful');
                Logger.info('Backend connection test successful');
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            Logger.error('Backend connection test failed', error);
            
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'connectionTestResult',
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
            
            vscode.window.showErrorMessage(`Connection test failed: ${error}`);
        }
    }

    private async _exportSettings(): Promise<void> {
        try {
            const config = this._configManager.getConfiguration();
            const settingsJson = JSON.stringify(config, null, 2);
            
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file('codeflow-pro-settings.json'),
                filters: {
                    'JSON': ['json']
                }
            });

            if (uri) {
                await vscode.workspace.fs.writeFile(uri, Buffer.from(settingsJson, 'utf8'));
                vscode.window.showInformationMessage(`Settings exported to ${uri.fsPath}`);
                Logger.info(`Settings exported to ${uri.fsPath}`);
            }
        } catch (error) {
            Logger.error('Failed to export settings', error);
            vscode.window.showErrorMessage(`Failed to export settings: ${error}`);
        }
    }

    private async _importSettings(): Promise<void> {
        try {
            const uris = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'JSON': ['json']
                }
            });

            if (uris && uris.length > 0) {
                const content = await vscode.workspace.fs.readFile(uris[0]);
                const settingsText = Buffer.from(content).toString('utf8');
                const settings = JSON.parse(settingsText);

                // Validate settings structure
                const validKeys = [
                    'apiUrl',
                    'autoAnalysis',
                    'showComplexityIndicators',
                    'enableSecurityScanning',
                    'flowchartTheme',
                    'maxFileSize',
                    'excludePatterns'
                ];

                const config = vscode.workspace.getConfiguration('codeflow-pro');
                let importedCount = 0;

                for (const [key, value] of Object.entries(settings)) {
                    if (validKeys.includes(key)) {
                        await config.update(key, value, vscode.ConfigurationTarget.Global);
                        importedCount++;
                    }
                }

                vscode.window.showInformationMessage(`Settings imported: ${importedCount} items`);
                Logger.info(`Settings imported from ${uris[0].fsPath}: ${importedCount} items`);
                
                // Send updated configuration
                await this._sendCurrentConfiguration();
            }
        } catch (error) {
            Logger.error('Failed to import settings', error);
            vscode.window.showErrorMessage(`Failed to import settings: ${error}`);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'settings.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'settings.css'));
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src https:;">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet">
                <title>CodeFlow Pro Settings</title>
            </head>
            <body>
                <div id="app">
                    <div class="header">
                        <h2>CodeFlow Pro Settings</h2>
                        <div class="header-actions">
                            <button id="testConnectionBtn" class="btn btn-secondary">Test Connection</button>
                            <button id="resetBtn" class="btn btn-warning">Reset</button>
                        </div>
                    </div>
                    
                    <div class="settings-container">
                        <div class="setting-group">
                            <h3>Backend Configuration</h3>
                            
                            <div class="setting-item">
                                <label for="apiUrl">API URL</label>
                                <input type="text" id="apiUrl" placeholder="http://localhost:3001">
                                <small>URL of the CodeFlow Pro backend service</small>
                            </div>
                            
                            <div class="connection-status" id="connectionStatus">
                                <span class="status-indicator"></span>
                                <span class="status-text">Not tested</span>
                            </div>
                        </div>
                        
                        <div class="setting-group">
                            <h3>Analysis Settings</h3>
                            
                            <div class="setting-item">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="autoAnalysis">
                                    <span class="checkmark"></span>
                                    Auto-analyze files on save
                                </label>
                                <small>Automatically analyze files when they are saved</small>
                            </div>
                            
                            <div class="setting-item">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="enableSecurityScanning">
                                    <span class="checkmark"></span>
                                    Enable security scanning
                                </label>
                                <small>Scan for security vulnerabilities during analysis</small>
                            </div>
                            
                            <div class="setting-item">
                                <label for="maxFileSize">Maximum file size (bytes)</label>
                                <input type="number" id="maxFileSize" min="1024" max="10485760" step="1024">
                                <small>Files larger than this will be skipped</small>
                            </div>
                        </div>
                        
                        <div class="setting-group">
                            <h3>Visualization Settings</h3>
                            
                            <div class="setting-item">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="showComplexityIndicators">
                                    <span class="checkmark"></span>
                                    Show complexity indicators
                                </label>
                                <small>Display complexity metrics in flowcharts</small>
                            </div>
                            
                            <div class="setting-item">
                                <label for="flowchartTheme">Flowchart theme</label>
                                <select id="flowchartTheme">
                                    <option value="light">Light</option>
                                    <option value="dark">Dark</option>
                                    <option value="ocean">Ocean</option>
                                </select>
                                <small>Default theme for flowchart visualization</small>
                            </div>
                        </div>
                        
                        <div class="setting-group">
                            <h3>File Exclusions</h3>
                            
                            <div class="setting-item">
                                <label for="excludePatterns">Exclude patterns</label>
                                <textarea id="excludePatterns" rows="4" placeholder="node_modules/**&#10;dist/**&#10;build/**&#10;*.min.js"></textarea>
                                <small>File patterns to exclude from analysis (one per line)</small>
                            </div>
                        </div>
                        
                        <div class="setting-group">
                            <h3>Import/Export</h3>
                            
                            <div class="setting-actions">
                                <button id="exportBtn" class="btn btn-secondary">Export Settings</button>
                                <button id="importBtn" class="btn btn-secondary">Import Settings</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }

    public dispose(): void {
        Logger.info('SettingsProvider disposed');
    }
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}