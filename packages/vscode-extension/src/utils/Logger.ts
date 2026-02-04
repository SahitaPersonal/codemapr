import * as vscode from 'vscode';

export class Logger {
    private static outputChannel: vscode.OutputChannel;

    static initialize() {
        if (!Logger.outputChannel) {
            Logger.outputChannel = vscode.window.createOutputChannel('CodeFlow Pro');
        }
    }

    static info(message: string, ...args: any[]) {
        Logger.initialize();
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] INFO: ${message}`;
        
        Logger.outputChannel.appendLine(logMessage);
        
        if (args.length > 0) {
            Logger.outputChannel.appendLine(`  Args: ${JSON.stringify(args, null, 2)}`);
        }
        
        console.log(logMessage, ...args);
    }

    static warn(message: string, ...args: any[]) {
        Logger.initialize();
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] WARN: ${message}`;
        
        Logger.outputChannel.appendLine(logMessage);
        
        if (args.length > 0) {
            Logger.outputChannel.appendLine(`  Args: ${JSON.stringify(args, null, 2)}`);
        }
        
        console.warn(logMessage, ...args);
    }

    static error(message: string, error?: any) {
        Logger.initialize();
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ERROR: ${message}`;
        
        Logger.outputChannel.appendLine(logMessage);
        
        if (error) {
            const errorDetails = error instanceof Error 
                ? `${error.name}: ${error.message}\n${error.stack}`
                : JSON.stringify(error, null, 2);
            Logger.outputChannel.appendLine(`  Error: ${errorDetails}`);
        }
        
        console.error(logMessage, error);
    }

    static debug(message: string, ...args: any[]) {
        Logger.initialize();
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] DEBUG: ${message}`;
        
        Logger.outputChannel.appendLine(logMessage);
        
        if (args.length > 0) {
            Logger.outputChannel.appendLine(`  Args: ${JSON.stringify(args, null, 2)}`);
        }
        
        console.debug(logMessage, ...args);
    }

    static show() {
        Logger.initialize();
        Logger.outputChannel.show();
    }

    static dispose() {
        if (Logger.outputChannel) {
            Logger.outputChannel.dispose();
        }
    }
}