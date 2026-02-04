# CodeFlow Pro - VSCode Extension

Advanced code analysis and flowchart visualization for TypeScript, JavaScript, and React projects.

## Features

### 🔍 **Code Analysis**
- **Multi-language support**: TypeScript, JavaScript, React (TSX/JSX)
- **Dependency tracking**: Cross-file relationships and imports
- **Complexity analysis**: Cyclomatic complexity and maintainability metrics
- **Security scanning**: Vulnerability detection and risk assessment

### 📊 **Interactive Flowcharts**
- **Project overview**: Visualize entire project structure
- **File-specific**: Focus on individual file dependencies
- **Function flow**: Trace execution paths and logic flow
- **Real-time updates**: Auto-refresh on file changes

### 🎨 **Beautiful Visualization**
- **Multiple themes**: Light, Dark, and Ocean themes
- **Interactive nodes**: Click to navigate to source code
- **Complexity indicators**: Visual complexity scoring
- **Security highlights**: Vulnerability warnings and severity levels

### ⚙️ **Smart Configuration**
- **Auto-analysis**: Analyze files on save
- **Exclude patterns**: Skip node_modules, dist, build folders
- **File size limits**: Configurable analysis thresholds
- **Backend integration**: Connect to CodeFlow Pro API

## Quick Start

1. **Install the extension** from the VSCode Marketplace
2. **Open a TypeScript/JavaScript project** in VSCode
3. **Right-click on a file** and select "Generate Flowchart"
4. **View the interactive flowchart** in the CodeFlow Pro panel

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `CodeFlow Pro: Generate Flowchart` | `Ctrl+Shift+F` | Generate flowchart for current file |
| `CodeFlow Pro: Generate Project Flowchart` | `Ctrl+Shift+P` | Generate project overview flowchart |
| `CodeFlow Pro: Analyze Code Complexity` | - | Analyze complexity metrics |
| `CodeFlow Pro: Scan for Security Issues` | - | Run security vulnerability scan |
| `CodeFlow Pro: Open Settings` | - | Open extension settings |

## Context Menus

### File Explorer
- **Generate File Flowchart**: Right-click on `.ts`, `.js`, `.tsx`, `.jsx` files
- **Generate Project Flowchart**: Right-click on folders

### Editor
- **Generate File Flowchart**: Right-click in TypeScript/JavaScript files
- **Analyze Code Complexity**: Right-click to analyze current file
- **Scan for Security Issues**: Right-click to scan current file

## Configuration

Configure CodeFlow Pro through VSCode settings (`Ctrl+,` → search "codeflow-pro"):

```json
{
  "codeflow-pro.apiUrl": "http://localhost:3001",
  "codeflow-pro.autoAnalysis": true,
  "codeflow-pro.showComplexityIndicators": true,
  "codeflow-pro.enableSecurityScanning": true,
  "codeflow-pro.flowchartTheme": "light",
  "codeflow-pro.maxFileSize": 1048576,
  "codeflow-pro.excludePatterns": [
    "node_modules/**",
    "dist/**",
    "build/**",
    "*.min.js"
  ]
}
```

### Settings Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `apiUrl` | string | `http://localhost:3001` | CodeFlow Pro backend API URL |
| `autoAnalysis` | boolean | `true` | Enable automatic analysis on file save |
| `showComplexityIndicators` | boolean | `true` | Show complexity indicators in flowcharts |
| `enableSecurityScanning` | boolean | `true` | Enable security vulnerability scanning |
| `flowchartTheme` | string | `light` | Default flowchart theme (light/dark/ocean) |
| `maxFileSize` | number | `1048576` | Maximum file size for analysis (bytes) |
| `excludePatterns` | array | `["node_modules/**", ...]` | File patterns to exclude from analysis |

## Backend Setup

CodeFlow Pro requires a backend service for code analysis. 

### Local Development
1. Clone the CodeFlow Pro repository
2. Start the backend service: `npm run start:backend`
3. The extension will connect to `http://localhost:3001` by default

### Production Setup
1. Deploy the CodeFlow Pro backend to your server
2. Update the `codeflow-pro.apiUrl` setting to your backend URL
3. Ensure the backend is accessible from your development environment

## Supported File Types

- **TypeScript**: `.ts`, `.tsx`
- **JavaScript**: `.js`, `.jsx`
- **React**: Components and hooks in TSX/JSX files
- **Node.js**: CommonJS and ES6 modules

## Flowchart Types

### Project Flowchart
- Shows high-level project structure
- Displays module dependencies
- Identifies entry points and main flows

### File Flowchart
- Focuses on a single file's structure
- Shows functions, classes, and their relationships
- Displays imports and exports

### Function Flow
- Traces execution paths within functions
- Shows conditional branches and loops
- Identifies complexity hotspots

## Analysis Features

### Complexity Analysis
- **Cyclomatic Complexity**: Measures code complexity
- **Maintainability Index**: Assesses code maintainability
- **Technical Debt**: Identifies areas needing refactoring

### Security Scanning
- **SQL Injection**: Detects potential SQL injection vulnerabilities
- **XSS**: Identifies cross-site scripting risks
- **Command Injection**: Finds command execution vulnerabilities
- **Hardcoded Secrets**: Locates hardcoded passwords and keys

## Troubleshooting

### Extension Not Working
1. Check that the backend service is running
2. Verify the `apiUrl` setting points to the correct backend
3. Ensure the file types are supported (`.ts`, `.js`, `.tsx`, `.jsx`)
4. Check the VSCode Output panel for error messages

### Flowchart Not Generating
1. Verify the file is not excluded by `excludePatterns`
2. Check that the file size is within the `maxFileSize` limit
3. Ensure the file contains valid TypeScript/JavaScript code
4. Check the backend logs for analysis errors

### Performance Issues
1. Increase the `maxFileSize` limit if needed
2. Add large files to `excludePatterns`
3. Disable `autoAnalysis` for large projects
4. Use file-specific flowcharts instead of project-wide analysis

## Contributing

We welcome contributions to CodeFlow Pro! Please see our [Contributing Guide](https://github.com/SahitaPersonal/codemapr/blob/main/CONTRIBUTING.md) for details.

## License

This extension is licensed under the [MIT License](https://github.com/SahitaPersonal/codemapr/blob/main/LICENSE).

## Support

- **GitHub Issues**: [Report bugs and request features](https://github.com/SahitaPersonal/codemapr/issues)
- **Documentation**: [Full documentation](https://github.com/SahitaPersonal/codemapr/wiki)
- **Discussions**: [Community discussions](https://github.com/SahitaPersonal/codemapr/discussions)

---

**Enjoy using CodeFlow Pro!** 🚀