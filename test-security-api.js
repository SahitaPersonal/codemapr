const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testSecurityAPI() {
  console.log('🔒 Testing Security Vulnerability API...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing security service health check...');
    const healthResponse = await axios.get(`${BASE_URL}/api/security/health`);
    console.log('✅ Health check:', healthResponse.data);
    console.log();

    // Test 2: Scan project for security vulnerabilities
    console.log('2. Testing project security scan...');
    const scanResponse = await axios.post(`${BASE_URL}/api/security/scan`, {
      projectPath: 'C:\\pet_projects\\Codemapr\\packages\\backend\\src'
    });
    
    const scanResult = scanResponse.data;
    console.log('✅ Project security scan completed:');
    console.log(`   - Total files: ${scanResult.totalFiles}`);
    console.log(`   - Scanned files: ${scanResult.scannedFiles}`);
    console.log(`   - Total vulnerabilities: ${scanResult.totalVulnerabilities}`);
    console.log(`   - Critical: ${scanResult.criticalCount}`);
    console.log(`   - High: ${scanResult.highCount}`);
    console.log(`   - Medium: ${scanResult.mediumCount}`);
    console.log(`   - Low: ${scanResult.lowCount}`);
    console.log(`   - Risk score: ${scanResult.riskScore}/100`);
    console.log(`   - Scan duration: ${scanResult.scanDuration}ms`);
    console.log(`   - Recommendations: ${scanResult.recommendations.length}`);
    console.log();

    // Show sample vulnerabilities
    if (scanResult.vulnerabilities.length > 0) {
      console.log('📋 Sample vulnerabilities found:');
      scanResult.vulnerabilities.slice(0, 3).forEach((vuln, index) => {
        console.log(`   ${index + 1}. ${vuln.title} (${vuln.severity})`);
        console.log(`      File: ${vuln.location.filePath}`);
        console.log(`      Line: ${vuln.location.start.line}`);
        console.log(`      Description: ${vuln.description}`);
        console.log(`      Recommendation: ${vuln.recommendation}`);
        console.log();
      });
    }

    // Show recommendations
    if (scanResult.recommendations.length > 0) {
      console.log('💡 Security recommendations:');
      scanResult.recommendations.slice(0, 3).forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec.title} (${rec.priority} priority)`);
        console.log(`      Category: ${rec.category}`);
        console.log(`      Description: ${rec.description}`);
        console.log(`      Affected files: ${rec.affectedFiles.length}`);
        console.log(`      Action items: ${rec.actionItems.length}`);
        console.log();
      });
    }

    // Test 3: Get security metrics
    console.log('3. Testing security metrics...');
    const metricsResponse = await axios.get(`${BASE_URL}/api/security/metrics`, {
      params: { projectPath: 'C:\\pet_projects\\Codemapr\\packages\\backend\\src' }
    });
    
    const metrics = metricsResponse.data;
    console.log('✅ Security metrics retrieved:');
    console.log(`   - Risk score: ${metrics.riskScore}/100`);
    console.log(`   - Top vulnerability types: ${metrics.topVulnerabilityTypes.length}`);
    console.log(`   - Most vulnerable files: ${metrics.mostVulnerableFiles.length}`);
    console.log();

    if (metrics.topVulnerabilityTypes.length > 0) {
      console.log('📊 Top vulnerability types:');
      metrics.topVulnerabilityTypes.slice(0, 5).forEach((type, index) => {
        console.log(`   ${index + 1}. ${type.type}: ${type.count} occurrences`);
      });
      console.log();
    }

    if (metrics.mostVulnerableFiles.length > 0) {
      console.log('🎯 Most vulnerable files:');
      metrics.mostVulnerableFiles.slice(0, 5).forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.filePath}`);
        console.log(`      Vulnerabilities: ${file.vulnerabilityCount}`);
        console.log(`      Risk score: ${file.riskScore}/100`);
      });
      console.log();
    }

    // Test 4: Scan a specific file
    console.log('4. Testing single file security scan...');
    try {
      const fileResponse = await axios.post(`${BASE_URL}/api/security/scan-file`, {
        filePath: 'C:\\pet_projects\\Codemapr\\test-vulnerable-code.js'
      });
      
      const fileResult = fileResponse.data;
      if (fileResult) {
        console.log('✅ File security scan completed:');
        console.log(`   - File: ${fileResult.filePath}`);
        console.log(`   - Vulnerabilities: ${fileResult.vulnerabilities.length}`);
        console.log(`   - Risk score: ${fileResult.riskScore}/100`);
        console.log(`   - Critical: ${fileResult.summary.criticalCount}`);
        console.log(`   - High: ${fileResult.summary.highCount}`);
        console.log(`   - Medium: ${fileResult.summary.mediumCount}`);
        console.log(`   - Low: ${fileResult.summary.lowCount}`);
      } else {
        console.log('ℹ️ File not supported for security scanning');
      }
    } catch (error) {
      console.log('⚠️ File scan failed:', error.response?.data?.message || error.message);
    }
    console.log();

    // Test 5: Get vulnerability details (if any vulnerabilities exist)
    if (scanResult.vulnerabilities.length > 0) {
      console.log('5. Testing vulnerability details...');
      const firstVuln = scanResult.vulnerabilities[0];
      try {
        const vulnResponse = await axios.get(`${BASE_URL}/api/security/vulnerability/${firstVuln.id}`, {
          params: { projectPath: 'C:\\pet_projects\\Codemapr\\packages\\backend\\src' }
        });
        
        const vulnDetails = vulnResponse.data;
        console.log('✅ Vulnerability details retrieved:');
        console.log(`   - ID: ${vulnDetails.id}`);
        console.log(`   - Type: ${vulnDetails.type}`);
        console.log(`   - Severity: ${vulnDetails.severity}`);
        console.log(`   - Title: ${vulnDetails.title}`);
        console.log(`   - CWE ID: ${vulnDetails.cweId || 'N/A'}`);
        console.log(`   - OWASP Category: ${vulnDetails.owaspCategory || 'N/A'}`);
        console.log(`   - Confidence: ${vulnDetails.confidence}`);
      } catch (error) {
        console.log('⚠️ Vulnerability details failed:', error.response?.data?.message || error.message);
      }
      console.log();
    }

    // Test 6: Get security recommendations
    console.log('6. Testing security recommendations endpoint...');
    const recResponse = await axios.get(`${BASE_URL}/api/security/recommendations`, {
      params: { projectPath: 'C:\\pet_projects\\Codemapr\\packages\\backend\\src' }
    });
    
    const recommendations = recResponse.data;
    console.log('✅ Security recommendations retrieved:');
    console.log(`   - Total recommendations: ${recommendations.length}`);
    
    if (recommendations.length > 0) {
      const highPriorityRecs = recommendations.filter(r => r.priority === 'high');
      console.log(`   - High priority: ${highPriorityRecs.length}`);
      console.log(`   - Medium priority: ${recommendations.filter(r => r.priority === 'medium').length}`);
      console.log(`   - Low priority: ${recommendations.filter(r => r.priority === 'low').length}`);
    }
    console.log();

    console.log('🎉 All security API tests completed successfully!');

  } catch (error) {
    console.error('❌ Security API test failed:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      console.log('💡 Make sure the backend server is running on http://localhost:3001');
    }
  }
}

// Run the tests
testSecurityAPI();