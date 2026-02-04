const fs = require('fs');

// Read the test file
const sourceCode = fs.readFileSync('test-complexity.js', 'utf8');

// Test data
const testData = {
  filePath: 'test-complexity.js',
  sourceCode: sourceCode,
  executionTime: 250,
  memoryUsage: 45,
  cpuUsage: 75
};

// Make API request
fetch('http://localhost:3001/analysis/performance/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData)
})
.then(response => response.json())
.then(data => {
  console.log('Performance Analysis Results:');
  console.log('============================');
  console.log('File:', data.filePath);
  console.log('Performance Score:', data.performanceScore);
  console.log('Execution Time:', data.executionTime + 'ms');
  console.log('Memory Usage:', data.memoryUsage + 'MB');
  console.log('CPU Usage:', data.cpuUsage + '%');
  console.log('Is Bottleneck:', data.isBottleneck);
  console.log('Bottlenecks:', data.bottlenecks.length);
  console.log('Performance Issues:', data.performanceIssues.length);
  console.log('Optimization Opportunities:', data.optimizationOpportunities.length);
  console.log('Recommendations:', data.recommendations.length);
  
  if (data.bottlenecks.length > 0) {
    console.log('\nBottlenecks:');
    data.bottlenecks.forEach((bottleneck, index) => {
      console.log(`${index + 1}. ${bottleneck.type} - ${bottleneck.severity.toUpperCase()}`);
      console.log(`   Impact: ${bottleneck.impact}`);
      console.log(`   Recommendation: ${bottleneck.recommendation}`);
    });
  }
  
  if (data.performanceIssues.length > 0) {
    console.log('\nPerformance Issues:');
    data.performanceIssues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.title} - ${issue.severity.toUpperCase()}`);
      console.log(`   Description: ${issue.description}`);
      console.log(`   Recommendation: ${issue.recommendation}`);
    });
  }
  
  if (data.optimizationOpportunities.length > 0) {
    console.log('\nOptimization Opportunities:');
    data.optimizationOpportunities.forEach((opp, index) => {
      console.log(`${index + 1}. ${opp.title} - Priority: ${opp.priority.toUpperCase()}`);
      console.log(`   Description: ${opp.description}`);
      console.log(`   Estimated Impact: ${opp.estimatedImpact}`);
    });
  }
  
  if (data.recommendations.length > 0) {
    console.log('\nRecommendations:');
    data.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }
})
.catch(error => {
  console.error('Error:', error);
});