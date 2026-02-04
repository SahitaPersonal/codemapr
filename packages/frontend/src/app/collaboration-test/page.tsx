'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface UserPresence {
  userId: string;
  username: string;
  avatar?: string;
  cursor?: {
    x: number;
    y: number;
    file?: string;
  };
  selection?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
    file: string;
  };
  status: 'active' | 'idle' | 'away';
  lastActivity: Date;
}

export default function CollaborationTestPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState('test-session-123');
  const [userId, setUserId] = useState('user-' + Math.random().toString(36).substring(2, 11));
  const [username, setUsername] = useState('TestUser' + Math.floor(Math.random() * 1000));
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [documentContent, setDocumentContent] = useState('');
  const [documentVersion, setDocumentVersion] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), `[${timestamp}] ${message}`]);
  };

  const connectToSession = async () => {
    if (socket) {
      socket.disconnect();
    }

    setIsConnecting(true);
    addLog('Connecting to collaboration session...');

    try {
      // First, create or ensure the session exists
      addLog('Creating/checking session...');
      const response = await fetch('http://localhost:3001/collaboration/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Session ${sessionId}`,
          projectId: 'test-project',
          createdBy: userId,
        }),
      });

      if (!response.ok) {
        // Session might already exist, that's okay
        addLog('Session already exists or created');
      } else {
        const session = await response.json();
        addLog(`Session ready: ${session.id}`);
      }

      // Now connect to WebSocket
      addLog('Connecting to WebSocket...');
      const newSocket = io('http://localhost:3001/collaboration', {
        auth: {
          userId,
          sessionId,
          username,
          token: 'demo-token', // In real app, use actual JWT
        },
        transports: ['websocket', 'polling'],
      });

    newSocket.on('connect', () => {
      setConnected(true);
      setIsConnecting(false);
      addLog('Connected to collaboration session');
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      addLog('Disconnected from collaboration session');
    });

    newSocket.on('connect_error', (error) => {
      setIsConnecting(false);
      addLog(`Connection error: ${error.message}`);
    });

    // User presence events
    newSocket.on('user-joined', (userData) => {
      addLog(`User ${userData.user.username} joined the session`);
    });

    newSocket.on('user-left', () => {
      addLog(`User left the session`);
    });

    newSocket.on('session-state', (data) => {
      setUsers(data.users);
      addLog(`Session state received: ${data.users.length} users`);
    });

    newSocket.on('user-status-change', (data) => {
      addLog(`User status changed to ${data.status}`);
    });

    // Document synchronization events
    newSocket.on('document-operation-applied', (data) => {
      addLog(`Document operation applied: ${data.operation.type} at position ${data.operation.position}`);
      if (data.documentState) {
        setDocumentContent(data.documentState.content);
        setDocumentVersion(data.documentState.version);
      }
    });

    newSocket.on('live-cursor-updated', (data) => {
      addLog(`Cursor updated by ${data.username} at position ${data.cursor.position}`);
    });

    newSocket.on('live-selection-updated', (data) => {
      addLog(`Selection updated by ${data.username}: ${data.selection.start}-${data.selection.end}`);
    });

    // Annotation events
    newSocket.on('annotation-added', (data) => {
      addLog(`Annotation added: ${data.annotation.type} - ${data.annotation.content}`);
    });

    setSocket(newSocket);
    } catch (error: any) {
      setIsConnecting(false);
      addLog(`Failed to connect: ${error.message}`);
    }
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
      addLog('Manually disconnected');
    }
  };

  const sendDocumentOperation = (type: 'insert' | 'delete', position: number, content?: string, length?: number) => {
    if (!socket || !connected) {
      addLog('Not connected to session');
      return;
    }

    const operation = {
      type,
      position,
      content,
      length,
    };

    socket.emit('document-operation', {
      operation,
      documentId: 'test-document',
    }, (response: any) => {
      if (response.success) {
        addLog(`Operation sent successfully: ${type} at ${position}`);
        if (response.documentState) {
          setDocumentContent(response.documentState.content);
          setDocumentVersion(response.documentState.version);
        }
      } else {
        addLog(`Operation failed: ${response.error}`);
      }
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const oldContent = documentContent;
    
    // Simple diff to detect changes
    if (newContent.length > oldContent.length) {
      // Insertion
      const insertPosition = e.target.selectionStart - (newContent.length - oldContent.length);
      const insertedText = newContent.slice(insertPosition, e.target.selectionStart);
      sendDocumentOperation('insert', insertPosition, insertedText);
    } else if (newContent.length < oldContent.length) {
      // Deletion
      const deletePosition = e.target.selectionStart;
      const deleteLength = oldContent.length - newContent.length;
      sendDocumentOperation('delete', deletePosition, undefined, deleteLength);
    }
    
    setDocumentContent(newContent);
  };

  const handleCursorMove = (e: React.ChangeEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLTextAreaElement> | React.MouseEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const position = target.selectionStart;
    setCursorPosition(position);
    
    if (socket && connected) {
      socket.emit('live-cursor-update', {
        documentId: 'test-document',
        cursor: {
          position,
          color: '#3b82f6',
        },
      });
    }
  };

  const sendTestAnnotation = () => {
    if (!socket || !connected) {
      addLog('Not connected to session');
      return;
    }

    socket.emit('add-annotation', {
      file: 'test-document',
      line: 1,
      column: cursorPosition,
      content: 'This is a test annotation',
      type: 'comment',
    }, (response: any) => {
      if (response.success) {
        addLog('Annotation added successfully');
      } else {
        addLog(`Annotation failed: ${response.error}`);
      }
    });
  };

  const requestDocumentSync = () => {
    if (!socket || !connected) {
      addLog('Not connected to session');
      return;
    }

    socket.emit('document-sync-request', {
      documentId: 'test-document',
      clientVersion: documentVersion,
    }, (response: any) => {
      if (response.success) {
        addLog(`Document synced: version ${response.documentState.version}`);
        setDocumentContent(response.documentState.content);
        setDocumentVersion(response.documentState.version);
      } else {
        addLog(`Sync failed: ${response.error}`);
      }
    });
  };

  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Collaboration Test Page
        </h1>

        {/* Connection Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Connection</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session ID
              </label>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                disabled={connected}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User ID
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                disabled={connected}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                disabled={connected}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={connectToSession}
              disabled={connected || isConnecting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isConnecting ? 'Connecting...' : connected ? 'Connected' : 'Connect'}
            </button>
            
            <button
              onClick={disconnect}
              disabled={!connected}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Disconnect
            </button>

            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Document Editor */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Collaborative Document (v{documentVersion})
            </h2>
            
            <textarea
              ref={textareaRef}
              value={documentContent}
              onChange={handleTextChange}
              onSelect={handleCursorMove}
              onKeyUp={handleCursorMove}
              onClick={handleCursorMove}
              placeholder="Start typing to test real-time collaboration..."
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-white text-gray-900 placeholder-gray-500"
              disabled={!connected}
            />
            
            <div className="mt-4 flex gap-2">
              <button
                onClick={sendTestAnnotation}
                disabled={!connected}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                Add Annotation
              </button>
              
              <button
                onClick={requestDocumentSync}
                disabled={!connected}
                className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
              >
                Sync Document
              </button>
              
              <span className="text-sm text-gray-600 flex items-center">
                Cursor: {cursorPosition}
              </span>
            </div>
          </div>

          {/* Session Info */}
          <div className="space-y-6">
            {/* Active Users */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Active Users ({users.length})
              </h2>
              
              {users.length === 0 ? (
                <p className="text-gray-500 text-sm">No users connected</p>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div key={user.userId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium text-gray-900">{user.username}</span>
                        <span className="text-sm text-gray-500 ml-2">({user.userId.slice(0, 8)}...)</span>
                      </div>
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          user.status === 'active' ? 'bg-green-500' : 
                          user.status === 'idle' ? 'bg-yellow-500' : 'bg-gray-500'
                        }`}></div>
                        <span className="text-xs text-gray-500 capitalize">{user.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity Log */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Activity Log</h2>
              
              <div className="h-64 overflow-y-auto bg-gray-50 rounded p-3">
                {logs.length === 0 ? (
                  <p className="text-gray-500 text-sm">No activity yet</p>
                ) : (
                  <div className="space-y-1">
                    {logs.map((log, index) => (
                      <div key={index} className="text-xs text-gray-700 font-mono">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => setLogs([])}
                className="mt-2 px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
              >
                Clear Log
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}