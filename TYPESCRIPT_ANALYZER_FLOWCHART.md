# TypeScript Analyzer Flowchart

## File: `typescript.analyzer.ts`

### Overview
- **Total Nodes**: 15
- **Total Edges**: 14
- **Max Depth**: 2
- **Overall Complexity**: 53 (High - needs refactoring)

---

## Structure Diagram

```
typescript.analyzer.ts (File)
│   Complexity: 53
│
└── TypeScriptAnalyzer (Class)
    │
    ├── analyzeFile() [Complexity: 11 - Medium]
    │   └── Main entry point for file analysis
    │
    ├── extractImportDeclaration() [Complexity: 6 - Low]
    │   └── Extracts import statements
    │
    ├── extractExportDeclaration() [Complexity: 4 - Low]
    │   └── Extracts export statements
    │
    ├── extractFunctionDeclaration() [Complexity: 1 - Low]
    │   └── Extracts function declarations
    │
    ├── extractClassDeclaration() [Complexity: 3 - Low]
    │   └── Extracts class declarations
    │
    ├── extractMethodDeclaration() [Complexity: 1 - Low]
    │   └── Extracts method declarations
    │
    ├── extractPropertyDeclaration() [Complexity: 1 - Low]
    │   └── Extracts property declarations
    │
    ├── extractSymbol() [Complexity: 4 - Low]
    │   └── Extracts symbols (variables, properties, methods)
    │
    ├── getSourceLocation() [Complexity: 1 - Low]
    │   └── Gets source code location information
    │
    ├── getVisibility() [Complexity: 3 - Low]
    │   └── Determines visibility (public/private/protected)
    │
    ├── getLanguageFromPath() [Complexity: 4 - Low]
    │   └── Detects language from file path
    │
    ├── calculateComplexity() [Complexity: 13 - High]
    │   └── Calculates cyclomatic complexity for entire file
    │
    └── calculateFunctionComplexity() [Complexity: 13 - High]
        └── Calculates cyclomatic complexity for functions
```

---

## Complexity Analysis

### High Complexity Functions (Need Refactoring)
1. **analyzeFile()** - Complexity: 11
   - Main analysis function with multiple branches
   - Recommendation: Break down into smaller functions

2. **calculateComplexity()** - Complexity: 13
   - Complex switch statement for AST traversal
   - Recommendation: Extract complexity calculation logic

3. **calculateFunctionComplexity()** - Complexity: 13
   - Similar to calculateComplexity with nested logic
   - Recommendation: Refactor to reduce branching

### Medium Complexity Functions
1. **extractImportDeclaration()** - Complexity: 6
   - Handles multiple import types
   - Acceptable complexity level

### Low Complexity Functions (Good)
- extractFunctionDeclaration() - Complexity: 1
- extractMethodDeclaration() - Complexity: 1
- extractPropertyDeclaration() - Complexity: 1
- getSourceLocation() - Complexity: 1
- extractExportDeclaration() - Complexity: 4
- extractClassDeclaration() - Complexity: 3
- getVisibility() - Complexity: 3
- extractSymbol() - Complexity: 4
- getLanguageFromPath() - Complexity: 4

---

## Method Flow

### Main Analysis Flow
```
analyzeFile()
    ↓
Create TypeScript SourceFile
    ↓
Walk AST (visit function)
    ↓
    ├→ ImportDeclaration → extractImportDeclaration()
    ├→ ExportDeclaration → extractExportDeclaration()
    ├→ FunctionDeclaration → extractFunctionDeclaration()
    ├→ ClassDeclaration → extractClassDeclaration()
    └→ VariableDeclaration → extractSymbol()
    ↓
calculateComplexity()
    ↓
Return FileAnalysis
```

### Helper Methods
- **getSourceLocation()**: Used by all extract methods to get code location
- **getVisibility()**: Used by extractPropertyDeclaration()
- **getLanguageFromPath()**: Used by analyzeFile()
- **calculateFunctionComplexity()**: Used by extractFunctionDeclaration() and extractMethodDeclaration()

---

## Recommendations

### 1. Refactor High Complexity Functions
- **analyzeFile()**: Extract the AST walking logic into a separate method
- **calculateComplexity()**: Create a complexity calculator class
- **calculateFunctionComplexity()**: Share logic with calculateComplexity()

### 2. Improve Maintainability
- Current maintainability index: ~100 (Good)
- Technical debt: 43 points (High complexity - 10)

### 3. Code Organization
- Consider splitting into multiple files:
  - `typescript.analyzer.ts` - Main analyzer
  - `ast-extractor.ts` - AST extraction methods
  - `complexity-calculator.ts` - Complexity calculation
  - `source-location.helper.ts` - Location utilities

---

## Dependencies

### External Dependencies
- `@nestjs/common` - Injectable, Logger
- `typescript` - TypeScript compiler API
- `@codemapr/shared` - Shared types

### Internal Dependencies
- None (standalone analyzer)

---

## Full Flowchart Data
The complete flowchart data has been saved to: `typescript-analyzer-flowchart.json`

You can visualize this in the VSCode extension or the web application!
