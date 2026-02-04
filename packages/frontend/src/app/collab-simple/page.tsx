'use client';

import React, { useState, useEffect } from 'react';

export default function SimpleCollabPage() {
  const [status, setStatus] = useState('Ready to test collaboration');
  const [backendStatus, setBackendStatus] = useState('Checking...');

  useEffect(() => {
    // Test backend connectivity
    fetch('http://localhost:3001/api/docs')
      .then(() => setBackendStatus('✅ Backend is running'))
      .catch(() => setBackendStatus('❌ Backend is not accessible'));
  }, []);

  const testWebSocket = async () => {
    setStatus('Testing WebSocket connection...');
    
    try {
      // Dynamic import to avoid SSR issues
      const { io } = await import('socket.io-client');
      
      const socket = io('http://localhost:3001/collaboration', {
        auth: {
          userId: 'test-user-123',
          sessionId: 'test-session-123',
          username: 'TestUser',
          token: 'demo-token',
        },
      });

      socket.on('connect', () => {
        setStatus('✅ WebSocket connected successfully!');
        socket.disconnect();
      });

      socket.on('connect_error', (error) => {
        setStatus(`❌ WebSocket connection failed: ${error.message}`);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (socket.connected) {
          socket.disconnect();
        } else {
          setStatus('❌ WebSocket connection timeout');
        }
      }, 5000);

    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const testRestAPI = async () => {
    setStatus('Testing REST API...');
    
    try {
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
        setStatus(`✅ REST API working! Created session: ${session.id}`);
      } else {
        setStatus(`❌ REST API error: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      setStatus(`❌ REST API error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Simple Collaboration Test
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Backend Status</h2>
          <p className="text-lg text-gray-700 mb-4">{backendStatus}</p>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Test Status:</h3>
              <p className="text-gray-700">{status}</p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={testWebSocket}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Test WebSocket Connection
              </button>
              
              <button
                onClick={testRestAPI}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Test REST API
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Endpoints</h2>
          
          <div className="space-y-2 text-sm text-gray-700">
            <div><strong className="text-gray-900">Backend:</strong> http://localhost:3001</div>
            <div><strong className="text-gray-900">API Docs:</strong> http://localhost:3001/api/docs</div>
            <div><strong className="text-gray-900">WebSocket:</strong> http://localhost:3001/collaboration</div>
            <div><strong className="text-gray-900">Full Test:</strong> /collaboration-test (if working)</div>
          </div>
        </div>
      </div>
    </div>
  );
}