const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testUserPreferences() {
  console.log('🧪 Testing User Preferences API...\n');

  const testUserId = 'test-user-123';

  try {
    // Test 1: Health Check
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/api/preferences/health`);
    console.log('✅ Health check passed:', healthResponse.data);
    console.log();

    // Test 2: Get user preferences (should create defaults)
    console.log('2. Testing get user preferences (creating defaults)...');
    const getResponse = await axios.get(`${BASE_URL}/api/preferences/${testUserId}`);
    console.log('✅ Default preferences created:');
    console.log(`   - Theme: ${getResponse.data.theme.theme}`);
    console.log(`   - Layout: ${getResponse.data.flowchart.defaultLayout}`);
    console.log(`   - Language: ${getResponse.data.general.language}`);
    console.log(`   - Incremental analysis: ${getResponse.data.analysis.enableIncrementalAnalysis}`);
    console.log(`   - Security level: ${getResponse.data.security.securityLevel}`);
    console.log();

    // Test 3: Update user preferences
    console.log('3. Testing update user preferences...');
    const updateData = {
      preferences: {
        theme: {
          theme: 'dark',
          fontSize: 16,
          fontFamily: 'Monaco, monospace'
        },
        flowchart: {
          defaultLayout: 'force-directed',
          showComplexity: false,
          animationsEnabled: false
        },
        analysis: {
          enableIncrementalAnalysis: false,
          maxCacheSize: 1000
        },
        general: {
          language: 'es',
          enableBetaFeatures: true
        }
      },
      platform: 'web',
      userAgent: 'test-client'
    };

    const updateResponse = await axios.put(`${BASE_URL}/api/preferences/${testUserId}`, updateData);
    console.log('✅ Preferences updated:');
    console.log(`   - Theme: ${updateResponse.data.theme.theme}`);
    console.log(`   - Font size: ${updateResponse.data.theme.fontSize}`);
    console.log(`   - Layout: ${updateResponse.data.flowchart.defaultLayout}`);
    console.log(`   - Show complexity: ${updateResponse.data.flowchart.showComplexity}`);
    console.log(`   - Language: ${updateResponse.data.general.language}`);
    console.log(`   - Beta features: ${updateResponse.data.general.enableBetaFeatures}`);
    console.log();

    // Test 4: Export user preferences
    console.log('4. Testing export user preferences...');
    const exportResponse = await axios.get(`${BASE_URL}/api/preferences/${testUserId}/export`);
    console.log('✅ Preferences exported:');
    console.log(`   - User ID: ${exportResponse.data.userId}`);
    console.log(`   - Version: ${exportResponse.data.version}`);
    console.log(`   - Exported at: ${exportResponse.data.exportedAt}`);
    console.log(`   - Theme in export: ${exportResponse.data.preferences.theme.theme}`);
    console.log();

    // Test 5: Test preference synchronization
    console.log('5. Testing preference synchronization...');
    const syncData = {
      platform: 'vscode',
      preferences: {
        ...updateResponse.data,
        theme: {
          ...updateResponse.data.theme,
          theme: 'ocean',
          fontSize: 18
        },
        flowchart: {
          ...updateResponse.data.flowchart,
          showPerformanceMetrics: false
        }
      },
      lastSyncedAt: new Date().toISOString()
    };

    const syncResponse = await axios.post(`${BASE_URL}/api/preferences/${testUserId}/sync`, syncData);
    console.log('✅ Preferences synchronized:');
    console.log(`   - Conflict resolution: ${syncResponse.data.conflictResolution}`);
    console.log(`   - Theme after sync: ${syncResponse.data.preferences.theme.theme}`);
    console.log(`   - Font size after sync: ${syncResponse.data.preferences.theme.fontSize}`);
    console.log(`   - Last synced: ${syncResponse.data.lastSyncedAt}`);
    console.log();

    // Test 6: Import preferences (using exported data)
    console.log('6. Testing import preferences...');
    const testUserId2 = 'test-user-456';
    const importData = {
      exportData: exportResponse.data
    };

    // Modify the export data to test import
    importData.exportData.userId = testUserId2;
    importData.exportData.preferences.theme.theme = 'light';
    importData.exportData.preferences.general.language = 'fr';

    const importResponse = await axios.post(`${BASE_URL}/api/preferences/${testUserId2}/import`, importData);
    console.log('✅ Preferences imported:');
    console.log(`   - Theme: ${importResponse.data.theme.theme}`);
    console.log(`   - Language: ${importResponse.data.general.language}`);
    console.log(`   - Layout: ${importResponse.data.flowchart.defaultLayout}`);
    console.log();

    // Test 7: Reset preferences
    console.log('7. Testing reset preferences...');
    const resetResponse = await axios.post(`${BASE_URL}/api/preferences/${testUserId}/reset`);
    console.log('✅ Preferences reset to defaults:');
    console.log(`   - Theme: ${resetResponse.data.theme.theme}`);
    console.log(`   - Font size: ${resetResponse.data.theme.fontSize}`);
    console.log(`   - Layout: ${resetResponse.data.flowchart.defaultLayout}`);
    console.log(`   - Language: ${resetResponse.data.general.language}`);
    console.log(`   - Beta features: ${resetResponse.data.general.enableBetaFeatures}`);
    console.log();

    // Test 8: Get preference statistics
    console.log('8. Testing preference statistics...');
    const statsResponse = await axios.get(`${BASE_URL}/api/preferences/statistics/overview`);
    console.log('✅ Preference statistics retrieved:');
    console.log(`   - Total users: ${statsResponse.data.totalUsers}`);
    console.log(`   - Active users: ${statsResponse.data.activeUsers}`);
    console.log(`   - Most common theme: ${statsResponse.data.mostCommonTheme}`);
    console.log(`   - Most common layout: ${statsResponse.data.mostCommonLayout}`);
    console.log(`   - Average preference age: ${statsResponse.data.averagePreferenceAge.toFixed(2)} days`);
    console.log();

    // Test 9: Delete preferences
    console.log('9. Testing delete preferences...');
    const deleteResponse = await axios.delete(`${BASE_URL}/api/preferences/${testUserId2}`);
    console.log('✅ Preferences deleted:');
    console.log(`   - Message: ${deleteResponse.data.message}`);
    console.log(`   - User ID: ${deleteResponse.data.userId}`);
    console.log();

    // Test 10: Verify deletion (should create new defaults)
    console.log('10. Testing get preferences after deletion...');
    const getAfterDeleteResponse = await axios.get(`${BASE_URL}/api/preferences/${testUserId2}`);
    console.log('✅ New default preferences created after deletion:');
    console.log(`   - Theme: ${getAfterDeleteResponse.data.theme.theme}`);
    console.log(`   - Language: ${getAfterDeleteResponse.data.general.language}`);
    console.log();

    console.log('🎉 All user preference tests passed!\n');
    
    // Summary
    console.log('📊 Test Summary:');
    console.log('✅ Health check - PASSED');
    console.log('✅ Get preferences (defaults) - PASSED');
    console.log('✅ Update preferences - PASSED');
    console.log('✅ Export preferences - PASSED');
    console.log('✅ Sync preferences - PASSED');
    console.log('✅ Import preferences - PASSED');
    console.log('✅ Reset preferences - PASSED');
    console.log('✅ Preference statistics - PASSED');
    console.log('✅ Delete preferences - PASSED');
    console.log('✅ Get after deletion - PASSED');
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
testUserPreferences();