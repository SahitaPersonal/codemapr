const fs = require('fs');

// Read the test file
const sourceCode = fs.readFileSync('test-complexity.js', 'utf8');

// Test data
const testData = {
  filePath: 'test-complexity.js',
  sourceCode: sourceCode
};

// Make API request
fetch('http://localhost:3001/analysis/complexity/file', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData)
})
.then(response => response.json())
.then(data => {
  console.log('Complexity Analysis Results:');
  console.log('============================');
  console.log('File:', data.filePath);
  console.log('Metrics:', JSON.stringify(data.metrics, null, 2));
  console.log('Functions:', data.functions.length);
  console.log('Classes:', data.classes.length);
  console.log('Issues:', data.issues.length);
  console.log('Recommendations:', data.recommendations.length);
  
  if (data.functions.length > 0) {
    console.log('\nFunction Details:');
    data.functions.forEach(fn => {
      console.log(`- ${fn.name}: Cyclomatic=${fn.cyclomaticComplexity}, Cognitive=${fn.cognitiveComplexity}, LOC=${fn.linesOfCode}`);
    });
  }
  
  if (data.issues.length > 0) {
    console.log('\nCode Issues:');
    data.issues.forEach(issue => {
      console.log(`- ${issue.severity.toUpperCase()}: ${issue.message} (Line ${issue.line})`);
    });
  }
  
  if (data.recommendations.length > 0) {
    console.log('\nRecommendations:');
    data.recommendations.forEach(rec => {
      console.log(`- ${rec}`);
    });
  }
})
.catch(error => {
  console.error('Error:', error);
});