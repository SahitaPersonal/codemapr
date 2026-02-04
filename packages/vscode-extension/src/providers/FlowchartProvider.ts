import * as vscode from 'vscode';
import { CodeFlowProService } from '../services/CodeFlowProService';
import { FlowchartData, ComplexityAnalysis, SecurityScanResult, FlowNode } from '../types/shared';
import { Logger } from '../utils/Logger';

export class FlowchartProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codeflow-pro.flowchartView';
    
    private _view?: vscode.WebviewView;
    private _currentFlowchart?: FlowchartData;
    private _activeFile?: vscode.Uri;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _codeFlowProService: CodeFlowProService
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
                        Logger.info('Webview ready');
                        if (this._currentFlowchart) {
                            this._updateWebview(this._currentFlowchart);
                        }
                        break;
                    
                    case 'nodeClick':
                        await this._handleNodeClick(message.nodeId);
                        break;
                    
                    case 'generateFlowchart':
                        if (this._activeFile) {
                            await this.generateFlowchart(this._activeFile);
                        }
                        break;
                    
                    case 'refreshFlowchart':
                        if (this._activeFile) {
                            await this.generateFlowchart(this._activeFile);
                        }
                        break;
                    
                    case 'exportFlowchart':
                        await this._exportFlowchart(message.format);
                        break;
                    
                    case 'error':
                        Logger.error('Webview error', message.error);
                        vscode.window.showErrorMessage(`Flowchart error: ${message.error}`);
                        break;
                }
            },
            undefined,
            []
        );
    }

    public async generateFlowchart(uri: vscode.Uri): Promise<void> {
        try {
            if (!this._view) {
                Logger.warn('Webview not available for flowchart generation');
                return;
            }

            Logger.info(`Generating flowchart for: ${uri.fsPath}`);
            
            // Show loading state
            this._view.webview.postMessage({
                type: 'loading',
                message: 'Generating flowchart...'
            });

            const flowchartData = await this._codeFlowProService.generateFlowchart(uri, 'file');
            this._currentFlowchart = flowchartData;
            this._activeFile = uri;

            this._updateWebview(flowchartData);
            
            Logger.info(`Flowchart generated successfully for: ${uri.fsPath}`);
        } catch (error) {
            Logger.error(`Failed to generate flowchart for: ${uri.fsPath}`, error);
            
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'error',
                    message: `Failed to generate flowchart: ${error}`
                });
            }
            
            throw error;
        }
    }

    public async generateProjectFlowchart(uri: vscode.Uri): Promise<void> {
        try {
            if (!this._view) {
                Logger.warn('Webview not available for project flowchart generation');
                return;
            }

            Logger.info(`Generating project flowchart for: ${uri.fsPath}`);
            
            // Show loading state
            this._view.webview.postMessage({
                type: 'loading',
                message: 'Generating project flowchart...'
            });

            const flowchartData = await this._codeFlowProService.generateFlowchart(uri, 'project');
            this._currentFlowchart = flowchartData;

            this._updateWebview(flowchartData);
            
            Logger.info(`Project flowchart generated successfully for: ${uri.fsPath}`);
        } catch (error) {
            Logger.error(`Failed to generate project flowchart for: ${uri.fsPath}`, error);
            
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'error',
                    message: `Failed to generate project flowchart: ${error}`
                });
            }
            
            throw error;
        }
    }

    public async generateFileFlowchart(uri: vscode.Uri): Promise<void> {
        await this.generateFlowchart(uri);
    }

    public async showComplexityResults(complexity: ComplexityAnalysis): Promise<void> {
        if (!this._view) {
            Logger.warn('Webview not available for complexity results');
            return;
        }

        this._view.webview.postMessage({
            type: 'complexityResults',
            data: complexity
        });
    }

    public async showSecurityResults(securityResults: SecurityScanResult): Promise<void> {
        if (!this._view) {
            Logger.warn('Webview not available for security results');
            return;
        }

        this._view.webview.postMessage({
            type: 'securityResults',
            data: securityResults
        });
    }

    public setActiveFile(uri: vscode.Uri): void {
        this._activeFile = uri;
        
        if (this._view) {
            this._view.webview.postMessage({
                type: 'activeFileChanged',
                filePath: vscode.workspace.asRelativePath(uri)
            });
        }
    }

    private _updateWebview(flowchartData: FlowchartData): void {
        if (!this._view) {
            return;
        }

        this._view.webview.postMessage({
            type: 'updateFlowchart',
            data: flowchartData
        });
    }

    private async _handleNodeClick(nodeId: string): Promise<void> {
        try {
            Logger.info(`Node clicked: ${nodeId}`);
            
            // Find the node in current flowchart
            const node = this._currentFlowchart?.nodes.find((n: FlowNode) => n.id === nodeId);
            if (!node) {
                Logger.warn(`Node not found: ${nodeId}`);
                return;
            }

            // If node has source location, navigate to it
            if (node.data && 'sourceLocation' in node.data) {
                const sourceLocation = (node.data as any).sourceLocation;
                if (sourceLocation && sourceLocation.file) {
                    const uri = vscode.Uri.file(sourceLocation.file);
                    const document = await vscode.workspace.openTextDocument(uri);
                    const editor = await vscode.window.showTextDocument(document);
                    
                    if (sourceLocation.line !== undefined) {
                        const position = new vscode.Position(sourceLocation.line - 1, sourceLocation.column || 0);
                        editor.selection = new vscode.Selection(position, position);
                        editor.revealRange(new vscode.Range(position, position));
                    }
                }
            }
        } catch (error) {
            Logger.error(`Failed to handle node click: ${nodeId}`, error);
        }
    }

    private async _exportFlowchart(format: 'png' | 'svg' | 'json'): Promise<void> {
        try {
            if (!this._currentFlowchart) {
                vscode.window.showWarningMessage('No flowchart to export');
                return;
            }

            const defaultUri = vscode.Uri.file(`flowchart.${format}`);
            const uri = await vscode.window.showSaveDialog({
                defaultUri,
                filters: {
                    [format.toUpperCase()]: [format]
                }
            });

            if (!uri) {
                return;
            }

            let content: string;
            switch (format) {
                case 'json':
                    content = JSON.stringify(this._currentFlowchart, null, 2);
                    break;
                case 'svg':
                case 'png':
                    // Request export from webview
                    this._view?.webview.postMessage({
                        type: 'exportRequest',
                        format,
                        path: uri.fsPath
                    });
                    return;
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }

            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
            vscode.window.showInformationMessage(`Flowchart exported to ${uri.fsPath}`);
            
        } catch (error) {
            Logger.error('Failed to export flowchart', error);
            vscode.window.showErrorMessage(`Failed to export flowchart: ${error}`);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

        // Use a nonce to only allow a specific script to be run.
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src https:;">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet">
                <title>CodeFlow Pro</title>
            </head>
            <body>
                <div id="app">
                    <div class="header">
                        <h2>CodeFlow Pro</h2>
                        <div class="controls">
                            <button id="refreshBtn" title="Refresh Flowchart">🔄</button>
                            <button id="exportBtn" title="Export Flowchart">💾</button>
                            <button id="settingsBtn" title="Settings">⚙️</button>
                        </div>
                    </div>
                    
                    <div id="loading" class="loading hidden">
                        <div class="spinner"></div>
                        <p>Loading...</p>
                    </div>
                    
                    <div id="error" class="error hidden">
                        <p>Error loading flowchart</p>
                        <button id="retryBtn">Retry</button>
                    </div>
                    
                    <div id="flowchart-container">
                        <div id="flowchart"></div>
                    </div>
                    
                    <div id="sidebar" class="sidebar">
                        <div class="sidebar-content">
                            <h3>Node Details</h3>
                            <div id="node-details"></div>
                            
                            <h3>Complexity</h3>
                            <div id="complexity-info"></div>
                            
                            <h3>Security</h3>
                            <div id="security-info"></div>
                        </div>
                    </div>
                </div>
                
                <script nonce="${nonce}" src="${webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'webview-api.js'))}"></script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }

    public dispose(): void {
        Logger.info('FlowchartProvider disposed');
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