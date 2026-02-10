# How to Generate Flowcharts for Any File

## Quick Start

### Step 1: Make Sure Backend is Running

```bash
cd packages/backend
npm run start:debug
```

You should see: `🚀 CodeMapr Backend running on http://localhost:3001`

### Step 2: Generate Flowchart for Any File

**Option A: Edit the script and run**

1. Open `generate-any-flowchart.js`
2. Change line 6 to your file:
   ```javascript
   const FILE_TO_ANALYZE = 'path/to/your/file.ts';
   ```
3. Run:
   ```bash
   node generate-any-flowchart.js
   ```

**Option B: Quick one-liner (for any file)**

```bash
# Example: Generate flowchart for compression controller
node generate-any-flowchart.js
```

## Examples

### Example 1: Analyze Compression Controller

```javascript
// In generate-any-flowchart.js, change line 6:
const FILE_TO_ANALYZE = 'packages/backend/src/compression/compression.controller.ts';
```

Then run:
```bash
node generate-any-flowchart.js
```

Output:
- `compression-controller-flowchart.json` - Raw flowchart data
- `compression-controller-flowchart.md` - Human-readable documentation

### Example 2: Analyze Analysis Service

```javascript
const FILE_TO_ANALYZE = 'packages/backend/src/analysis/analysis.service.ts';
```

### Example 3: Analyze Any Frontend Component

```javascript
const FILE_TO_ANALYZE = 'packages/frontend/src/components/flowchart/FlowchartViewer.tsx';
```

### Example 4: Analyze Extension Code

```javascript
const FILE_TO_ANALYZE = 'packages/vscode-extension/src/services/CodeFlowProService.ts';
```

## What You Get

After running the script, you'll get:

### 1. JSON File (e.g., `compression-controller-flowchart.json`)
- Complete flowchart data
- Node positions
- Edge connections
- Metadata

### 2. Markdown Documentation (e.g., `compression-controller-flowchart.md`)
- Overview and statistics
- Complexity analysis
- Structure diagram
- Detailed node information
- Relationship mapping
- Recommendations

### 3. Console Output
```
📊 Generating flowchart for: packages/backend/src/compression/compression.controller.ts

Step 1: Analyzing file...
✓ Analysis complete:
  - Functions: 5
  - Classes: 1
  - Imports: 10
  - Exports: 1
  - Complexity: 15

Step 2: Generating flowchart...
✓ Flowchart generated:
  - Nodes: 8
  - Edges: 7

✓ Flowchart JSON saved to: compression-controller-flowchart.json
✓ Flowchart documentation saved to: compression-controller-flowchart.md

============================================================
FLOWCHART SUMMARY
============================================================
File: compression.controller.ts
Type: file_specific
Total Nodes: 8
Total Edges: 7
Max Depth: 3

------------------------------------------------------------
NODES
------------------------------------------------------------
1. CompressionController
   Type: class | Complexity: 15 🟡 MEDIUM
   Location: Line 1-50

2. compressData
   Type: function | Complexity: 3 🟢 LOW
   Location: Line 10-15

...
```

## Supported File Types

- TypeScript (`.ts`, `.tsx`)
- JavaScript (`.js`, `.jsx`)
- Any file with code structure

## Customization

You can customize the output by editing `generate-any-flowchart.js`:

```javascript
// Change output file names
const OUTPUT_FILE = 'my-custom-flowchart.json';
const OUTPUT_MARKDOWN = 'my-custom-flowchart.md';

// Change layout algorithm
layoutAlgorithm: 'hierarchical',  // or 'force_directed', 'circular', 'tree'

// Change layout direction
layoutDirection: 'TB',  // TB (top-bottom), LR (left-right), BT, RL
```

## Batch Processing (Multiple Files)

Want to generate flowcharts for multiple files? Create a batch script:

```javascript
// batch-generate-flowcharts.js
const files = [
    'packages/backend/src/compression/compression.controller.ts',
    'packages/backend/src/analysis/analysis.service.ts',
    'packages/backend/src/flowchart/flowchart.service.ts'
];

// Run generate-any-flowchart.js for each file
// (Implementation left as exercise)
```

## Troubleshooting

### "Cannot connect to backend"
- Make sure backend is running: `npm run start:debug` in `packages/backend`
- Check if it's on port 3001: `http://localhost:3001`

### "File not found"
- Check the file path is correct
- Use relative path from project root
- Example: `packages/backend/src/...`

### "Analysis failed"
- Make sure the file is valid TypeScript/JavaScript
- Check for syntax errors in the file
- Try a simpler file first

## Complete Source Code Flowchart

To get a **complete project flowchart** (all files), you would need to:

1. Analyze all files in the project
2. Generate a project-level flowchart

This is more complex and would require:
- Scanning all files in a directory
- Analyzing each file
- Combining results into a project analysis
- Generating a `project_overview` flowchart

Would you like me to create a script for that?

## Quick Reference

**Generate flowchart for current file:**
```bash
# 1. Edit generate-any-flowchart.js (line 6)
# 2. Run:
node generate-any-flowchart.js
```

**View results:**
- JSON: `[filename]-flowchart.json`
- Docs: `[filename]-flowchart.md`

**Backend must be running:**
```bash
cd packages/backend
npm run start:debug
```
