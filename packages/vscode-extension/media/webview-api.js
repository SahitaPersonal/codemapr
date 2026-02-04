// Enhanced VSCode Webview API
(function() {
    'use strict';
    
    const vscode = acquireVsCodeApi();
    
    class WebviewAPI {
        constructor() {
            this.requestId = 0;
            this.pendingRequests = new Map();
            this.eventListeners = new Map();
            
            // Listen for messages from extension
            window.addEventListener('message', this.handleMessage.bind(this));
        }
        
        /**
         * Send a message to the extension
         */
        sendMessage(type, data = null) {
            const message = {
                type,
                data,
                timestamp: Date.now()
            };
            
            vscode.postMessage(message);
        }
        
        /**
         * Send a request to the extension and wait for response
         */
        sendRequest(type, data = null, timeout = 30000) {
            return new Promise((resolve, reject) => {
                const requestId = `req_${++this.requestId}_${Date.now()}`;
                
                const message = {
                    type,
                    data,
                    requestId,
                    timestamp: Date.now()
                };
                
                // Store pending request
                const timeoutId = setTimeout(() => {
                    this.pendingRequests.delete(requestId);
                    reject(new Error(`Request timeout: ${type}`));
                }, timeout);
                
                this.pendingRequests.set(requestId, {
                    resolve,
                    reject,
                    timeoutId,
                    type
                });
                
                vscode.postMessage(message);
            });
        }
        
        /**
         * Register event listener for specific message types
         */
        on(eventType, callback) {
            if (!this.eventListeners.has(eventType)) {
                this.eventListeners.set(eventType, []);
            }
            this.eventListeners.get(eventType).push(callback);
        }
        
        /**
         * Unregister event listener
         */
        off(eventType, callback) {
            const listeners = this.eventListeners.get(eventType);
            if (listeners) {
                const index = listeners.indexOf(callback);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        }
        
        /**
         * Emit event to registered listeners
         */
        emit(eventType, data) {
            const listeners = this.eventListeners.get(eventType);
            if (listeners) {
                listeners.forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error(`Error in event listener for ${eventType}:`, error);
                    }
                });
            }
        }
        
        /**
         * Handle incoming messages from extension
         */
        handleMessage(event) {
            const message = event.data;
            
            if (!message || !message.type) {
                return;
            }
            
            // Handle response messages
            if (message.requestId && message.type.endsWith('_response')) {
                const pendingRequest = this.pendingRequests.get(message.requestId);
                if (pendingRequest) {
                    clearTimeout(pendingRequest.timeoutId);
                    this.pendingRequests.delete(message.requestId);
                    
                    if (message.error) {
                        pendingRequest.reject(new Error(message.error));
                    } else {
                        pendingRequest.resolve(message.data);
                    }
                }
                return;
            }
            
            // Emit event for regular messages
            this.emit(message.type, message.data);
        }
        
        /**
         * Get VSCode state
         */
        getState() {
            return vscode.getState();
        }
        
        /**
         * Set VSCode state
         */
        setState(state) {
            vscode.setState(state);
        }
        
        /**
         * Update VSCode state
         */
        updateState(updates) {
            const currentState = this.getState() || {};
            const newState = { ...currentState, ...updates };
            this.setState(newState);
            return newState;
        }
        
        /**
         * Show notification in VSCode
         */
        showNotification(message, type = 'info') {
            this.sendMessage('showNotification', { message, type });
        }
        
        /**
         * Show error message in VSCode
         */
        showError(message) {
            this.showNotification(message, 'error');
        }
        
        /**
         * Show warning message in VSCode
         */
        showWarning(message) {
            this.showNotification(message, 'warning');
        }
        
        /**
         * Show info message in VSCode
         */
        showInfo(message) {
            this.showNotification(message, 'info');
        }
        
        /**
         * Log message to VSCode output channel
         */
        log(level, message, ...args) {
            this.sendMessage('log', { level, message, args });
        }
        
        /**
         * Navigate to source location in VSCode
         */
        navigateToSource(filePath, line, column) {
            this.sendMessage('navigateToSource', { filePath, line, column });
        }
        
        /**
         * Request file content from VSCode
         */
        async getFileContent(filePath) {
            return this.sendRequest('getFileContent', { filePath });
        }
        
        /**
         * Request workspace information
         */
        async getWorkspaceInfo() {
            return this.sendRequest('getWorkspaceInfo');
        }
        
        /**
         * Request configuration values
         */
        async getConfiguration(section) {
            return this.sendRequest('getConfiguration', { section });
        }
        
        /**
         * Update configuration values
         */
        async updateConfiguration(section, key, value) {
            return this.sendRequest('updateConfiguration', { section, key, value });
        }
        
        /**
         * Export data to file
         */
        async exportToFile(data, filename, format = 'json') {
            return this.sendRequest('exportToFile', { data, filename, format });
        }
        
        /**
         * Import data from file
         */
        async importFromFile(filters) {
            return this.sendRequest('importFromFile', { filters });
        }
        
        /**
         * Clean up resources
         */
        dispose() {
            this.eventListeners.clear();
            
            // Reject all pending requests
            for (const [requestId, request] of this.pendingRequests) {
                clearTimeout(request.timeoutId);
                request.reject(new Error('WebviewAPI disposed'));
            }
            this.pendingRequests.clear();
        }
    }
    
    // Create global API instance
    window.webviewAPI = new WebviewAPI();
    
    // Notify extension that webview is ready
    window.webviewAPI.sendMessage('webviewReady');
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        window.webviewAPI.dispose();
    });
    
})();