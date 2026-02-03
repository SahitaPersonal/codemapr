'use client';

import React, { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { FlowchartData, NodeType } from '@codemapr/shared';

interface FlowchartFiltersProps {
  filters: {
    complexity: { min: number; max: number };
    nodeTypes: NodeType[];
    showLabels: boolean;
    showMiniMap: boolean;
  };
  onFiltersChange: (filters: any) => void;
  flowchartData: FlowchartData;
}

export function FlowchartFilters({ 
  filters, 
  onFiltersChange, 
  flowchartData 
}: FlowchartFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleComplexityChange = (type: 'min' | 'max', value: number) => {
    onFiltersChange({
      ...filters,
      complexity: {
        ...filters.complexity,
        [type]: value,
      },
    });
  };

  const handleNodeTypeToggle = (nodeType: NodeType) => {
    const newNodeTypes = filters.nodeTypes.includes(nodeType)
      ? filters.nodeTypes.filter(type => type !== nodeType)
      : [...filters.nodeTypes, nodeType];
    
    onFiltersChange({
      ...filters,
      nodeTypes: newNodeTypes,
    });
  };

  const handleToggleOption = (option: 'showLabels' | 'showMiniMap') => {
    onFiltersChange({
      ...filters,
      [option]: !filters[option],
    });
  };

  const resetFilters = () => {
    onFiltersChange({
      complexity: { min: 0, max: 100 },
      nodeTypes: Object.values(NodeType),
      showLabels: true,
      showMiniMap: true,
    });
  };

  // Get unique node types from the flowchart data
  const availableNodeTypes = Array.from(
    new Set(flowchartData.nodes.map(node => node.type))
  );

  // Calculate complexity range from data
  const complexities = flowchartData.nodes
    .map(node => node.data.complexity || 0)
    .filter(c => c > 0);
  const minComplexity = Math.min(...complexities, 0);
  const maxComplexity = Math.max(...complexities, 100);

  const getNodeTypeLabel = (nodeType: NodeType): string => {
    switch (nodeType) {
      case NodeType.FUNCTION: return 'Functions';
      case NodeType.CLASS: return 'Classes';
      case NodeType.COMPONENT: return 'Components';
      case NodeType.SERVICE_CALL: return 'Service Calls';
      case NodeType.DATABASE: return 'Database';
      case NodeType.API_ENDPOINT: return 'API Endpoints';
      case NodeType.FILE: return 'Files';
      case NodeType.MODULE: return 'Modules';
      default: return nodeType;
    }
  };

  const getNodeTypeColor = (nodeType: NodeType): string => {
    switch (nodeType) {
      case NodeType.FUNCTION: return 'bg-blue-100 text-blue-800';
      case NodeType.CLASS: return 'bg-green-100 text-green-800';
      case NodeType.COMPONENT: return 'bg-yellow-100 text-yellow-800';
      case NodeType.SERVICE_CALL: return 'bg-pink-100 text-pink-800';
      case NodeType.DATABASE: return 'bg-purple-100 text-purple-800';
      case NodeType.API_ENDPOINT: return 'bg-indigo-100 text-indigo-800';
      case NodeType.FILE: return 'bg-gray-100 text-gray-800';
      case NodeType.MODULE: return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="absolute bottom-4 left-4 z-10">
      {/* Filter Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 flex items-center gap-2 hover:bg-gray-50 transition-colors"
        style={{ color: '#374151' }}
      >
        <Filter size={16} style={{ color: '#6b7280' }} />
        <span className="text-sm font-medium" style={{ color: '#374151' }}>Filters</span>
        {isOpen ? 
          <ChevronUp size={16} style={{ color: '#6b7280' }} /> : 
          <ChevronDown size={16} style={{ color: '#6b7280' }} />
        }
      </button>

      {/* Filter Panel */}
      {isOpen && (
        <div className="mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[300px] max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: '#111827' }}>Filters</h3>
            <div className="flex gap-2">
              <button
                onClick={resetFilters}
                className="text-sm font-medium hover:underline"
                style={{ color: '#2563eb' }}
              >
                Reset
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
                style={{ color: '#6b7280' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Complexity Filter */}
          {maxComplexity > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
                Complexity Range
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <input
                    type="range"
                    min={minComplexity}
                    max={maxComplexity}
                    value={filters.complexity.min}
                    onChange={(e) => handleComplexityChange('min', parseInt(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <div className="text-xs mt-1" style={{ color: '#6b7280' }}>
                    Min: {filters.complexity.min}
                  </div>
                </div>
                <div className="flex-1">
                  <input
                    type="range"
                    min={minComplexity}
                    max={maxComplexity}
                    value={filters.complexity.max}
                    onChange={(e) => handleComplexityChange('max', parseInt(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <div className="text-xs mt-1" style={{ color: '#6b7280' }}>
                    Max: {filters.complexity.max}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Node Type Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
              Node Types
            </label>
            <div className="space-y-2">
              {availableNodeTypes.map((nodeType) => (
                <label key={nodeType} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.nodeTypes.includes(nodeType)}
                    onChange={() => handleNodeTypeToggle(nodeType)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getNodeTypeColor(nodeType)}`}>
                    {getNodeTypeLabel(nodeType)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Display Options */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
              Display Options
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showLabels}
                  onChange={() => handleToggleOption('showLabels')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm" style={{ color: '#374151' }}>Show Labels</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showMiniMap}
                  onChange={() => handleToggleOption('showMiniMap')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm" style={{ color: '#374151' }}>Show MiniMap</span>
              </label>
            </div>
          </div>

          {/* Filter Summary */}
          <div className="pt-4 border-t border-gray-200">
            <div className="text-sm" style={{ color: '#6b7280' }}>
              Showing {flowchartData.nodes.filter(node => {
                const complexity = node.data.complexity || 0;
                return complexity >= filters.complexity.min && 
                       complexity <= filters.complexity.max &&
                       filters.nodeTypes.includes(node.type);
              }).length} of {flowchartData.nodes.length} nodes
            </div>
          </div>
        </div>
      )}
    </div>
  );
}