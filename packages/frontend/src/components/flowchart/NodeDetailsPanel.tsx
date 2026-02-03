'use client';

import React from 'react';
import { X, ExternalLink, Code, FileText, Zap, Database } from 'lucide-react';
import { Node, Edge } from 'reactflow';
import { NodeType, EdgeType } from '@codemapr/shared';

interface NodeDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  onNavigateToSource: (sourceLocation: any) => void;
}

export function NodeDetailsPanel({
  isOpen,
  onClose,
  selectedNode,
  selectedEdge,
  onNavigateToSource,
}: NodeDetailsPanelProps) {
  if (!isOpen) return null;

  const getNodeIcon = (nodeType: NodeType) => {
    switch (nodeType) {
      case NodeType.FUNCTION:
        return <Code size={20} className="text-blue-600" />;
      case NodeType.CLASS:
        return <FileText size={20} className="text-green-600" />;
      case NodeType.COMPONENT:
        return <Zap size={20} className="text-yellow-600" />;
      case NodeType.SERVICE_CALL:
        return <ExternalLink size={20} className="text-pink-600" />;
      case NodeType.DATABASE:
        return <Database size={20} className="text-purple-600" />;
      case NodeType.FILE:
        return <FileText size={20} className="text-gray-600" />;
      default:
        return <Code size={20} className="text-gray-600" />;
    }
  };

  const getNodeTypeLabel = (nodeType: NodeType): string => {
    switch (nodeType) {
      case NodeType.FUNCTION: return 'Function';
      case NodeType.CLASS: return 'Class';
      case NodeType.COMPONENT: return 'Component';
      case NodeType.SERVICE_CALL: return 'Service Call';
      case NodeType.DATABASE: return 'Database';
      case NodeType.API_ENDPOINT: return 'API Endpoint';
      case NodeType.FILE: return 'File';
      case NodeType.MODULE: return 'Module';
      default: return nodeType;
    }
  };

  const getEdgeTypeLabel = (edgeType: EdgeType): string => {
    switch (edgeType) {
      case EdgeType.FUNCTION_CALL: return 'Function Call';
      case EdgeType.IMPORT: return 'Import';
      case EdgeType.EXTENDS: return 'Extends';
      case EdgeType.IMPLEMENTS: return 'Implements';
      case EdgeType.HTTP_REQUEST: return 'HTTP Request';
      case EdgeType.DATABASE_QUERY: return 'Database Query';
      default: return edgeType;
    }
  };

  const formatComplexity = (complexity?: number): string => {
    if (!complexity) return 'N/A';
    if (complexity <= 5) return `${complexity} (Low)`;
    if (complexity <= 10) return `${complexity} (Medium)`;
    return `${complexity} (High)`;
  };

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-white shadow-lg border-l border-gray-200 z-20 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {selectedNode ? 'Node Details' : 'Edge Details'}
        </h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {selectedNode && (
          <div className="space-y-6">
            {/* Node Header */}
            <div className="flex items-start gap-3">
              {getNodeIcon(selectedNode.type as NodeType)}
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedNode.data.label}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {getNodeTypeLabel(selectedNode.type as NodeType)}
                </p>
                {selectedNode.data.description && (
                  <p className="text-sm text-gray-700 mt-2">
                    {selectedNode.data.description}
                  </p>
                )}
              </div>
            </div>

            {/* Source Location */}
            {selectedNode.data.sourceLocation && (
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Source Location
                </h4>
                <div className="text-sm text-gray-700 space-y-1">
                  <div>
                    <span className="font-medium">File:</span>{' '}
                    {selectedNode.data.sourceLocation.filePath}
                  </div>
                  <div>
                    <span className="font-medium">Lines:</span>{' '}
                    {selectedNode.data.sourceLocation.startLine}-{selectedNode.data.sourceLocation.endLine}
                  </div>
                </div>
                <button
                  onClick={() => onNavigateToSource(selectedNode.data.sourceLocation)}
                  className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink size={14} />
                  Open in Editor
                </button>
              </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4">
              {selectedNode.data.complexity !== undefined && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-blue-900 mb-1">
                    Complexity
                  </h4>
                  <p className="text-lg font-semibold text-blue-700">
                    {formatComplexity(selectedNode.data.complexity)}
                  </p>
                </div>
              )}

              {selectedNode.data.executionTime !== undefined && (
                <div className="bg-green-50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-green-900 mb-1">
                    Execution Time
                  </h4>
                  <p className="text-lg font-semibold text-green-700">
                    {selectedNode.data.executionTime}ms
                  </p>
                </div>
              )}
            </div>

            {/* Metadata */}
            {selectedNode.data.metadata && Object.keys(selectedNode.data.metadata).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Additional Information
                </h4>
                <div className="space-y-2">
                  {Object.entries(selectedNode.data.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-600 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <span className="text-gray-900 font-medium">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Service Call Details */}
            {selectedNode.data.isServiceCall && (
              <div className="bg-pink-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-pink-900 mb-2">
                  Service Call Details
                </h4>
                <div className="text-sm text-pink-800">
                  <div>Type: {selectedNode.data.serviceType || 'Unknown'}</div>
                  {selectedNode.data.metadata?.endpoint && (
                    <div>Endpoint: {selectedNode.data.metadata.endpoint}</div>
                  )}
                  {selectedNode.data.metadata?.method && (
                    <div>Method: {selectedNode.data.metadata.method}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedEdge && (
          <div className="space-y-6">
            {/* Edge Header */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedEdge.data?.label || 'Connection'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {getEdgeTypeLabel(selectedEdge.type as EdgeType)}
              </p>
            </div>

            {/* Connection Details */}
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Connection
              </h4>
              <div className="text-sm text-gray-700 space-y-1">
                <div>
                  <span className="font-medium">From:</span> {selectedEdge.source}
                </div>
                <div>
                  <span className="font-medium">To:</span> {selectedEdge.target}
                </div>
                <div>
                  <span className="font-medium">Type:</span>{' '}
                  {selectedEdge.data?.callType || 'Unknown'}
                </div>
                {selectedEdge.data?.isAsync && (
                  <div className="text-blue-600 font-medium">Asynchronous</div>
                )}
              </div>
            </div>

            {/* Parameters */}
            {selectedEdge.data?.parameters && selectedEdge.data.parameters.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Parameters
                </h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <ul className="text-sm text-gray-700 space-y-1">
                    {selectedEdge.data.parameters.map((param: string, index: number) => (
                      <li key={index} className="font-mono">
                        {param}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Edge Metadata */}
            {selectedEdge.data?.metadata && Object.keys(selectedEdge.data.metadata).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Additional Information
                </h4>
                <div className="space-y-2">
                  {Object.entries(selectedEdge.data.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-600 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <span className="text-gray-900 font-medium">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}