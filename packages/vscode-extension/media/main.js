// Enhanced VSCode Extension Webview JavaScript
(function() {
    'use strict';
    
    let currentFlowchart = null;
    let selectedNode = null;
    let isInitialized = false;
    
    // DOM elements
    let loadingEl, errorEl, flowchartEl, sidebarEl;
    let nodeDetailsEl, complexityInfoEl, securityInfoEl;
    let refreshBtn, exportBtn, settingsBtn, retryBtn;
    
    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        initializeDOM();
        setupEventListeners();
        setupWebviewAPI();
        showEmptyState();
        isInitialized = true;
    });
    
    function initializeDOM() {
        loadingEl = document.getElementById('loading');
        errorEl = document.getElementById('error');
        flowchartEl = document.getElementById('flowchart');
        sidebarEl = document.getElementById('sidebar');
        nodeDetailsEl = document.getElementById('node-details');
        complexityInfoEl = document.getElementById('complexity-info');
        securityInfoEl = document.getElementById('security-info');
        
        // Control buttons
        refreshBtn = document.getElementById('refreshBtn');
        exportBtn = document.getElementById('exportBtn');
        settingsBtn = document.getElementById('settingsBtn');
        retryBtn = document.getElementById('retryBtn');
    }
    
    function setupWebviewAPI() {
        if (!window.webviewAPI) {
            console.error('WebviewAPI not available');
            return;
        }
        
        // Register event listeners for messages from extension
        window.webviewAPI.on('updateFlowchart', updateFlowchart);
        window.webviewAPI.on('loading', (message) => showLoading(message));
        window.webviewAPI.on('error', (message) => showError(message));
        window.webviewAPI.on('complexityResults', showComplexityResults);
        window.webviewAPI.on('securityResults', showSecurityResults);
        window.webviewAPI.on('activeFileChanged', (filePath) => updateActiveFile(filePath));
        window.webviewAPI.on('exportRequest', (data) => handleExportRequest(data.format, data.path));
        window.webviewAPI.on('themeChanged', handleThemeChange);
        window.webviewAPI.on('configurationChanged', handleConfigurationChange);
    }
    function setupEventListeners() {
        if (!refreshBtn || !exportBtn || !settingsBtn || !retryBtn) {
            console.error('Control buttons not found');
            return;
        }
        
        refreshBtn.addEventListener('click', () => {
            window.webviewAPI.sendMessage('refreshFlowchart');
        });
        
        exportBtn.addEventListener('click', () => {
            showExportDialog();
        });
        
        settingsBtn.addEventListener('click', () => {
            window.webviewAPI.sendMessage('openSettings');
        });
        
        retryBtn.addEventListener('click', () => {
            window.webviewAPI.sendMessage('generateFlowchart');
        });
        
        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (sidebarEl && !sidebarEl.contains(e.target) && !e.target.closest('.react-flow__node')) {
                closeSidebar();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'r':
                        e.preventDefault();
                        window.webviewAPI.sendMessage('refreshFlowchart');
                        break;
                    case 's':
                        e.preventDefault();
                        showExportDialog();
                        break;
                    case 'Escape':
                        closeSidebar();
                        break;
                }
            }
        });
    }
    
    // Remove old message handling code
    // window.addEventListener('message', event => { ... });
    
    function updateFlowchart(flowchartData) {
        try {
            currentFlowchart = flowchartData;
            hideLoading();
            hideError();
            
            if (!flowchartData || !flowchartData.nodes || flowchartData.nodes.length === 0) {
                showEmptyState();
                return;
            }
            
            renderFlowchart(flowchartData);
        } catch (error) {
            console.error('Failed to update flowchart:', error);
            showError('Failed to render flowchart');
            vscode.postMessage({ type: 'error', error: error.message });
        }
    }
    
    function renderFlowchart(flowchartData) {
        // Clear existing content
        flowchartEl.innerHTML = '';
        
        // Create a simple SVG-based flowchart renderer
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', '0 0 800 600');
        
        // Add nodes
        flowchartData.nodes.forEach(node => {
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('class', 'flowchart-node');
            group.setAttribute('data-node-id', node.id);
            group.style.cursor = 'pointer';
            
            // Node rectangle
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', node.position.x);
            rect.setAttribute('y', node.position.y);
            rect.setAttribute('width', '120');
            rect.setAttribute('height', '60');
            rect.setAttribute('rx', '4');
            rect.setAttribute('fill', getNodeColor(node));
            rect.setAttribute('stroke', '#666');
            rect.setAttribute('stroke-width', '1');
            
            // Node label
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', node.position.x + 60);
            text.setAttribute('y', node.position.y + 35);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('fill', 'var(--vscode-foreground)');
            text.setAttribute('font-size', '11');
            text.textContent = truncateText(node.data.label, 15);
            
            group.appendChild(rect);
            group.appendChild(text);
            
            // Add click handler
            group.addEventListener('click', () => {
                selectNode(node);
            });
            
            svg.appendChild(group);
        });
        
        // Add edges
        flowchartData.edges.forEach(edge => {
            const sourceNode = flowchartData.nodes.find(n => n.id === edge.source);
            const targetNode = flowchartData.nodes.find(n => n.id === edge.target);
            
            if (sourceNode && targetNode) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', sourceNode.position.x + 60);
                line.setAttribute('y1', sourceNode.position.y + 60);
                line.setAttribute('x2', targetNode.position.x + 60);
                line.setAttribute('y2', targetNode.position.y);
                line.setAttribute('stroke', 'var(--vscode-foreground)');
                line.setAttribute('stroke-width', '1');
                line.setAttribute('marker-end', 'url(#arrowhead)');
                
                svg.appendChild(line);
            }
        });
        
        // Add arrow marker definition
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');
        
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', 'var(--vscode-foreground)');
        
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);
        
        flowchartEl.appendChild(svg);
        
        // Add zoom and pan functionality
        addZoomPanFunctionality(svg);
    }
    
    function getNodeColor(node) {
        if (node.data.security && node.data.security.vulnerabilities.length > 0) {
            return '#ff6b6b'; // Red for security issues
        }
        if (node.data.complexity && node.data.complexity > 10) {
            return '#ffa726'; // Orange for high complexity
        }
        if (node.data.performance && node.data.performance.score < 50) {
            return '#ffcc02'; // Yellow for performance issues
        }
        return 'var(--vscode-input-background)'; // Default color
    }
    
    function truncateText(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength - 3) + '...';
    }
    
    function selectNode(node) {
        selectedNode = node;
        showNodeDetails(node);
        openSidebar();
        
        // Highlight selected node
        document.querySelectorAll('.flowchart-node').forEach(el => {
            el.classList.remove('selected');
        });
        
        const nodeEl = document.querySelector(`[data-node-id="${node.id}"]`);
        if (nodeEl) {
            nodeEl.classList.add('selected');
        }
        
        // Notify extension about node selection
        window.webviewAPI.sendMessage('nodeClick', { nodeId: node.id });
    }
    
    function showNodeDetails(node) {
        nodeDetailsEl.innerHTML = `
            <div class="node-info">
                <strong>Name:</strong> ${node.data.label}
            </div>
            <div class="node-info">
                <strong>Type:</strong> ${node.type}
            </div>
            ${node.data.description ? `
                <div class="node-info">
                    <strong>Description:</strong> ${node.data.description}
                </div>
            ` : ''}
        `;
        
        // Show complexity info
        if (node.data.complexity !== undefined) {
            const complexityClass = getComplexityClass(node.data.complexity);
            complexityInfoEl.innerHTML = `
                <div class="complexity-score ${complexityClass}">
                    Complexity: ${node.data.complexity}
                </div>
            `;
        } else {
            complexityInfoEl.innerHTML = '<p>No complexity data available</p>';
        }
        
        // Show security info
        if (node.data.security && node.data.security.vulnerabilities.length > 0) {
            const vulnerabilities = node.data.security.vulnerabilities.map(vuln => `
                <div class="security-vulnerability ${vuln.severity}">
                    <strong>${vuln.type}</strong> (${vuln.severity})
                    <br>
                    ${vuln.description}
                </div>
            `).join('');
            
            securityInfoEl.innerHTML = vulnerabilities;
        } else {
            securityInfoEl.innerHTML = '<p>No security issues found</p>';
        }
    }
    
    function getComplexityClass(complexity) {
        if (complexity <= 5) return 'complexity-low';
        if (complexity <= 10) return 'complexity-medium';
        return 'complexity-high';
    }
    
    function showComplexityResults(complexity) {
        // Update complexity info in sidebar
        complexityInfoEl.innerHTML = `
            <div class="complexity-score ${getComplexityClass(complexity.overallComplexity)}">
                Overall: ${complexity.overallComplexity}
            </div>
            <div style="margin-top: 8px;">
                <strong>Functions:</strong>
                ${complexity.functions.map(func => `
                    <div style="margin: 4px 0; font-size: 10px;">
                        ${func.name}: ${func.complexity}
                    </div>
                `).join('')}
            </div>
        `;
        
        openSidebar();
    }
    
    function showSecurityResults(securityResults) {
        // Update security info in sidebar
        if (securityResults.vulnerabilities.length > 0) {
            const vulnerabilities = securityResults.vulnerabilities.map(vuln => `
                <div class="security-vulnerability ${vuln.severity}">
                    <strong>${vuln.type}</strong> (${vuln.severity})
                    <br>
                    ${vuln.description}
                    ${vuln.line ? `<br><small>Line ${vuln.line}</small>` : ''}
                </div>
            `).join('');
            
            securityInfoEl.innerHTML = `
                <div style="margin-bottom: 8px;">
                    <strong>Risk Score:</strong> ${securityResults.riskScore}/100
                </div>
                ${vulnerabilities}
            `;
        } else {
            securityInfoEl.innerHTML = '<p>No security issues found</p>';
        }
        
        openSidebar();
    }
    
    function openSidebar() {
        sidebarEl.classList.add('open');
    }
    
    function closeSidebar() {
        sidebarEl.classList.remove('open');
    }
    
    function showLoading(message = 'Loading...') {
        loadingEl.querySelector('p').textContent = message;
        loadingEl.classList.remove('hidden');
        errorEl.classList.add('hidden');
        flowchartEl.style.display = 'none';
    }
    
    function hideLoading() {
        loadingEl.classList.add('hidden');
        flowchartEl.style.display = 'block';
    }
    
    function showError(message) {
        errorEl.querySelector('p').textContent = message;
        errorEl.classList.remove('hidden');
        loadingEl.classList.add('hidden');
        flowchartEl.style.display = 'none';
    }
    
    function hideError() {
        errorEl.classList.add('hidden');
        flowchartEl.style.display = 'block';
    }
    
    function showEmptyState() {
        flowchartEl.innerHTML = `
            <div class="empty-state">
                <h3>No Flowchart Available</h3>
                <p>Select a TypeScript or JavaScript file and generate a flowchart to get started.</p>
                <button onclick="window.webviewAPI.sendMessage('generateFlowchart')">>
                    Generate Flowchart
                </button>
            </div>
        `;
    }
    
    function showExportDialog() {
        // Enhanced export dialog with more options
        const formats = ['json', 'svg', 'png'];
        const format = prompt(`Export format (${formats.join(', ')}):`, 'json');
        if (format && formats.includes(format.toLowerCase())) {
            window.webviewAPI.sendMessage('exportFlowchart', { format: format.toLowerCase() });
        }
    }
    
    function handleThemeChange(theme) {
        document.body.className = `theme-${theme}`;
        if (currentFlowchart) {
            renderFlowchart(currentFlowchart);
        }
    }
    
    function handleConfigurationChange(config) {
        // Update UI based on configuration changes
        if (config.showComplexityIndicators !== undefined) {
            document.body.classList.toggle('hide-complexity', !config.showComplexityIndicators);
        }
    }
    
    function updateActiveFile(filePath) {
        // Update UI to show current active file
        const header = document.querySelector('.header h2');
        if (header) {
            header.textContent = `CodeFlow Pro - ${filePath}`;
        }
    }
    
    function handleExportRequest(format, path) {
        // Handle export request from extension
        if (format === 'svg') {
            const svg = flowchartEl.querySelector('svg');
            if (svg) {
                const svgData = new XMLSerializer().serializeToString(svg);
                vscode.postMessage({
                    type: 'exportData',
                    format,
                    data: svgData,
                    path
                });
            }
        }
    }
    
    function addZoomPanFunctionality(svg) {
        let isMouseDown = false;
        let startX, startY, currentX = 0, currentY = 0, scale = 1;
        
        svg.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            startX = e.clientX - currentX;
            startY = e.clientY - currentY;
            svg.style.cursor = 'grabbing';
        });
        
        svg.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;
            
            currentX = e.clientX - startX;
            currentY = e.clientY - startY;
            
            svg.style.transform = `translate(${currentX}px, ${currentY}px) scale(${scale})`;
        });
        
        svg.addEventListener('mouseup', () => {
            isMouseDown = false;
            svg.style.cursor = 'grab';
        });
        
        svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            scale *= delta;
            scale = Math.max(0.1, Math.min(3, scale));
            
            svg.style.transform = `translate(${currentX}px, ${currentY}px) scale(${scale})`;
        });
        
        svg.style.cursor = 'grab';
    }
})();