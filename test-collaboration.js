const { io } = require('socket.io-client');

console.log('🧪 Testing CodeMapr Collaboration System...\n');

// Test 1: REST API
async function testRestAPI() {
  console.log('📡 Testing REST API...');
  
  try {
    const fetch = (await import('node-fetch')).default;
    
    // Test creating a session
    const response = await fetch('http://localhost:3001/collaboration/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Session',
        projectId: 'test-project',
        createdBy: 'test-user',
      }),
    });

    if (response.ok) {
      const session = await response.json();
      console.log('✅ REST API working! Created session:', session.id);
      return session.id;
    } else {
      console.log('❌ REST API error:', response.status, response.statusText);
      return null;
    }
  } catch (error) {
    console.log('❌ REST API error:', error.message);
    return null;
  }
}

// Test 2: WebSocket Connection
function testWebSocket(sessionId) {
  return new Promise((resolve) => {
    console.log('\n🔌 Testing WebSocket connection...');
    
    const socket = io('http://localhost:3001/collaboration', {
      auth: {
        userId: 'test-user-123',
        sessionId: sessionId || 'test-session-123',
        username: 'TestUser',
        token: 'demo-token',
      },
    });

    let connected = false;

    socket.on('connect', () => {
      connected = true;
      console.log('✅ WebSocket connected successfully!');
      
      // Test document operation
      console.log('\n📝 Testing document operation...');
      socket.emit('document-operation', {
        operation: {
          type: 'insert',
          position: 0,
          content: 'Hello, World!',
        },
        documentId: 'test-document',
      }, (response) => {
        if (response.success) {
          console.log('✅ Document operation successful!');
          console.log('   Content:', response.documentState.content);
          console.log('   Version:', response.documentState.version);
        } else {
          console.log('❌ Document operation failed:', response.error);
        }
        
        socket.disconnect();
        resolve(true);
      });
    });

    socket.on('connect_error', (error) => {
      console.log('❌ WebSocket connection failed:', error.message);
      resolve(false);
    });

    socket.on('disconnect', () => {
      if (connected) {
        console.log('🔌 WebSocket disconnected');
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!connected) {
        console.log('❌ WebSocket connection timeout');
        socket.disconnect();
        resolve(false);
      }
    }, 10000);
  });
}

// Test 3: Operational Transform Stats
async function testOTStats() {
  console.log('\n📊 Testing Operational Transform stats...');
  
  try {
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch('http://localhost:3001/collaboration/operational-transform/stats');
    
    if (response.ok) {
      const stats = await response.json();
      console.log('✅ OT Stats retrieved:');
      console.log('   Total Sessions:', stats.totalSessions);
      console.log('   Total Operations:', stats.totalOperations);
      console.log('   Avg Operations/Session:', stats.averageOperationsPerSession);
    } else {
      console.log('❌ OT Stats error:', response.status);
    }
  } catch (error) {
    console.log('❌ OT Stats error:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('Backend should be running on http://localhost:3001\n');
  
  const sessionId = await testRestAPI();
  const wsSuccess = await testWebSocket(sessionId);
  await testOTStats();
  
  console.log('\n🏁 Test Summary:');
  console.log('   REST API:', sessionId ? '✅ Working' : '❌ Failed');
  console.log('   WebSocket:', wsSuccess ? '✅ Working' : '❌ Failed');
  console.log('\nIf all tests pass, the collaboration system is working correctly!');
  
  process.exit(0);
}

runTests().catch(console.error);