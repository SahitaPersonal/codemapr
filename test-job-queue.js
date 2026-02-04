const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testJobQueue() {
  console.log('🚀 Testing Job Queue API...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/api/queue/health`);
    console.log('✅ Health check:', healthResponse.data);
    console.log();

    // Test 2: Get queue statistics
    console.log('2. Testing queue statistics...');
    const statsResponse = await axios.get(`${BASE_URL}/api/queue/stats`);
    console.log('✅ Queue stats:', statsResponse.data);
    console.log();

    // Test 3: Add a project analysis job
    console.log('3. Testing add project analysis job...');
    const projectJobData = {
      type: 'project_analysis',
      data: {
        projectPath: './packages/backend',
        projectId: 'test-project-1',
        userId: 'test-user-1',
        analysisOptions: {
          includePatterns: ['**/*.ts'],
          excludePatterns: ['**/node_modules/**', '**/dist/**'],
          enableIncrementalAnalysis: true,
          enableAIExplanations: false,
          enableSecurityScan: true,
          enablePerformanceAnalysis: true,
        },
        createdAt: new Date(),
      },
      options: {
        priority: 10,
        attempts: 3,
        timeout: 300000,
      }
    };

    const addJobResponse = await axios.post(`${BASE_URL}/api/queue/jobs`, projectJobData);
    console.log('✅ Project analysis job added:', addJobResponse.data);
    const projectJobId = addJobResponse.data.jobId;
    console.log();

    // Test 4: Add a file analysis job
    console.log('4. Testing add file analysis job...');
    const fileJobData = {
      type: 'file_analysis',
      data: {
        filePath: './packages/backend/src/main.ts',
        content: 'console.log("test");',
        language: 'typescript',
        userId: 'test-user-1',
        analysisOptions: {
          enableComplexityAnalysis: true,
          enableSecurityScan: true,
          enablePerformanceAnalysis: true,
        },
        createdAt: new Date(),
      },
      options: {
        priority: 5,
        attempts: 2,
      }
    };

    const addFileJobResponse = await axios.post(`${BASE_URL}/api/queue/jobs`, fileJobData);
    console.log('✅ File analysis job added:', addFileJobResponse.data);
    const fileJobId = addFileJobResponse.data.jobId;
    console.log();

    // Test 5: Add a security scan job
    console.log('5. Testing add security scan job...');
    const securityJobData = {
      type: 'security_scan',
      data: {
        projectPath: './packages/backend',
        userId: 'test-user-1',
        scanOptions: {
          securityLevel: 'high',
          enableVulnerabilityAlerts: true,
          trustedDomains: ['localhost', 'example.com'],
        },
        createdAt: new Date(),
      },
      options: {
        priority: 15,
        attempts: 3,
      }
    };

    const addSecurityJobResponse = await axios.post(`${BASE_URL}/api/queue/jobs`, securityJobData);
    console.log('✅ Security scan job added:', addSecurityJobResponse.data);
    const securityJobId = addSecurityJobResponse.data.jobId;
    console.log();

    // Test 6: Get specific job details
    console.log('6. Testing get job details...');
    const jobResponse = await axios.get(`${BASE_URL}/api/queue/jobs/${projectJobId}`);
    console.log('✅ Job details:', {
      id: jobResponse.data.id,
      type: jobResponse.data.type,
      status: jobResponse.data.status,
      priority: jobResponse.data.priority,
      progress: jobResponse.data.progress,
      createdAt: jobResponse.data.createdAt,
    });
    console.log();

    // Test 7: Get all jobs
    console.log('7. Testing get all jobs...');
    const allJobsResponse = await axios.get(`${BASE_URL}/api/queue/jobs`);
    console.log('✅ All jobs count:', allJobsResponse.data.length);
    console.log('Jobs:', allJobsResponse.data.map(job => ({
      id: job.id,
      type: job.type,
      status: job.status,
      priority: job.priority,
    })));
    console.log();

    // Test 8: Get jobs with filters
    console.log('8. Testing get jobs with filters...');
    const filteredJobsResponse = await axios.get(`${BASE_URL}/api/queue/jobs?type=project_analysis,security_scan&limit=5`);
    console.log('✅ Filtered jobs count:', filteredJobsResponse.data.length);
    console.log('Filtered jobs:', filteredJobsResponse.data.map(job => ({
      id: job.id,
      type: job.type,
      status: job.status,
    })));
    console.log();

    // Test 9: Add a flowchart generation job
    console.log('9. Testing add flowchart generation job...');
    const flowchartJobData = {
      type: 'flowchart_generation',
      data: {
        analysisId: 'test-analysis-1',
        flowchartType: 'project',
        userId: 'test-user-1',
        layoutOptions: {
          algorithm: 'hierarchical',
          spacing: 50,
          direction: 'TB',
        },
        createdAt: new Date(),
      },
      options: {
        priority: 8,
        attempts: 2,
      }
    };

    const addFlowchartJobResponse = await axios.post(`${BASE_URL}/api/queue/jobs`, flowchartJobData);
    console.log('✅ Flowchart generation job added:', addFlowchartJobResponse.data);
    console.log();

    // Test 10: Add a data compression job
    console.log('10. Testing add data compression job...');
    const compressionJobData = {
      type: 'data_compression',
      data: {
        dataKey: 'test-data-key',
        data: { message: 'This is test data for compression', numbers: [1, 2, 3, 4, 5] },
        userId: 'test-user-1',
        compressionOptions: {
          algorithm: 'gzip',
          level: 6,
          threshold: 100,
        },
        createdAt: new Date(),
      },
      options: {
        priority: 3,
        attempts: 2,
      }
    };

    const addCompressionJobResponse = await axios.post(`${BASE_URL}/api/queue/jobs`, compressionJobData);
    console.log('✅ Data compression job added:', addCompressionJobResponse.data);
    console.log();

    // Wait a moment for jobs to potentially start processing
    console.log('11. Waiting 2 seconds for job processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 11: Get updated queue statistics
    console.log('12. Testing updated queue statistics...');
    const updatedStatsResponse = await axios.get(`${BASE_URL}/api/queue/stats`);
    console.log('✅ Updated queue stats:', updatedStatsResponse.data);
    console.log();

    // Test 12: Pause and resume queue
    console.log('13. Testing pause queue...');
    const pauseResponse = await axios.post(`${BASE_URL}/api/queue/pause`);
    console.log('✅ Queue paused:', pauseResponse.data);

    console.log('14. Testing resume queue...');
    const resumeResponse = await axios.post(`${BASE_URL}/api/queue/resume`);
    console.log('✅ Queue resumed:', resumeResponse.data);
    console.log();

    // Test 13: Clean queue (remove old jobs)
    console.log('15. Testing clean queue...');
    const cleanResponse = await axios.post(`${BASE_URL}/api/queue/clean`, {
      olderThan: 1000, // 1 second ago
      status: ['completed', 'failed'],
      limit: 10,
    });
    console.log('✅ Queue cleaned:', cleanResponse.data);
    console.log();

    console.log('🎉 All Job Queue API tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
  }
}

// Run the tests
testJobQueue();