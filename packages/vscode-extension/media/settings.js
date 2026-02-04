// Settings Panel JavaScript
(function() {
    'use strict';
    
    const vscode = acquireVsCodeApi();
    
    let currentConfig = {};
    
    // DOM elements
    let apiUrlInput, autoAnalysisInput, enableSecurityScanningInput;
    let showComplexityIndicatorsInput, flowchartThemeSelect, maxFileSizeInput;
    let excludePatternsTextarea, connectionStatusEl;
    let testConnectionBtn, resetBtn, exportBtn, importBtn;
    
    document.addEventListener('DOMContentLoaded', () => {
        initializeDOM();
        setupEventListeners();
        
        // Notify extension that settings webview is ready
        vscode.postMessage({ type: 'ready' });
    });
    
    function initializeDOM() {
        // Input elements
        apiUrlInput = document.getElementById('apiUrl');
        autoAnalysisInput = document.getElementById('autoAnalysis');
        enableSecurityScanningInput = document.getElementById('enableSecurityScanning');
        showComplexityIndicatorsInput = document.getElementById('showComplexityIndicators');
        flowchartThemeSelect = document.getElementById('flowchartTheme');
        maxFileSizeInput = document.getElementById('maxFileSize');
        excludePatternsTextarea = document.getElementById('excludePatterns');
        
        // Status and control elements
        connectionStatusEl = document.getElementById('connectionStatus');
        testConnectionBtn = document.getElementById('testConnectionBtn');
        resetBtn = document.getElementById('resetBtn');
        exportBtn = document.getElementById('exportBtn');
        importBtn = document.getElementById('importBtn');
    }
    
    function setupEventListeners() {
        // Input change listeners
        apiUrlInput.addEventListener('change', () => updateConfiguration('apiUrl', apiUrlInput.value));
        autoAnalysisInput.addEventListener('change', () => updateConfiguration('autoAnalysis', autoAnalysisInput.checked));
        enableSecurityScanningInput.addEventListener('change', () => updateConfiguration('enableSecurityScanning', enableSecurityScanningInput.checked));
        showComplexityIndicatorsInput.addEventListener('change', () => updateConfiguration('showComplexityIndicators', showComplexityIndicatorsInput.checked));
        flowchartThemeSelect.addEventListener('change', () => updateConfiguration('flowchartTheme', flowchartThemeSelect.value));
        maxFileSizeInput.addEventListener('change', () => updateConfiguration('maxFileSize', parseInt(maxFileSizeInput.value)));
        excludePatternsTextarea.addEventListener('change', () => {
            const patterns = excludePatternsTextarea.value.split('\n').filter(p => p.trim());
            updateConfiguration('excludePatterns', patterns);
        });
        
        // Button listeners
        testConnectionBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'testConnection' });
        });
        
        resetBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all settings to defaults?')) {
                vscode.postMessage({ type: 'resetConfiguration' });
            }
        });
        
        exportBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'exportSettings' });
        });
        
        importBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'importSettings' });
        });
    }
    
    function updateConfiguration(key, value) {
        vscode.postMessage({
            type: 'updateConfiguration',
            key,
            value
        });
    }
    
    function updateUI(config) {
        currentConfig = config;
        
        // Update input values
        apiUrlInput.value = config.apiUrl || 'http://localhost:3001';
        autoAnalysisInput.checked = config.autoAnalysis !== false;
        enableSecurityScanningInput.checked = config.enableSecurityScanning !== false;
        showComplexityIndicatorsInput.checked = config.showComplexityIndicators !== false;
        flowchartThemeSelect.value = config.flowchartTheme || 'light';
        maxFileSizeInput.value = config.maxFileSize || 1048576;
        
        // Update exclude patterns
        if (config.excludePatterns && Array.isArray(config.excludePatterns)) {
            excludePatternsTextarea.value = config.excludePatterns.join('\n');
        } else {
            excludePatternsTextarea.value = 'node_modules/**\ndist/**\nbuild/**\n*.min.js';
        }
    }
    
    function updateConnectionStatus(status, message, isError = false) {
        const indicator = connectionStatusEl.querySelector('.status-indicator');
        const text = connectionStatusEl.querySelector('.status-text');
        
        // Remove all status classes
        indicator.classList.remove('success', 'error', 'testing');
        
        if (status === 'testing') {
            indicator.classList.add('testing');
            text.textContent = message || 'Testing connection...';
        } else if (status === 'success') {
            indicator.classList.add('success');
            text.textContent = message || 'Connection successful';
        } else if (status === 'error') {
            indicator.classList.add('error');
            text.textContent = message || 'Connection failed';
        } else {
            text.textContent = message || 'Not tested';
        }
    }
    
    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.type) {
            case 'configurationUpdate':
                updateUI(message.data);
                break;
                
            case 'configurationUpdated':
                // Show brief success indication
                showTemporaryMessage(`Updated: ${message.key}`, 'success');
                break;
                
            case 'connectionTesting':
                updateConnectionStatus('testing', message.message);
                testConnectionBtn.disabled = true;
                break;
                
            case 'connectionTestResult':
                testConnectionBtn.disabled = false;
                if (message.success) {
                    updateConnectionStatus('success', 'Connection successful');
                    if (message.data) {
                        console.log('Backend info:', message.data);
                    }
                } else {
                    updateConnectionStatus('error', `Connection failed: ${message.error}`);
                }
                break;
                
            case 'error':
                showTemporaryMessage(message.message, 'error');
                break;
        }
    });
    
    function showTemporaryMessage(message, type = 'info') {
        // Create temporary message element
        const messageEl = document.createElement('div');
        messageEl.className = `temporary-message ${type}`;
        messageEl.textContent = message;
        
        // Style the message
        messageEl.style.cssText = `
            position: fixed;
            top: 16px;
            right: 16px;
            padding: 8px 12px;
            border-radius: 3px;
            font-size: 12px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        if (type === 'success') {
            messageEl.style.backgroundColor = 'var(--vscode-testing-iconPassed)';
            messageEl.style.color = 'white';
        } else if (type === 'error') {
            messageEl.style.backgroundColor = 'var(--vscode-inputValidation-errorBackground)';
            messageEl.style.color = 'var(--vscode-inputValidation-errorForeground)';
        } else {
            messageEl.style.backgroundColor = 'var(--vscode-panel-background)';
            messageEl.style.color = 'var(--vscode-foreground)';
            messageEl.style.border = '1px solid var(--vscode-panel-border)';
        }
        
        document.body.appendChild(messageEl);
        
        // Remove after 3 seconds
        setTimeout(() => {
            messageEl.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 3000);
    }
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
})();