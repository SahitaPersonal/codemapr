const axios = require('axios');

async function testExtensionFlow() {
    try {
        console.log('Testing extension flow...');
        
        // Step 1: Analyze a file
        console.log('\n1. Testing file analysis...');
        const analysisResponse = await axios.post('http://localhost:3001/analysis/file', {
            filePath: 'test.ts',
            content: 'function hello() { return "world"; }',
            language: 'typescript'
        });
        console.log('✅ Analysis successful:', {
            filePath: analysisResponse.data.filePath,
            language: analysisResponse.data.language,
            functionsCount: analysisResponse.data.functions?.length || 0,
            complexity: analysisResponse.data.complexity
        });

        // Step 2: Generate flowchart
        console.log('\n2. Testing flowchart generation...');
        const flowchartResponse = await axios.post('http://localhost:3001/flowchart/generate', {
            type: 'file_specific',
            filePath: 'test.ts',
            analysisData: analysisResponse.data,
            layout: {
                algorithm: 'hierarchical',
                direction: 'top_bottom'
            },
            theme: 'light'
        });
        console.log('✅ Flowchart successful:', {
            nodeCount: flowchartResponse.data.flowchart?.nodes?.length || 0,
            edgeCount: flowchartResponse.data.flowchart?.edges?.length || 0,
            processingTime: flowchartResponse.data.processingTime
        });

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        if (error.response?.status) {
            console.error('Status:', error.response.status);
        }
        if (error.response?.data) {
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testExtensionFlow();