'use client';

import React, { useState, useCallback } from 'react';
import { FlowchartViewer } from '../../components/flowchart/FlowchartViewer';
import { mockPerformanceFlowchartData } from '../../lib/mockPerformanceFlowchartData';
import { 
  Activity, 
  Flame, 
  Shield, 
  Clock, 
  Cpu, 
  HardDrive as MemoryIcon, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Gauge
} from 'lucide-react';

export default function PerformanceDemoPage() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark' | 'ocean'>('light');

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const selectedNode = selectedNodeId 
    ? mockPerformanceFlowchartData.nodes.find(n => n.id === selectedNodeId)
    : null;

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getPerformanceIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 60) return <Activity className="w-5 h-5 text-yellow-600" />;
    if (score >= 40) return <AlertTriangle className="w-5 h-5 text-orange-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  const projectMetrics = mockPerformanceFlowchartData.metadata.performanceMetrics;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Performance Analysis Demo</h1>
              <p className="text-gray-600 mt-1">
                Interactive visualization of code performance metrics and bottlenecks
              </p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'ocean')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="light">Light Theme</option>
                <option value="dark">Dark Theme</option>
                <option value="ocean">Ocean Theme</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Performance Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Score</p>
                <p className="text-2xl font-bold text-gray-900">55%</p>
              </div>
              <Gauge className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bottlenecks</p>
                <p className="text-2xl font-bold text-red-600">{projectMetrics?.totalBottlenecks || 4}</p>
              </div>
              <Flame className="w-8 h-8 text-red-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Issues</p>
                <p className="text-2xl font-bold text-red-600">{projectMetrics?.criticalIssues || 2}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Issues</p>
                <p className="text-2xl font-bold text-orange-600">{projectMetrics?.highIssues || 3}</p>
              </div>
              <XCircle className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Optimizations</p>
                <p className="text-2xl font-bold text-green-600">{projectMetrics?.optimizationOpportunities || 8}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Flowchart */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Performance Flowchart</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Click on nodes to see detailed performance metrics. Red borders indicate bottlenecks.
                </p>
              </div>
              <div className="h-[600px]">
                <FlowchartViewer
                  flowchartData={{
                    ...mockPerformanceFlowchartData,
                    nodes: mockPerformanceFlowchartData.nodes.map(node => ({
                      ...node,
                      data: {
                        ...node.data,
                        theme,
                      },
                    })),
                  }}
                  onNodeClick={handleNodeClick}
                  theme={theme}
                />
              </div>
            </div>
          </div>

          {/* Node Details Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Node Details</h3>
              </div>
              <div className="p-4">
                {selectedNode ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900">{selectedNode.data.label}</h4>
                      <p className="text-sm text-gray-600 mt-1">{selectedNode.data.description}</p>
                    </div>

                    {/* Performance Metrics */}
                    {selectedNode.data.performanceScore !== undefined && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          {getPerformanceIcon(selectedNode.data.performanceScore)}
                          <span className="font-medium text-gray-900">Performance</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Score:</span>
                            <span className={`text-sm font-medium ${getPerformanceColor(selectedNode.data.performanceScore)}`}>
                              {selectedNode.data.performanceScore}%
                            </span>
                          </div>
                          {selectedNode.data.executionTime && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Execution:</span>
                              <span className="text-sm font-medium text-gray-900">
                                {selectedNode.data.executionTime}ms
                              </span>
                            </div>
                          )}
                          {selectedNode.data.cpuUsage !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">CPU:</span>
                              <span className={`text-sm font-medium ${
                                selectedNode.data.cpuUsage > 80 ? 'text-red-600' :
                                selectedNode.data.cpuUsage > 60 ? 'text-yellow-600' : 'text-green-600'
                              }`}>
                                {selectedNode.data.cpuUsage}%
                              </span>
                            </div>
                          )}
                          {selectedNode.data.memoryUsage !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Memory:</span>
                              <span className={`text-sm font-medium ${
                                selectedNode.data.memoryUsage > 100 ? 'text-red-600' :
                                selectedNode.data.memoryUsage > 50 ? 'text-yellow-600' : 'text-green-600'
                              }`}>
                                {selectedNode.data.memoryUsage}MB
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Security Score */}
                    {selectedNode.data.securityScore !== undefined && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-gray-900">Security</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Score:</span>
                          <span className={`text-sm font-medium ${getPerformanceColor(selectedNode.data.securityScore)}`}>
                            {selectedNode.data.securityScore}%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Complexity */}
                    {selectedNode.data.complexity && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-5 h-5 text-purple-600" />
                          <span className="font-medium text-gray-900">Complexity</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Score:</span>
                          <span className={`text-sm font-medium ${
                            selectedNode.data.complexity > 15 ? 'text-red-600' :
                            selectedNode.data.complexity > 10 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {selectedNode.data.complexity}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Bottleneck Warning */}
                    {selectedNode.data.isBottleneck && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Flame className="w-5 h-5 text-red-600" />
                          <span className="font-medium text-red-800">Performance Bottleneck</span>
                        </div>
                        <p className="text-sm text-red-700 mt-1">
                          This component is identified as a performance bottleneck and requires optimization.
                        </p>
                      </div>
                    )}

                    {/* Performance Issues */}
                    {selectedNode.data.performanceIssues && selectedNode.data.performanceIssues.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Performance Issues</h5>
                        <div className="space-y-2">
                          {selectedNode.data.performanceIssues.map((issue: any, index: number) => (
                            <div key={index} className="bg-orange-50 border border-orange-200 rounded p-2">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="w-4 h-4 text-orange-600" />
                                <span className="text-sm font-medium text-orange-800">{issue.title}</span>
                              </div>
                              <p className="text-xs text-orange-700">{issue.description}</p>
                              <p className="text-xs text-orange-600 mt-1 font-medium">
                                Impact: {issue.estimatedImpact}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Security Issues */}
                    {selectedNode.data.securityVulnerabilities && selectedNode.data.securityVulnerabilities.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Security Issues</h5>
                        <div className="space-y-2">
                          {selectedNode.data.securityVulnerabilities.map((vuln: any, index: number) => (
                            <div key={index} className="bg-red-50 border border-red-200 rounded p-2">
                              <div className="flex items-center gap-2 mb-1">
                                <Shield className="w-4 h-4 text-red-600" />
                                <span className="text-sm font-medium text-red-800">{vuln.title}</span>
                              </div>
                              <p className="text-xs text-red-700">{vuln.description}</p>
                              <p className="text-xs text-red-600 mt-1 font-medium">
                                CWE: {vuln.cweId}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Activity className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>Click on a node to view detailed performance metrics</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Indicators Legend</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-600 rounded"></div>
              <span className="text-sm text-gray-700">Good Performance (80%+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-600 rounded"></div>
              <span className="text-sm text-gray-700">Fair Performance (60-79%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-100 border-2 border-orange-600 rounded"></div>
              <span className="text-sm text-gray-700">Poor Performance (40-59%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border-2 border-red-600 rounded animate-pulse"></div>
              <span className="text-sm text-gray-700">Critical Bottleneck (&lt;40%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}