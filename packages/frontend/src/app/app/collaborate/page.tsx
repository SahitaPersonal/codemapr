'use client';

import { useState } from 'react';
import { ArrowLeft, Users, MessageSquare, Video, Share2, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function CollaboratePage() {
  const [activeUsers, setActiveUsers] = useState([
    { id: 1, name: 'You', color: 'bg-blue-500', status: 'active' },
    { id: 2, name: 'Alice Johnson', color: 'bg-green-500', status: 'active' },
    { id: 3, name: 'Bob Smith', color: 'bg-purple-500', status: 'idle' }
  ]);

  const [comments, setComments] = useState([
    {
      id: 1,
      user: 'Alice Johnson',
      avatar: 'bg-green-500',
      text: 'This function looks complex, should we refactor it?',
      time: '2 minutes ago',
      line: 45
    },
    {
      id: 2,
      user: 'You',
      avatar: 'bg-blue-500',
      text: 'Good idea! Let me break it down into smaller functions.',
      time: '1 minute ago',
      line: 45
    }
  ]);

  const [newComment, setNewComment] = useState('');

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    setComments([...comments, {
      id: comments.length + 1,
      user: 'You',
      avatar: 'bg-blue-500',
      text: newComment,
      time: 'Just now',
      line: 0
    }]);
    setNewComment('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/app"
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Collaboration Session</h1>
              <p className="text-sm text-gray-500">Real-time code review and discussion</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-2">
              <Video className="w-4 h-4" />
              <span>Start Call</span>
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2">
              <UserPlus className="w-4 h-4" />
              <span>Invite</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* Active Users */}
            <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Active Participants ({activeUsers.length})
                </h2>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View All
                </button>
              </div>
              
              <div className="flex items-center space-x-4">
                {activeUsers.map(user => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <div className={`w-10 h-10 ${user.color} rounded-full flex items-center justify-center text-white font-medium relative`}>
                      {user.name.charAt(0)}
                      {user.status === 'active' && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{user.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shared Flowchart Preview */}
            <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Shared Flowchart</h2>
              <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Share2 className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-gray-600">Flowchart will appear here</p>
                  <p className="text-sm text-gray-500 mt-2">All participants can view and annotate in real-time</p>
                </div>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    A
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Alice Johnson</span> added an annotation at line 45
                    </p>
                    <p className="text-xs text-gray-500 mt-1">5 minutes ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    Y
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">You</span> generated a new flowchart
                    </p>
                    <p className="text-xs text-gray-500 mt-1">10 minutes ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    B
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Bob Smith</span> joined the session
                    </p>
                    <p className="text-xs text-gray-500 mt-1">15 minutes ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comments Sidebar */}
        <aside className="w-96 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Comments & Annotations
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {comments.map(comment => (
              <div key={comment.id} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3 mb-2">
                  <div className={`w-8 h-8 ${comment.avatar} rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0`}>
                    {comment.user.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">{comment.user}</p>
                      <p className="text-xs text-gray-500 flex-shrink-0 ml-2">{comment.time}</p>
                    </div>
                    {comment.line > 0 && (
                      <p className="text-xs text-blue-600">Line {comment.line}</p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700">{comment.text}</p>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                placeholder="Add a comment..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 placeholder-gray-400"
              />
              <button
                onClick={handleAddComment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Send
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
