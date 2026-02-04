const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testOptimizationAPI() {
  console.log('🚀 Testing Optimization Recommendations API...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing optimization service health check...');
    const healthResponse = await axios.get(`${BASE_URL}/api/optimization/health`);
    console.log('✅ Health check:', healthResponse.data);
    console.log();

    // Test 2: Get available categories
    console.log('2. Testing optimization categories...');
    const categoriesResponse = await axios.get(`${BASE_URL}/api/optimization/categories`);
    const categories = categoriesResponse.data;
    console.log('✅ Available categories:');
    console.log(`   - Types: ${categories.types.join(', ')}`);
    console.log(`   - Priorities: ${categories.priorities.join(', ')}`);
    console.log(`   - Categories: ${categories.categories.slice(0, 5).join(', ')}...`);
    console.log(`   - Impact Levels: ${categories.impactLevels.join(', ')}`);
    console.log(`   - Difficulty Levels: ${categories.difficultyLevels.join(', ')}`);
    console.log();

    // Test 3: Analyze project for optimization opportunities
    console.log('3. Testing project optimization analysis...');
    const analysisResponse = await axios.post(`${BASE_URL}/api/optimization/analyze`, {
      projectPath: 'C:\\pet_projects\\Codemapr\\packages\\backend\\src'
    });
    
    const analysisResult = analysisResponse.data;
    console.log('✅ Project optimization analysis completed:');
    console.log(`   - Total files: ${analysisResult.totalFiles}`);
    console.log(`   - Analyzed files: ${analysisResult.analyzedFiles}`);
    console.log(`   - Total recommendations: ${analysisResult.recommendations.length}`);
    console.log(`   - Analysis time: ${analysisResult.analysisTime}ms`);
    console.log();

    console.log('📊 Summary:');
    const { summary } = analysisResult;
    console.log(`   - High priority: ${summary.highPriorityCount}`);
    console.log(`   - Medium priority: ${summary.mediumPriorityCount}`);
    console.log(`   - Low priority: ${summary.lowPriorityCount}`);
    console.log(`   - Estimated total impact: ${summary.estimatedTotalImpact}`);
    console.log();

    // Show top categories
    const topCategories = Object.entries(summary.categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    if (topCategories.length > 0) {
      console.log('🎯 Top optimization categories:');
      topCategories.forEach(([category, count], index) => {
        console.log(`   ${index + 1}. ${category}: ${count} recommendations`);
      });
      console.log();
    }

    // Show sample recommendations
    if (analysisResult.recommendations.length > 0) {
      console.log('💡 Sample optimization recommendations:');
      analysisResult.recommendations.slice(0, 3).forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec.title} (${rec.priority} priority)`);
        console.log(`      Category: ${rec.category}`);
        console.log(`      Type: ${rec.type}`);
        console.log(`      Impact: ${rec.estimatedImpact}, Difficulty: ${rec.difficulty}`);
        console.log(`      Affected files: ${rec.affectedFiles.length}`);
        console.log(`      Description: ${rec.description.substring(0, 100)}...`);
        console.log(`      Action items: ${rec.actionItems.length}`);
        if (rec.codeExamples && rec.codeExamples.length > 0) {
          console.log(`      Code examples: ${rec.codeExamples.length}`);
        }
        console.log();
      });
    }

    // Test 4: Get optimization summary
    console.log('4. Testing optimization summary...');
    const summaryResponse = await axios.get(`${BASE_URL}/api/optimization/summary`, {
      params: { projectPath: 'C:\\pet_projects\\Codemapr\\packages\\backend\\src' }
    });
    
    const summaryData = summaryResponse.data;
    console.log('✅ Optimization summary retrieved:');
    console.log(`   - Total recommendations: ${summaryData.totalRecommendations}`);
    console.log(`   - Estimated total impact: ${summaryData.estimatedTotalImpact}`);
    console.log();

    if (summaryData.quickWins && summaryData.quickWins.length > 0) {
      console.log('⚡ Quick wins (high impact, easy difficulty):');
      summaryData.quickWins.forEach((win, index) => {
        console.log(`   ${index + 1}. ${win.title}`);
        console.log(`      Category: ${win.category}`);
        console.log(`      Impact: ${win.estimatedImpact}, Difficulty: ${win.difficulty}`);
      });
      console.log();
    }

    if (summaryData.highImpactItems && summaryData.highImpactItems.length > 0) {
      console.log('🎯 High impact recommendations:');
      summaryData.highImpactItems.slice(0, 5).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.title}`);
        console.log(`      Category: ${item.category}, Priority: ${item.priority}`);
        console.log(`      Affected files: ${item.affectedFiles}`);
      });
      console.log();
    }

    // Test 5: Get filtered recommendations
    console.log('5. Testing filtered recommendations...');
    
    // Filter by high priority
    const highPriorityResponse = await axios.get(`${BASE_URL}/api/optimization/recommendations`, {
      params: { 
        projectPath: 'C:\\pet_projects\\Codemapr\\packages\\backend\\src',
        priority: 'high'
      }
    });
    
    console.log(`✅ High priority recommendations: ${highPriorityResponse.data.length}`);

    // Filter by performance type
    const performanceResponse = await axios.get(`${BASE_URL}/api/optimization/recommendations`, {
      params: { 
        projectPath: 'C:\\pet_projects\\Codemapr\\packages\\backend\\src',
        type: 'performance'
      }
    });
    
    console.log(`✅ Performance recommendations: ${performanceResponse.data.length}`);

    // Filter by code structure category
    const codeStructureResponse = await axios.get(`${BASE_URL}/api/optimization/recommendations`, {
      params: { 
        projectPath: 'C:\\pet_projects\\Codemapr\\packages\\backend\\src',
        category: 'Code Structure'
      }
    });
    
    console.log(`✅ Code Structure recommendations: ${codeStructureResponse.data.length}`);
    console.log();

    // Show detailed example of a recommendation with code examples
    if (analysisResult.recommendations.length > 0) {
      const detailedRec = analysisResult.recommendations.find(r => r.codeExamples && r.codeExamples.length > 0);
      if (detailedRec) {
        console.log('📝 Detailed recommendation example:');
        console.log(`   Title: ${detailedRec.title}`);
        console.log(`   Priority: ${detailedRec.priority}, Impact: ${detailedRec.estimatedImpact}`);
        console.log(`   Category: ${detailedRec.category}`);
        console.log(`   Description: ${detailedRec.description}`);
        console.log();
        
        if (detailedRec.codeExamples.length > 0) {
          const example = detailedRec.codeExamples[0];
          console.log(`   Code Example: ${example.title}`);
          console.log(`   Before:`);
          console.log(`   ${example.before.split('\n').slice(0, 3).join('\n   ')}...`);
          console.log(`   After:`);
          console.log(`   ${example.after.split('\n').slice(0, 3).join('\n   ')}...`);
          console.log(`   Explanation: ${example.explanation}`);
          console.log();
        }
        
        console.log(`   Action Items:`);
        detailedRec.actionItems.slice(0, 3).forEach((item, index) => {
          console.log(`   ${index + 1}. ${item}`);
        });
        console.log();
        
        console.log(`   Tags: ${detailedRec.tags.join(', ')}`);
        console.log();
      }
    }

    console.log('🎉 All optimization API tests completed successfully!');

  } catch (error) {
    console.error('❌ Optimization API test failed:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      console.log('💡 Make sure the backend server is running on http://localhost:3001');
    }
  }
}

// Run the tests
testOptimizationAPI();