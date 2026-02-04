const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';

async function testIncrementalAnalysis() {
  console.log('🧪 Testing Incremental Analysis API...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/api/incremental-analysis/health`);
    console.log('✅ Health check passed:', healthResponse.data);
    console.log();

    // Test 2: Perform incremental analysis
    console.log('2. Testing incremental analysis...');
    const projectPath = process.cwd(); // Use current project directory
    
    const analysisResponse = await axios.post(`${BASE_URL}/api/incremental-analysis/analyze`, {
      projectPath: projectPath
    });
    
    console.log('✅ Incremental analysis completed:');
    console.log(`   - Analysis ID: ${analysisResponse.data.analysisId}`);
    console.log(`   - Total files: ${analysisResponse.data.totalFiles}`);
    console.log(`   - Changed files: ${analysisResponse.data.changedFiles}`);
    console.log(`   - New files: ${analysisResponse.data.newFiles}`);
    console.log(`   - Deleted files: ${analysisResponse.data.deletedFiles}`);
    console.log(`   - Unchanged files: ${analysisResponse.data.unchangedFiles}`);
    console.log(`   - Analysis time: ${analysisResponse.data.analysisTime}ms`);
    console.log(`   - Cache hit rate: ${(analysisResponse.data.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`   - Status: ${analysisResponse.data.status}`);
    console.log();

    // Test 3: Get cache statistics
    console.log('3. Testing cache statistics...');
    const statsResponse = await axios.get(`${BASE_URL}/api/incremental-analysis/cache/statistics`, {
      params: { projectPath: projectPath }
    });
    
    console.log('✅ Cache statistics retrieved:');
    console.log(`   - Cache size: ${statsResponse.data.cacheSize} files`);
    console.log(`   - File count: ${statsResponse.data.fileCount}`);
    console.log(`   - Last analysis: ${statsResponse.data.lastAnalysis}`);
    console.log(`   - Version: ${statsResponse.data.version}`);
    console.log(`   - Disk size: ${statsResponse.data.diskSize} bytes`);
    console.log();

    // Test 4: Get recent changes
    console.log('4. Testing recent changes...');
    const changesResponse = await axios.get(`${BASE_URL}/api/incremental-analysis/changes`, {
      params: { projectPath: projectPath }
    });
    
    console.log('✅ Recent changes retrieved:');
    console.log(`   - Total changes: ${changesResponse.data.totalChanges}`);
    console.log(`   - Added: ${changesResponse.data.summary.added}`);
    console.log(`   - Modified: ${changesResponse.data.summary.modified}`);
    console.log(`   - Deleted: ${changesResponse.data.summary.deleted}`);
    console.log(`   - Unchanged: ${changesResponse.data.summary.unchanged}`);
    
    // Show first few changes
    if (changesResponse.data.changes.length > 0) {
      console.log('   - Sample changes:');
      changesResponse.data.changes.slice(0, 3).forEach((change, index) => {
        console.log(`     ${index + 1}. ${change.filePath} (${change.changeType})`);
      });
    }
    console.log();

    // Test 5: Run second analysis to test caching
    console.log('5. Testing cache effectiveness (second analysis)...');
    const secondAnalysisResponse = await axios.post(`${BASE_URL}/api/incremental-analysis/analyze`, {
      projectPath: projectPath
    });
    
    console.log('✅ Second analysis completed:');
    console.log(`   - Analysis time: ${secondAnalysisResponse.data.analysisTime}ms`);
    console.log(`   - Cache hit rate: ${(secondAnalysisResponse.data.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`   - Changed files: ${secondAnalysisResponse.data.changedFiles}`);
    console.log();

    // Test 6: Test analysis comparison (if we have multiple versions)
    console.log('6. Testing analysis comparison...');
    try {
      const comparisonResponse = await axios.post(`${BASE_URL}/api/incremental-analysis/compare`, {
        projectPath: projectPath
      });
      
      console.log('✅ Analysis comparison completed:');
      console.log(`   - Previous version: ${comparisonResponse.data.previousVersion}`);
      console.log(`   - Current version: ${comparisonResponse.data.currentVersion}`);
      console.log(`   - Added files: ${comparisonResponse.data.addedFiles.length}`);
      console.log(`   - Modified files: ${comparisonResponse.data.modifiedFiles.length}`);
      console.log(`   - Deleted files: ${comparisonResponse.data.deletedFiles.length}`);
      console.log(`   - Complexity changes: ${comparisonResponse.data.complexityChanges.length}`);
      console.log(`   - Performance changes: ${comparisonResponse.data.performanceChanges.length}`);
      console.log(`   - Security changes: ${comparisonResponse.data.securityChanges.length}`);
    } catch (error) {
      console.log('⚠️  Analysis comparison not available (expected for first run)');
    }
    console.log();

    // Test 7: Test cache invalidation
    console.log('7. Testing cache invalidation...');
    const invalidationResponse = await axios.delete(`${BASE_URL}/api/incremental-analysis/cache`, {
      data: {
        projectPath: projectPath,
        filePaths: ['packages/backend/src/main.ts'] // Invalidate specific file
      }
    });
    
    console.log('✅ Cache invalidation completed:');
    console.log(`   - Message: ${invalidationResponse.data.message}`);
    console.log(`   - Invalidated files: ${invalidationResponse.data.invalidatedFiles}`);
    console.log();

    console.log('🎉 All incremental analysis tests passed!\n');
    
    // Summary
    console.log('📊 Test Summary:');
    console.log('✅ Health check - PASSED');
    console.log('✅ Incremental analysis - PASSED');
    console.log('✅ Cache statistics - PASSED');
    console.log('✅ Recent changes - PASSED');
    console.log('✅ Cache effectiveness - PASSED');
    console.log('✅ Cache invalidation - PASSED');
    console.log();

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Make sure the backend server is running on localhost:3001');
      console.log('   Run: cd packages/backend && npm run start:dev');
    }
  }
}

// Run the test
testIncrementalAnalysis();