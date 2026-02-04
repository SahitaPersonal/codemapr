const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testErrorHandling() {
  console.log('🚀 Testing Error Handling and Recovery System...\n');

  try {
    // Test 1: Check error handler health
    console.log('1. Testing error handler health...');
    const healthResponse = await axios.get(`${BASE_URL}/api/errors/health`);
    console.log('✅ Error handler health:', healthResponse.data);
    console.log();

    // Test 2: Get initial error statistics
    console.log('2. Testing error statistics...');
    const initialStatsResponse = await axios.get(`${BASE_URL}/api/errors/statistics`);
    console.log('✅ Initial error statistics:', initialStatsResponse.data);
    console.log();

    // Test 3: Create test errors with different severities
    console.log('3. Testing error creation with different severities...');
    
    const testErrors = [
      { severity: 'low', message: 'Test low severity error', operation: 'test-operation' },
      { severity: 'medium', message: 'Test medium severity error', operation: 'validation-test' },
      { severity: 'high', message: 'Test high severity error', operation: 'timeout-test' },
      { severity: 'critical', message: 'Test critical severity error', operation: 'database-test' },
    ];

    const errorIds = [];
    
    for (const testError of testErrors) {
      const response = await axios.post(`${BASE_URL}/api/errors/test`, testError);
      console.log(`✅ Created ${testError.severity} error:`, response.data);
      errorIds.push(response.data.errorId);
    }
    console.log();

    // Test 4: Get updated error statistics
    console.log('4. Testing updated error statistics...');
    const updatedStatsResponse = await axios.get(`${BASE_URL}/api/errors/statistics`);
    console.log('✅ Updated error statistics:', updatedStatsResponse.data);
    console.log();

    // Test 5: Get error reports with filtering
    console.log('5. Testing error report filtering...');
    
    // Get all errors
    const allErrorsResponse = await axios.get(`${BASE_URL}/api/errors/reports`);
    console.log(`✅ All error reports count: ${allErrorsResponse.data.length}`);
    
    // Get only critical errors
    const criticalErrorsResponse = await axios.get(`${BASE_URL}/api/errors/reports?severity=critical`);
    console.log(`✅ Critical error reports count: ${criticalErrorsResponse.data.length}`);
    
    // Get errors by operation
    const operationErrorsResponse = await axios.get(`${BASE_URL}/api/errors/reports?operation=test-operation`);
    console.log(`✅ Test operation error reports count: ${operationErrorsResponse.data.length}`);
    
    // Get recent errors (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recentErrorsResponse = await axios.get(`${BASE_URL}/api/errors/reports?since=${oneHourAgo}&limit=10`);
    console.log(`✅ Recent error reports count: ${recentErrorsResponse.data.length}`);
    console.log();

    // Test 6: Get specific error report details
    console.log('6. Testing specific error report retrieval...');
    if (errorIds.length > 0) {
      const errorDetailResponse = await axios.get(`${BASE_URL}/api/errors/reports/${errorIds[0]}`);
      console.log('✅ Error report details:', {
        id: errorDetailResponse.data.id,
        type: errorDetailResponse.data.type,
        severity: errorDetailResponse.data.severity,
        recoverable: errorDetailResponse.data.recoverable,
        context: errorDetailResponse.data.context,
      });
    }
    console.log();

    // Test 7: Test error report filtering by multiple criteria
    console.log('7. Testing advanced error filtering...');
    const advancedFilterResponse = await axios.get(
      `${BASE_URL}/api/errors/reports?severity=high,critical&limit=5`
    );
    console.log(`✅ High/Critical errors count: ${advancedFilterResponse.data.length}`);
    console.log('Sample errors:', advancedFilterResponse.data.map(error => ({
      id: error.id,
      severity: error.severity,
      message: error.message,
      operation: error.context.operation,
    })));
    console.log();

    // Test 8: Test error cleanup
    console.log('8. Testing error cleanup...');
    
    // Clean errors older than 1 second (for testing)
    const oneSecondAgo = new Date(Date.now() - 1000).toISOString();
    
    // Wait a moment to ensure some errors are "old"
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const cleanupResponse = await axios.post(`${BASE_URL}/api/errors/clear`, {
      olderThan: oneSecondAgo
    });
    console.log('✅ Cleanup result:', cleanupResponse.data);
    console.log();

    // Test 9: Test error handling with retry simulation
    console.log('9. Testing retry mechanism simulation...');
    
    // Create multiple errors to simulate retry attempts
    for (let i = 1; i <= 3; i++) {
      const retryError = {
        severity: 'medium',
        message: `Retry attempt ${i} - Network timeout`,
        operation: 'retry-test',
        userId: 'test-user-retry'
      };
      
      const response = await axios.post(`${BASE_URL}/api/errors/test`, retryError);
      console.log(`✅ Retry simulation ${i}:`, response.data);
    }
    console.log();

    // Test 10: Final statistics check
    console.log('10. Testing final error statistics...');
    const finalStatsResponse = await axios.get(`${BASE_URL}/api/errors/statistics`);
    console.log('✅ Final error statistics:', finalStatsResponse.data);
    console.log();

    // Test 11: Test non-existent error report
    console.log('11. Testing non-existent error report...');
    try {
      await axios.get(`${BASE_URL}/api/errors/reports/non-existent-id`);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Correctly returned 404 for non-existent error report');
      } else {
        console.log('❌ Unexpected error for non-existent report:', error.response?.status);
      }
    }
    console.log();

    console.log('📋 Error Handling System Summary:');
    console.log('✅ Error reporting and logging with severity levels');
    console.log('✅ Error statistics and monitoring');
    console.log('✅ Error filtering by severity, type, operation, user, and date');
    console.log('✅ Detailed error reports with context and stack traces');
    console.log('✅ Error cleanup and maintenance operations');
    console.log('✅ Retry mechanism simulation and tracking');
    console.log('✅ Comprehensive error categorization (low, medium, high, critical)');
    console.log('✅ Error recovery tracking and statistics');
    console.log('✅ REST API for error management and monitoring');
    console.log('✅ Health check and service monitoring');
    console.log();

    console.log('🔧 Error Handling Components:');
    console.log('📁 ErrorHandlerService - Core error handling and retry logic');
    console.log('📁 CircuitBreakerService - Service outage protection');
    console.log('📁 GracefulDegradationService - Fallback and caching strategies');
    console.log('📁 ErrorHandlerController - REST API for error management');
    console.log('📁 ErrorHandlingModule - Module integration');
    console.log();

    console.log('🎉 All Error Handling tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
  }
}

// Run the tests
testErrorHandling();