const axios = require('axios');
const fs = require('fs');

async function generateFlowchart() {
    try {
        const filePath = 'packages/backend/src/analysis/analyzers/typescript.analyzer.ts';
        const content = fs.readFileSync(filePath, 'utf8');

        console.log('Step 1: Analyzing file...');
        const analysisResponse = await axios.post('http://localhost:3001/analysis/file', {
            filePath: filePath,
            content: content,
            language: 'typescript'
        });
        
        console.log(`✓ Analysis complete: Found ${analysisResponse.data.functions.length} functions, ${analysisResponse.data.classes.length} classes`);

        console.log('\nStep 2: Generating flowchart...');
        const flowchartResponse = await axios.post('http://localhost:3001/flowchart/generate', {
            type: 'file_specific',
            filePath: filePath,
            analysisData: analysisResponse.data,
            layoutAlgorithm: 'hierarchical',
            layoutDirection: 'TB'
        });

        const flowchart = flowchartResponse.data.flowchart;
        console.log(`✓ Flowchart generated: ${flowchart.nodes.length} nodes, ${flowchart.edges.length} edges`);

        // Save flowchart to file
        fs.writeFileSync('typescript-analyzer-flowchart.json', JSON.stringify(flowchart, null, 2));
        console.log('\n✓ Flowchart saved to: typescript-analyzer-flowchart.json');

        // Print summary
        console.log('\n=== FLOWCHART SUMMARY ===');
        console.log(`File: ${flowchart.name}`);
        console.log(`Type: ${flowchart.type}`);
        console.log(`Total Nodes: ${flowchart.metadata.totalNodes}`);
        console.log(`Total Edges: ${flowchart.metadata.totalEdges}`);
        console.log(`Max Depth: ${flowchart.metadata.maxDepth}`);
        
        console.log('\n=== NODES ===');
        flowchart.nodes.forEach(node => {
            console.log(`- ${node.data.label} (${node.type}) - Complexity: ${node.data.complexity || 'N/A'}`);
        });

        console.log('\n=== EDGES ===');
        flowchart.edges.forEach(edge => {
            const sourceNode = flowchart.nodes.find(n => n.id === edge.source);
            const targetNode = flowchart.nodes.find(n => n.id === edge.target);
            console.log(`- ${sourceNode?.data.label} → ${targetNode?.data.label} (${edge.type})`);
        });

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('Status:', error.response.status);
        }
    }
}

generateFlowchart();