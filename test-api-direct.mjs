// Test API directly
import fetch from 'node-fetch';

const testCode = `
export function add(a, b) {
  return a + b;
}

export class Calculator {
  multiply(x, y) {
    return x * y;
  }
}
`;

async function testAnalysis() {
  try {
    console.log('Testing analysis API...');
    const response = await fetch('http://localhost:3001/analysis/file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filePath: 'test.js',
        content: testCode,
        language: 'javascript',
      }),
    });

    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    console.log('\nSummary:');
    console.log('- Functions:', data.functions?.length || 0);
    console.log('- Classes:', data.classes?.length || 0);
    console.log('- Complexity:', data.complexity?.cyclomatic || 0);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAnalysis();
