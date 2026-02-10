const axios = require('axios');
const fs = require('fs');

async function testExtensionFlow() {
    try {
        const filePath = 'test-extension.ts';
        const content = fs.readFileSync(filePath, 'utf8');

        console.log('Step 1: Testing file analysis...');
        const analysisResponse = await axios.post('http://localhost:3001/analysis/file', {
            filePath: filePath,
            content: content,
            language: 'typescript'
        });
        
        console.log('✓ Analysis successful');
        console.log('Analysis data keys:', Object.keys(analysisResponse.data));

        console.log('\nStep 2: Testing flowchart generation...');
        console.log('Request payload:');
        const payload = {
            type: 'file_specific',
            filePath: filePath,
            analysisData: analysisResponse.data,
            layoutAlgorithm: 'hierarchical',
            layoutDirection: 'TB'
        };
        console.log(JSON.stringify(payload, null, 2));

        const flowchartResponse = await axios.post('http://localhost:3001/flowchart/generate', payload);
        
        console.log('\n✓ Flowchart generation successful!');
        console.log('Flowchart nodes:', flowchartResponse.data.flowchart.nodes.length);
        console.log('Flowchart edges:', flowchartResponse.data.flowchart.edges.length);

    } catch (error) {
        console.error('\n❌ Error occurred:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error data:', JSON.stringify(error.response.data, null, 2));
            console.error('Headers:', error.response.headers);
        } else {
            console.error('Error message:', error.message);
        }
    }
}

testExtensionFlow();