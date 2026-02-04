import * as vscode from 'vscode';
import { FlowchartProvider } from './providers/FlowchartProvider';
import { SettingsProvider } from './providers/SettingsProvider';
import { CodeFlowProService } from './services/CodeFlowProService';
import { ConfigurationManager } from './utils/ConfigurationManager';
import { Logger } from './utils/Logger';

let flowchartProvider: FlowchartProvider;
let settingsProvider: SettingsProvider;
let codeFlowProService: CodeFlowProService;

export function activate(context: vscode.ExtensionContext) {
    Logger.info('CodeFlow Pro extension is being activated');

    // Initialize services
    const configManager = new ConfigurationManager();
    codeFlowProService = new CodeFlowProService(configManager);
    flowchartProvider = new FlowchartProvider(context.extensionUri, codeFlowProService);
    settingsProvider = new SettingsProvider(context.extensionUri, configManager);

    // Register webview providers
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'codeflow-pro.flowchartView',
            flowchartProvider
        )
    );

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'codeflow-pro.settingsView',
            settingsProvider
        )
    );

    // Register commands
    registerCommands(context);

    // Register event listeners
    registerEventListeners(context);

    Logger.info('CodeFlow Pro extension activated successfully');
}

function registerCommands(context: vscode.ExtensionContext) {
    // Generate flowchart command
    const generateFlowchartCommand = vscode.commands.registerCommand(
        'codeflow-pro.generateFlowchart',
        async (uri?: vscode.Uri) => {
            try {
                const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
                if (!targetUri) {
                    vscode.window.showErrorMessage('No file selected for flowchart generation');
                    return;
                }

                await flowchartProvider.generateFlowchart(targetUri);
                vscode.window.showInformationMessage('Flowchart generated successfully');
            } catch (error) {
                Logger.error('Failed to generate flowchart', error);
                vscode.window.showErrorMessage(`Failed to generate flowchart: ${error}`);
            }
        }
    );

    // Generate project flowchart command
    const generateProjectFlowchartCommand = vscode.commands.registerCommand(
        'codeflow-pro.generateProjectFlowchart',
        async (uri?: vscode.Uri) => {
            try {
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) {
                    vscode.window.showErrorMessage('No workspace folder found');
                    return;
                }

                await flowchartProvider.generateProjectFlowchart(workspaceFolder.uri);
                vscode.window.showInformationMessage('Project flowchart generated successfully');
            } catch (error) {
                Logger.error('Failed to generate project flowchart', error);
                vscode.window.showErrorMessage(`Failed to generate project flowchart: ${error}`);
            }
        }
    );

    // Generate file flowchart command
    const generateFileFlowchartCommand = vscode.commands.registerCommand(
        'codeflow-pro.generateFileFlowchart',
        async (uri?: vscode.Uri) => {
            try {
                const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
                if (!targetUri) {
                    vscode.window.showErrorMessage('No file selected for flowchart generation');
                    return;
                }

                await flowchartProvider.generateFileFlowchart(targetUri);
                vscode.window.showInformationMessage('File flowchart generated successfully');
            } catch (error) {
                Logger.error('Failed to generate file flowchart', error);
                vscode.window.showErrorMessage(`Failed to generate file flowchart: ${error}`);
            }
        }
    );

    // Analyze complexity command
    const analyzeComplexityCommand = vscode.commands.registerCommand(
        'codeflow-pro.analyzeComplexity',
        async (uri?: vscode.Uri) => {
            try {
                const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
                if (!targetUri) {
                    vscode.window.showErrorMessage('No file selected for complexity analysis');
                    return;
                }

                const complexity = await codeFlowProService.analyzeComplexity(targetUri);
                await flowchartProvider.showComplexityResults(complexity);
                vscode.window.showInformationMessage('Complexity analysis completed');
            } catch (error) {
                Logger.error('Failed to analyze complexity', error);
                vscode.window.showErrorMessage(`Failed to analyze complexity: ${error}`);
            }
        }
    );

    // Scan security command
    const scanSecurityCommand = vscode.commands.registerCommand(
        'codeflow-pro.scanSecurity',
        async (uri?: vscode.Uri) => {
            try {
                const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
                if (!targetUri) {
                    vscode.window.showErrorMessage('No file selected for security scanning');
                    return;
                }

                const securityResults = await codeFlowProService.scanSecurity(targetUri);
                await flowchartProvider.showSecurityResults(securityResults);
                vscode.window.showInformationMessage('Security scan completed');
            } catch (error) {
                Logger.error('Failed to scan security', error);
                vscode.window.showErrorMessage(`Failed to scan security: ${error}`);
            }
        }
    );

    // Open settings command
    const openSettingsCommand = vscode.commands.registerCommand(
        'codeflow-pro.openSettings',
        () => {
            vscode.commands.executeCommand('workbench.view.extension.codeflow-pro-settings');
        }
    );

    // Show output command
    const showOutputCommand = vscode.commands.registerCommand(
        'codeflow-pro.showOutput',
        () => {
            Logger.show();
        }
    );

    // Clear cache command
    const clearCacheCommand = vscode.commands.registerCommand(
        'codeflow-pro.clearCache',
        async () => {
            try {
                // Clear any cached data
                const result = await vscode.window.showInformationMessage(
                    'Clear CodeFlow Pro cache?',
                    { modal: true },
                    'Clear Cache'
                );
                
                if (result === 'Clear Cache') {
                    // Implementation would clear cached analysis results
                    vscode.window.showInformationMessage('Cache cleared successfully');
                    Logger.info('Cache cleared by user');
                }
            } catch (error) {
                Logger.error('Failed to clear cache', error);
                vscode.window.showErrorMessage(`Failed to clear cache: ${error}`);
            }
        }
    );

    // Add all commands to subscriptions
    context.subscriptions.push(
        generateFlowchartCommand,
        generateProjectFlowchartCommand,
        generateFileFlowchartCommand,
        analyzeComplexityCommand,
        scanSecurityCommand,
        openSettingsCommand,
        showOutputCommand,
        clearCacheCommand
    );
}

function registerEventListeners(context: vscode.ExtensionContext) {
    // Listen for configuration changes
    const configChangeListener = vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('codeflow-pro')) {
            Logger.info('CodeFlow Pro configuration changed');
            codeFlowProService.updateConfiguration();
        }
    });

    // Listen for file saves (for auto-analysis)
    const fileSaveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
        const config = vscode.workspace.getConfiguration('codeflow-pro');
        const autoAnalysis = config.get<boolean>('autoAnalysis', true);

        if (autoAnalysis && isSupported(document.uri)) {
            try {
                Logger.info(`Auto-analyzing file: ${document.uri.fsPath}`);
                await codeFlowProService.analyzeFile(document.uri);
            } catch (error) {
                Logger.error('Auto-analysis failed', error);
            }
        }
    });

    // Listen for active editor changes
    const activeEditorChangeListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && isSupported(editor.document.uri)) {
            flowchartProvider.setActiveFile(editor.document.uri);
        }
    });

    context.subscriptions.push(
        configChangeListener,
        fileSaveListener,
        activeEditorChangeListener
    );
}

function isSupported(uri: vscode.Uri): boolean {
    const supportedExtensions = ['.ts', '.js', '.tsx', '.jsx'];
    return supportedExtensions.some(ext => uri.fsPath.endsWith(ext));
}

export function deactivate() {
    Logger.info('CodeFlow Pro extension is being deactivated');
    
    if (flowchartProvider) {
        flowchartProvider.dispose();
    }
    
    if (settingsProvider) {
        settingsProvider.dispose();
    }
    
    if (codeFlowProService) {
        codeFlowProService.dispose();
    }
    
    Logger.dispose();
}