'use client';

import React, { useState } from 'react';
import { FlowchartViewer } from '../../components/flowchart/FlowchartViewer';
import { mockFlowchartData } from '../../lib/mockFlowchartData';
import { ArrowLeft, Code, FileText } from 'lucide-react';
import Link from 'next/link';

export default function DemoPage() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const handleNodeClick = (nodeId: string, nodeData: any) => {
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
    console.log('Node clicked:', nodeId, nodeData);
  };

  const handleEdgeClick = (edgeId: string, edgeData: any) => {
    setSelectedEdgeId(edgeId);
    setSelectedNodeId(null);
    console.log('Edge clicked:', edgeId, edgeData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Home</span>
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <Code className="text-blue-600" size={24} />
              <h1 className="text-xl font-semibold text-gray-900">
                CodeMapr - Interactive Flowchart Demo
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <FileText size={16} />
              <span>{mockFlowchartData.metadata.totalNodes} nodes</span>
            </div>
            <div className="flex items-center gap-2">
              <span>•</span>
              <span>{mockFlowchartData.metadata.totalEdges} edges</span>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
        <div className="flex items-center gap-2 text-blue-800 text-sm">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
          <span>
            <strong>Interactive Demo:</strong> Click on nodes and edges to see details. 
            Use the controls to zoom, pan, and filter the flowchart. 
            Try dragging nodes to rearrange the layout.
          </span>
        </div>
      </div>

      {/* Flowchart Viewer */}
      <div className="h-[calc(100vh-140px)]">
        <FlowchartViewer
          flowchartData={mockFlowchartData}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          className="w-full h-full"
        />
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-gray-200 px-6 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span>Status: Ready</span>
            {selectedNodeId && (
              <span className="text-blue-600">
                Selected Node: {selectedNodeId}
              </span>
            )}
            {selectedEdgeId && (
              <span className="text-green-600">
                Selected Edge: {selectedEdgeId}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <span>Layout: {mockFlowchartData.layout.algorithm}</span>
            <span>•</span>
            <span>Generated: {mockFlowchartData.metadata.generatedAt.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}