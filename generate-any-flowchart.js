const axios = require('axios');
const fs = require('fs');

// ============================================
// CONFIGURATION - CHANGE THIS TO YOUR FILE
// ============================================
const FILE_TO_ANALYZE = 'packages/backend/src/compression/compression.controller.ts';
const OUTPUT_FILE = 'compression-controller-flowchart.json';
const OUTPUT_MARKDOWN = 'compression-controller-flowchart.md';
// ============================================

async function generateFlowchart() {
    try {
        console.log(`\n📊 Generating flowchart for: ${FILE_TO_ANALYZE}\n`);

        // Check if file exists
        if (!fs.existsSync(FILE_TO_ANALYZE)) {
            console.error(`❌ File not found: ${FILE_TO_ANALYZE}`);
            return;
        }

        const content = fs.readFileSync(FILE_TO_ANALYZE, 'utf8');

        console.log('Step 1: Analyzing file...');
        const analysisResponse = await axios.post('http://localhost:3001/analysis/file', {
            filePath: FILE_TO_ANALYZE,
            content: content,
            language: 'typescript'
        });
        
        const analysis = analysisResponse.data;
        console.log(`✓ Analysis complete:`);
        console.log(`  - Functions: ${analysis.functions?.length || 0}`);
        console.log(`  - Classes: ${analysis.classes?.length || 0}`);
        console.log(`  - Imports: ${analysis.imports?.length || 0}`);
        console.log(`  - Exports: ${analysis.exports?.length || 0}`);
        console.log(`  - Complexity: ${analysis.complexity?.cyclomatic || 'N/A'}`);

        console.log('\nStep 2: Generating flowchart...');
        const flowchartResponse = await axios.post('http://localhost:3001/flowchart/generate', {
            type: 'file_specific',
            filePath: FILE_TO_ANALYZE,
            analysisData: analysis,
            layoutAlgorithm: 'hierarchical',
            layoutDirection: 'TB'
        });

        const flowchart = flowchartResponse.data.flowchart;
        console.log(`✓ Flowchart generated:`);
        console.log(`  - Nodes: ${flowchart.nodes.length}`);
        console.log(`  - Edges: ${flowchart.edges.length}`);

        // Save flowchart JSON
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(flowchart, null, 2));
        console.log(`\n✓ Flowchart JSON saved to: ${OUTPUT_FILE}`);

        // Generate Markdown documentation
        const markdown = generateMarkdown(flowchart, analysis);
        fs.writeFileSync(OUTPUT_MARKDOWN, markdown);
        console.log(`✓ Flowchart documentation saved to: ${OUTPUT_MARKDOWN}`);

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('FLOWCHART SUMMARY');
        console.log('='.repeat(60));
        console.log(`File: ${flowchart.name}`);
        console.log(`Type: ${flowchart.type}`);
        console.log(`Total Nodes: ${flowchart.metadata.totalNodes}`);
        console.log(`Total Edges: ${flowchart.metadata.totalEdges}`);
        console.log(`Max Depth: ${flowchart.metadata.maxDepth}`);
        
        console.log('\n' + '-'.repeat(60));
        console.log('NODES');
        console.log('-'.repeat(60));
        flowchart.nodes.forEach((node, index) => {
            const complexity = node.data.complexity || 'N/A';
            const complexityLabel = typeof complexity === 'number' 
                ? (complexity > 10 ? '🔴 HIGH' : complexity > 5 ? '🟡 MEDIUM' : '🟢 LOW')
                : '';
            console.log(`${index + 1}. ${node.data.label}`);
            console.log(`   Type: ${node.type} | Complexity: ${complexity} ${complexityLabel}`);
            if (node.data.sourceLocation) {
                console.log(`   Location: Line ${node.data.sourceLocation.startLine}-${node.data.sourceLocation.endLine}`);
            }
        });

        console.log('\n' + '-'.repeat(60));
        console.log('EDGES (Relationships)');
        console.log('-'.repeat(60));
        flowchart.edges.forEach((edge, index) => {
            const sourceNode = flowchart.nodes.find(n => n.id === edge.source);
            const targetNode = flowchart.nodes.find(n => n.id === edge.target);
            console.log(`${index + 1}. ${sourceNode?.data.label || edge.source} → ${targetNode?.data.label || edge.target}`);
            console.log(`   Type: ${edge.type}`);
        });

        console.log('\n' + '='.repeat(60));
        console.log('✅ COMPLETE!');
        console.log('='.repeat(60));
        console.log(`\nView the flowchart:`);
        console.log(`  - JSON: ${OUTPUT_FILE}`);
        console.log(`  - Documentation: ${OUTPUT_MARKDOWN}`);

    } catch (error) {
        console.error('\n❌ Error occurred:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error:', JSON.stringify(error.response.data, null, 2));
        } else if (error.code === 'ECONNREFUSED') {
            console.error('Cannot connect to backend. Make sure it\'s running:');
            console.error('  cd packages/backend');
            console.error('  npm run start:debug');
        } else {
            console.error('Error:', error.message);
        }
    }
}

function generateMarkdown(flowchart, analysis) {
    let md = `# Flowchart: ${flowchart.name}\n\n`;
    md += `**Generated:** ${new Date().toISOString()}\n\n`;
    md += `## Overview\n\n`;
    md += `- **File:** ${flowchart.name}\n`;
    md += `- **Type:** ${flowchart.type}\n`;
    md += `- **Total Nodes:** ${flowchart.metadata.totalNodes}\n`;
    md += `- **Total Edges:** ${flowchart.metadata.totalEdges}\n`;
    md += `- **Max Depth:** ${flowchart.metadata.maxDepth}\n`;
    
    if (analysis.complexity) {
        md += `\n## Complexity Analysis\n\n`;
        md += `- **Cyclomatic Complexity:** ${analysis.complexity.cyclomatic}\n`;
        md += `- **Cognitive Complexity:** ${analysis.complexity.cognitive}\n`;
        md += `- **Maintainability Index:** ${analysis.complexity.maintainability?.toFixed(2) || 'N/A'}\n`;
        md += `- **Technical Debt:** ${analysis.complexity.technicalDebt} minutes\n`;
    }

    md += `\n## Structure Diagram\n\n`;
    md += '```\n';
    flowchart.nodes.forEach((node, index) => {
        const indent = '  '.repeat(Math.min(node.data.sourceLocation?.startLine || 0, 5) % 3);
        md += `${indent}[${node.type}] ${node.data.label}\n`;
    });
    md += '```\n';

    md += `\n## Nodes\n\n`;
    flowchart.nodes.forEach((node, index) => {
        md += `### ${index + 1}. ${node.data.label}\n\n`;
        md += `- **Type:** ${node.type}\n`;
        md += `- **ID:** ${node.id}\n`;
        if (node.data.complexity) {
            const level = node.data.complexity > 10 ? 'HIGH 🔴' : node.data.complexity > 5 ? 'MEDIUM 🟡' : 'LOW 🟢';
            md += `- **Complexity:** ${node.data.complexity} (${level})\n`;
        }
        if (node.data.sourceLocation) {
            md += `- **Location:** Lines ${node.data.sourceLocation.startLine}-${node.data.sourceLocation.endLine}\n`;
        }
        if (node.data.description) {
            md += `- **Description:** ${node.data.description}\n`;
        }
        md += '\n';
    });

    md += `## Edges (Relationships)\n\n`;
    flowchart.edges.forEach((edge, index) => {
        const sourceNode = flowchart.nodes.find(n => n.id === edge.source);
        const targetNode = flowchart.nodes.find(n => n.id === edge.target);
        md += `${index + 1}. **${sourceNode?.data.label || edge.source}** → **${targetNode?.data.label || edge.target}**\n`;
        md += `   - Type: ${edge.type}\n`;
        if (edge.data?.label) {
            md += `   - Label: ${edge.data.label}\n`;
        }
        md += '\n';
    });

    if (analysis.classes && analysis.classes.length > 0) {
        md += `## Classes\n\n`;
        analysis.classes.forEach(cls => {
            md += `### ${cls.name}\n\n`;
            md += `- **Methods:** ${cls.methods?.length || 0}\n`;
            md += `- **Properties:** ${cls.properties?.length || 0}\n`;
            md += `- **Location:** Lines ${cls.location?.start?.line}-${cls.location?.end?.line}\n`;
            
            if (cls.methods && cls.methods.length > 0) {
                md += `\n**Methods:**\n`;
                cls.methods.forEach(method => {
                    md += `- \`${method.name}()\` - Complexity: ${method.complexity || 'N/A'}\n`;
                });
            }
            md += '\n';
        });
    }

    if (analysis.functions && analysis.functions.length > 0) {
        md += `## Functions\n\n`;
        analysis.functions.forEach(func => {
            md += `### ${func.name}\n\n`;
            md += `- **Parameters:** ${func.parameters?.length || 0}\n`;
            md += `- **Return Type:** ${func.returnType || 'void'}\n`;
            md += `- **Async:** ${func.isAsync ? 'Yes' : 'No'}\n`;
            md += `- **Complexity:** ${func.complexity || 'N/A'}\n`;
            md += `- **Location:** Lines ${func.location?.start?.line}-${func.location?.end?.line}\n`;
            md += '\n';
        });
    }

    md += `## Recommendations\n\n`;
    const highComplexityNodes = flowchart.nodes.filter(n => n.data.complexity > 10);
    if (highComplexityNodes.length > 0) {
        md += `⚠️ **High Complexity Detected:**\n\n`;
        highComplexityNodes.forEach(node => {
            md += `- **${node.data.label}** (Complexity: ${node.data.complexity}) - Consider refactoring\n`;
        });
    } else {
        md += `✅ No high complexity issues detected.\n`;
    }

    return md;
}

// Run the script
generateFlowchart();
