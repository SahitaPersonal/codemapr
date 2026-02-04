import * as vscode from 'vscode';
import { Logger } from '../utils/Logger';

export interface WebviewMessage {
    type: string;
    data?: any;
    error?: string;
    requestId?: string;
}

export class WebviewManager {
    private static readonly WEBVIEW_TYPE = 'codeflow-pro-webview';
    private webviewPanels = new Map<string, vscode.WebviewPanel>();
    private messageHandlers = new Map<string, (message: WebviewMessage) => Promise<any>>();

    constructor(private readonly extensionUri: vscode.Uri) {}

    /**
     * Create or show a webview panel
     */
    public async createOrShowWebview(
        title: string,
        viewColumn: vscode.ViewColumn = vscode.ViewColumn.Two,
        options: {
            enableScripts?: boolean;
            retainContextWhenHidden?: boolean;
            localResourceRoots?: vscode.Uri[];
        } = {}
    ): Promise<vscode.WebviewPanel> {
        const panelId = this.generatePanelId(title);
        
        // Check if panel already exists
        const existingPanel = this.webviewPanels.get(panelId);
        if (existingPanel) {
            existingPanel.reveal(viewColumn);
            return existingPanel;
        }

        // Create new panel
        const panel = vscode.window.createWebviewPanel(
            WebviewManager.WEBVIEW_TYPE,
            title,
            viewColumn,
            {
                enableScripts: options.enableScripts ?? true,
                retainContextWhenHidden: options.retainContextWhenHidden ?? true,
                localResourceRoots: options.localResourceRoots ?? [this.extensionUri]
            }
        );

        // Set up message handling
        this.setupMessageHandling(panel, panelId);

        // Store panel reference
        this.webviewPanels.set(panelId, panel);

        // Clean up when panel is disposed
        panel.onDidDispose(() => {
            this.webviewPanels.delete(panelId);
            Logger.info(`Webview panel disposed: ${panelId}`);
        });

        Logger.info(`Webview panel created: ${panelId}`);
        return panel;
    }

    /**
     * Send message to a specific webview panel
     */
    public async sendMessage(panelId: string, message: WebviewMessage): Promise<void> {
        const panel = this.webviewPanels.get(panelId);
        if (!panel) {
            throw new Error(`Webview panel not found: ${panelId}`);
        }

        try {
            await panel.webview.postMessage(message);
            Logger.debug(`Message sent to webview ${panelId}:`, message.type);
        } catch (error) {
            Logger.error(`Failed to send message to webview ${panelId}:`, error);
            throw error;
        }
    }

    /**
     * Send message to all webview panels
     */
    public async broadcastMessage(message: WebviewMessage): Promise<void> {
        const promises = Array.from(this.webviewPanels.entries()).map(([panelId, panel]) => {
            return Promise.resolve(panel.webview.postMessage(message)).catch((error: any) => {
                Logger.error(`Failed to broadcast message to webview ${panelId}:`, error);
            });
        });

        await Promise.allSettled(promises);
        Logger.debug(`Message broadcasted to ${promises.length} webview panels:`, message.type);
    }

    /**
     * Register a message handler
     */
    public registerMessageHandler(messageType: string, handler: (message: WebviewMessage) => Promise<any>): void {
        this.messageHandlers.set(messageType, handler);
        Logger.debug(`Message handler registered: ${messageType}`);
    }

    /**
     * Unregister a message handler
     */
    public unregisterMessageHandler(messageType: string): void {
        this.messageHandlers.delete(messageType);
        Logger.debug(`Message handler unregistered: ${messageType}`);
    }

    /**
     * Get HTML content for webview
     */
    public getWebviewContent(
        webview: vscode.Webview,
        options: {
            title?: string;
            scriptPaths?: string[];
            stylePaths?: string[];
            additionalMeta?: string[];
        } = {}
    ): string {
        const {
            title = 'CodeFlow Pro',
            scriptPaths = ['media/main.js'],
            stylePaths = ['media/main.css'],
            additionalMeta = []
        } = options;

        // Convert paths to webview URIs
        const scriptUris = scriptPaths.map(path => 
            webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, path))
        );
        const styleUris = stylePaths.map(path => 
            webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, path))
        );

        // Generate nonce for security
        const nonce = this.generateNonce();

        // Build CSP
        const csp = this.buildContentSecurityPolicy(webview, nonce);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${additionalMeta.join('\n    ')}
    
    ${styleUris.map(uri => `<link href="${uri}" rel="stylesheet">`).join('\n    ')}
    
    <title>${title}</title>
</head>
<body>
    <div id="app">
        <div class="loading-container">
            <div class="spinner"></div>
            <p>Loading CodeFlow Pro...</p>
        </div>
    </div>
    
    ${scriptUris.map(uri => `<script nonce="${nonce}" src="${uri}"></script>`).join('\n    ')}
</body>
</html>`;
    }

    /**
     * Close a specific webview panel
     */
    public closeWebview(panelId: string): void {
        const panel = this.webviewPanels.get(panelId);
        if (panel) {
            panel.dispose();
        }
    }

    /**
     * Close all webview panels
     */
    public closeAllWebviews(): void {
        for (const panel of this.webviewPanels.values()) {
            panel.dispose();
        }
        this.webviewPanels.clear();
    }

    /**
     * Get all active webview panel IDs
     */
    public getActiveWebviewIds(): string[] {
        return Array.from(this.webviewPanels.keys());
    }

    /**
     * Check if a webview panel exists
     */
    public hasWebview(panelId: string): boolean {
        return this.webviewPanels.has(panelId);
    }

    private setupMessageHandling(panel: vscode.WebviewPanel, panelId: string): void {
        panel.webview.onDidReceiveMessage(
            async (message: WebviewMessage) => {
                try {
                    Logger.debug(`Message received from webview ${panelId}:`, message.type);

                    const handler = this.messageHandlers.get(message.type);
                    if (handler) {
                        const result = await handler(message);
                        
                        // Send response if request has an ID
                        if (message.requestId) {
                            await panel.webview.postMessage({
                                type: `${message.type}_response`,
                                data: result,
                                requestId: message.requestId
                            });
                        }
                    } else {
                        Logger.warn(`No handler found for message type: ${message.type}`);
                        
                        // Send error response if request has an ID
                        if (message.requestId) {
                            await panel.webview.postMessage({
                                type: `${message.type}_response`,
                                error: `No handler found for message type: ${message.type}`,
                                requestId: message.requestId
                            });
                        }
                    }
                } catch (error) {
                    Logger.error(`Error handling message from webview ${panelId}:`, error);
                    
                    // Send error response if request has an ID
                    if (message.requestId) {
                        await panel.webview.postMessage({
                            type: `${message.type}_response`,
                            error: error instanceof Error ? error.message : String(error),
                            requestId: message.requestId
                        });
                    }
                }
            },
            undefined,
            []
        );
    }

    private generatePanelId(title: string): string {
        return `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    }

    private generateNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private buildContentSecurityPolicy(webview: vscode.Webview, nonce: string): string {
        const cspParts = [
            `default-src 'none'`,
            `img-src ${webview.cspSource} https: data:`,
            `script-src 'nonce-${nonce}'`,
            `style-src ${webview.cspSource} 'unsafe-inline'`,
            `font-src ${webview.cspSource}`,
            `connect-src https: http: ws: wss:`
        ];

        return cspParts.join('; ');
    }

    public dispose(): void {
        this.closeAllWebviews();
        this.messageHandlers.clear();
        Logger.info('WebviewManager disposed');
    }
}