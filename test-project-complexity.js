// Test project complexity analysis
const testData = {
  projectPath: '/test-project'
};

fetch('http://localhost:3001/analysis/complexity/project', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData)
})
.then(response => response.json())
.then(data => {
  console.log('Project Complexity Analysis Results:');
  console.log('===================================');
  console.log('Project Path:', data.projectPath);
  console.log('Total Files:', data.totalFiles);
  console.log('Analyzed Files:', data.analyzedFiles);
  console.log('Overall Metrics:', JSON.stringify(data.overallMetrics, null, 2));
  console.log('Hotspots:', data.hotspots.length);
  console.log('Recommendations:', data.recommendations.length);
  console.log('Technical Debt Summary:', JSON.stringify(data.technicalDebtSummary, null, 2));
})
.catch(error => {
  console.error('Error:', error);
});