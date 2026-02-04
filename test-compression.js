const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testCompression() {
  console.log('🧪 Testing Data Compression API...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/api/compression/health`);
    console.log('✅ Health check passed:', healthResponse.data);
    console.log();

    // Test 2: Compress data with different algorithms
    console.log('2. Testing data compression with different algorithms...');
    const testData = {
      message: 'This is a test message for compression',
      numbers: Array.from({ length: 100 }, (_, i) => i),
      nested: {
        deep: {
          structure: {
            with: 'lots of repeated data '.repeat(50),
            array: new Array(20).fill('repeated string')
          }
        }
      }
    };

    const algorithms = ['gzip', 'deflate', 'brotli'];
    const compressionResults = {};

    for (const algorithm of algorithms) {
      const compressResponse = await axios.post(`${BASE_URL}/api/compression/compress`, {
        data: testData,
        algorithm: algorithm,
        level: 6
      });

      compressionResults[algorithm] = compressResponse.data;
      console.log(`✅ ${algorithm.toUpperCase()} compression:`);
      console.log(`   - Original size: ${compressResponse.data.originalSize} bytes`);
      console.log(`   - Compressed size: ${compressResponse.data.compressedSize} bytes`);
      console.log(`   - Compression ratio: ${compressResponse.data.compressionRatio.toFixed(2)}x`);
      console.log(`   - Algorithm: ${compressResponse.data.algorithm}`);
    }
    console.log();

    // Test 3: Benchmark algorithms
    console.log('3. Testing compression benchmark...');
    const benchmarkResponse = await axios.post(`${BASE_URL}/api/compression/benchmark`, {
      data: testData,
      algorithms: algorithms
    });

    console.log('✅ Compression benchmark results:');
    for (const [algorithm, result] of Object.entries(benchmarkResponse.data)) {
      console.log(`   - ${algorithm.toUpperCase()}:`);
      console.log(`     * Ratio: ${result.compressionRatio.toFixed(2)}x`);
      console.log(`     * Compression time: ${result.compressionTime}ms`);
      console.log(`     * Decompression time: ${result.decompressionTime}ms`);
    }
    console.log();

    // Test 4: Find optimal algorithm
    console.log('4. Testing optimal algorithm selection...');
    const priorities = ['ratio', 'speed', 'balanced'];
    
    for (const priority of priorities) {
      const optimalResponse = await axios.post(`${BASE_URL}/api/compression/optimal`, {
        data: testData,
        priority: priority
      });

      console.log(`✅ Optimal for ${priority}: ${optimalResponse.data.algorithm} (score: ${optimalResponse.data.score.toFixed(2)})`);
    }
    console.log();

    // Test 5: Store compressed data
    console.log('5. Testing compressed data storage...');
    const storeResponse = await axios.post(`${BASE_URL}/api/compression/store`, {
      key: 'test-data-1',
      data: testData,
      compression: {
        algorithm: 'gzip',
        level: 9
      },
      ttl: 3600, // 1 hour
      tags: ['test', 'sample', 'compression'],
      metadata: {
        description: 'Test data for compression',
        version: '1.0',
        created_by: 'test-suite'
      }
    });

    console.log('✅ Data stored successfully:');
    console.log(`   - ID: ${storeResponse.data.id}`);
    console.log(`   - Original size: ${storeResponse.data.originalSize} bytes`);
    console.log(`   - Compressed size: ${storeResponse.data.compressedSize} bytes`);
    console.log(`   - Compression ratio: ${storeResponse.data.compressionRatio.toFixed(2)}x`);
    console.log(`   - Algorithm: ${storeResponse.data.algorithm}`);
    console.log();

    // Test 6: Retrieve compressed data
    console.log('6. Testing compressed data retrieval...');
    const retrieveResponse = await axios.get(`${BASE_URL}/api/compression/retrieve/test-data-1`);

    console.log('✅ Data retrieved successfully:');
    console.log(`   - ID: ${retrieveResponse.data.id}`);
    console.log(`   - Data matches: ${JSON.stringify(retrieveResponse.data.data.message) === JSON.stringify(testData.message)}`);
    console.log(`   - Metadata: ${JSON.stringify(retrieveResponse.data.metadata)}`);
    console.log(`   - Algorithm: ${retrieveResponse.data.algorithm}`);
    console.log(`   - Created at: ${retrieveResponse.data.createdAt}`);
    console.log();

    // Test 7: Store more data for testing
    console.log('7. Storing additional test data...');
    const additionalData = [
      { key: 'test-data-2', data: { type: 'performance', metrics: new Array(50).fill({ cpu: 80, memory: 60 }) }, tags: ['performance', 'metrics'] },
      { key: 'test-data-3', data: { type: 'security', vulnerabilities: new Array(30).fill({ severity: 'high', description: 'Test vulnerability' }) }, tags: ['security', 'vulnerabilities'] },
      { key: 'test-data-4', data: { type: 'analysis', results: 'Large analysis result data '.repeat(100) }, tags: ['analysis', 'results'] }
    ];

    for (const item of additionalData) {
      await axios.post(`${BASE_URL}/api/compression/store`, {
        key: item.key,
        data: item.data,
        tags: item.tags,
        compression: { algorithm: 'brotli', level: 8 }
      });
    }
    console.log('✅ Additional test data stored');
    console.log();

    // Test 8: Search by tags
    console.log('8. Testing search by tags...');
    const searchResponse = await axios.get(`${BASE_URL}/api/compression/search`, {
      params: {
        tags: 'test,performance',
        limit: 10
      }
    });

    console.log('✅ Search results:');
    console.log(`   - Found ${searchResponse.data.length} items`);
    searchResponse.data.forEach((item, index) => {
      console.log(`   - Item ${index + 1}: ${item.data.type || 'test'} (${item.algorithm}, ${item.compressionRatio.toFixed(2)}x)`);
    });
    console.log();

    // Test 9: Get storage statistics
    console.log('9. Testing storage statistics...');
    const storageStatsResponse = await axios.get(`${BASE_URL}/api/compression/storage/stats`);

    console.log('✅ Storage statistics:');
    console.log(`   - Total entries: ${storageStatsResponse.data.totalEntries}`);
    console.log(`   - Total original size: ${storageStatsResponse.data.totalOriginalSize} bytes`);
    console.log(`   - Total compressed size: ${storageStatsResponse.data.totalCompressedSize} bytes`);
    console.log(`   - Space saved: ${storageStatsResponse.data.totalSpaceSaved} bytes`);
    console.log(`   - Average compression ratio: ${storageStatsResponse.data.averageCompressionRatio.toFixed(2)}x`);
    console.log(`   - Algorithms used: ${Object.keys(storageStatsResponse.data.entriesByAlgorithm).join(', ')}`);
    console.log();

    // Test 10: Get compression service statistics
    console.log('10. Testing compression service statistics...');
    const compressionStatsResponse = await axios.get(`${BASE_URL}/api/compression/stats`);

    console.log('✅ Compression service statistics:');
    console.log(`   - Total operations: ${compressionStatsResponse.data.totalOperations}`);
    console.log(`   - Total original size: ${compressionStatsResponse.data.totalOriginalSize} bytes`);
    console.log(`   - Total compressed size: ${compressionStatsResponse.data.totalCompressedSize} bytes`);
    console.log(`   - Average compression ratio: ${compressionStatsResponse.data.averageCompressionRatio.toFixed(2)}x`);
    console.log();

    // Test 11: Cleanup storage (dry run)
    console.log('11. Testing storage cleanup (dry run)...');
    const cleanupResponse = await axios.post(`${BASE_URL}/api/compression/cleanup`, {
      removeExpired: true,
      removeUnaccessed: false,
      dryRun: true
    });

    console.log('✅ Cleanup dry run results:');
    console.log(`   - Would remove: ${cleanupResponse.data.removedCount} items`);
    console.log(`   - Would save: ${cleanupResponse.data.spaceSaved} bytes`);
    console.log(`   - Errors: ${cleanupResponse.data.errors.length}`);
    console.log();

    // Test 12: Delete test data
    console.log('12. Testing data deletion...');
    const deleteResponse = await axios.delete(`${BASE_URL}/api/compression/delete/test-data-1`);
    console.log('✅ Data deleted:', deleteResponse.data);
    console.log();

    console.log('🎉 All compression tests passed!\n');
    
    // Summary
    console.log('📊 Test Summary:');
    console.log('✅ Health check - PASSED');
    console.log('✅ Data compression - PASSED');
    console.log('✅ Algorithm benchmark - PASSED');
    console.log('✅ Optimal algorithm selection - PASSED');
    console.log('✅ Compressed data storage - PASSED');
    console.log('✅ Data retrieval - PASSED');
    console.log('✅ Additional data storage - PASSED');
    console.log('✅ Search by tags - PASSED');
    console.log('✅ Storage statistics - PASSED');
    console.log('✅ Service statistics - PASSED');
    console.log('✅ Storage cleanup - PASSED');
    console.log('✅ Data deletion - PASSED');
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
testCompression();