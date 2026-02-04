# Change Log

All notable changes to the CodeFlow Pro VSCode extension will be documented in this file.

## [1.0.0] - 2026-02-04

### Added
- Initial release of CodeFlow Pro VSCode extension
- Interactive flowchart generation for TypeScript, JavaScript, and React files
- Code complexity analysis with visual indicators
- Security vulnerability scanning and reporting
- Project-wide and file-specific flowchart generation
- Right-click context menu integration for file explorer and editor
- Configurable settings for API URL, auto-analysis, and file exclusions
- Multiple flowchart themes (Light, Dark, Ocean)
- Real-time webview with zoom and pan functionality
- Node-to-code navigation with source location mapping
- Comprehensive logging and error handling
- Export functionality for flowcharts (JSON, SVG, PNG)

### Features
- **Multi-language Support**: TypeScript (.ts), JavaScript (.js), React (.tsx/.jsx)
- **Interactive Flowcharts**: Click nodes to navigate to source code
- **Code Analysis**: Complexity metrics and security vulnerability detection
- **Smart Configuration**: Auto-analysis on save, file size limits, exclude patterns
- **Beautiful UI**: VSCode-themed webview with responsive design
- **Command Palette**: Full integration with VSCode command system
- **Keyboard Shortcuts**: Quick access to flowchart generation (Ctrl+Shift+F)

### Commands
- `codeflow-pro.generateFlowchart` - Generate flowchart for current file
- `codeflow-pro.generateProjectFlowchart` - Generate project overview flowchart
- `codeflow-pro.generateFileFlowchart` - Generate file-specific flowchart
- `codeflow-pro.analyzeComplexity` - Analyze code complexity metrics
- `codeflow-pro.scanSecurity` - Scan for security vulnerabilities
- `codeflow-pro.openSettings` - Open extension settings

### Configuration Options
- `codeflow-pro.apiUrl` - Backend API URL (default: http://localhost:3001)
- `codeflow-pro.autoAnalysis` - Enable auto-analysis on file save
- `codeflow-pro.showComplexityIndicators` - Show complexity in flowcharts
- `codeflow-pro.enableSecurityScanning` - Enable security scanning
- `codeflow-pro.flowchartTheme` - Default flowchart theme
- `codeflow-pro.maxFileSize` - Maximum file size for analysis
- `codeflow-pro.excludePatterns` - File patterns to exclude

### Technical Implementation
- TypeScript-based extension with full type safety
- Webview provider for interactive flowchart display
- HTTP client integration with CodeFlow Pro backend API
- Configuration management with real-time updates
- Comprehensive logging system with output channel
- Error handling with user-friendly messages
- File system integration with workspace management

### Supported File Types
- TypeScript files (.ts, .tsx)
- JavaScript files (.js, .jsx)
- React components and hooks
- Node.js modules (CommonJS and ES6)

### Requirements
- VSCode 1.74.0 or higher
- CodeFlow Pro backend service running (for analysis features)
- TypeScript/JavaScript project with supported file types