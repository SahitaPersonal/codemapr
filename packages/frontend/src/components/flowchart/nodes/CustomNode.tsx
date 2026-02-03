'use client';

import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  Code, 
  FileText, 
  Zap, 
  ExternalLink, 
  Database, 
  Globe,
  Package,
  AlertCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { NodeType } from '@codemapr/shared';

interface CustomNodeData {
  label: string;
  description?: string;
  complexity?: number;
  executionTime?: number;
  isServiceCall?: boolean;
  showLabel?: boolean;
  metadata?: Record<string, any>;
  theme?: 'light' | 'dark' | 'ocean';
}

export const CustomNode = memo(({ data, type, selected }: NodeProps<CustomNodeData>) => {
  const [isHovered, setIsHovered] = useState(false);
  const nodeType = type as NodeType;
  const theme = data.theme || 'light';

  const getNodeIcon = () => {
    const iconProps = { size: 18, className: "transition-all duration-200" };
    
    switch (nodeType) {
      case NodeType.FUNCTION:
        return <Code {...iconProps} className={`${iconProps.className} text-blue-600`} />;
      case NodeType.CLASS:
        return <FileText {...iconProps} className={`${iconProps.className} text-green-600`} />;
      case NodeType.COMPONENT:
        return <Zap {...iconProps} className={`${iconProps.className} text-yellow-600`} />;
      case NodeType.SERVICE_CALL:
        return <ExternalLink {...iconProps} className={`${iconProps.className} text-pink-600`} />;
      case NodeType.DATABASE:
        return <Database {...iconProps} className={`${iconProps.className} text-purple-600`} />;
      case NodeType.API_ENDPOINT:
        return <Globe {...iconProps} className={`${iconProps.className} text-indigo-600`} />;
      case NodeType.FILE:
        return <FileText {...iconProps} className={`${iconProps.className} text-gray-600`} />;
      case NodeType.MODULE:
        return <Package {...iconProps} className={`${iconProps.className} text-orange-600`} />;
      default:
        return <Code {...iconProps} className={`${iconProps.className} text-gray-600`} />;
    }
  };

  const getNodeColors = () => {
    const baseColors = {
      light: {
        [NodeType.FUNCTION]: {
          bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
          border: 'border-blue-300',
          text: 'text-blue-900',
          accent: 'bg-blue-500',
          shadow: 'shadow-blue-200/50',
          glow: 'shadow-blue-400/30',
        },
        [NodeType.CLASS]: {
          bg: 'bg-gradient-to-br from-green-50 to-green-100',
          border: 'border-green-300',
          text: 'text-green-900',
          accent: 'bg-green-500',
          shadow: 'shadow-green-200/50',
          glow: 'shadow-green-400/30',
        },
        [NodeType.COMPONENT]: {
          bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
          border: 'border-yellow-300',
          text: 'text-yellow-900',
          accent: 'bg-yellow-500',
          shadow: 'shadow-yellow-200/50',
          glow: 'shadow-yellow-400/30',
        },
        [NodeType.SERVICE_CALL]: {
          bg: 'bg-gradient-to-br from-pink-50 to-pink-100',
          border: 'border-pink-300',
          text: 'text-pink-900',
          accent: 'bg-pink-500',
          shadow: 'shadow-pink-200/50',
          glow: 'shadow-pink-400/30',
        },
        [NodeType.DATABASE]: {
          bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
          border: 'border-purple-300',
          text: 'text-purple-900',
          accent: 'bg-purple-500',
          shadow: 'shadow-purple-200/50',
          glow: 'shadow-purple-400/30',
        },
        [NodeType.API_ENDPOINT]: {
          bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100',
          border: 'border-indigo-300',
          text: 'text-indigo-900',
          accent: 'bg-indigo-500',
          shadow: 'shadow-indigo-200/50',
          glow: 'shadow-indigo-400/30',
        },
        [NodeType.FILE]: {
          bg: 'bg-gradient-to-br from-gray-50 to-gray-100',
          border: 'border-gray-300',
          text: 'text-gray-900',
          accent: 'bg-gray-500',
          shadow: 'shadow-gray-200/50',
          glow: 'shadow-gray-400/30',
        },
        [NodeType.MODULE]: {
          bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
          border: 'border-orange-300',
          text: 'text-orange-900',
          accent: 'bg-orange-500',
          shadow: 'shadow-orange-200/50',
          glow: 'shadow-orange-400/30',
        },
      }
    };

    return baseColors.light[nodeType] || baseColors.light[NodeType.FILE];
  };

  const getComplexityIndicator = (complexity?: number) => {
    if (!complexity) return null;
    
    let colorClass = 'text-green-600 bg-green-100';
    let level = 'Low';
    let icon = <TrendingUp size={12} />;
    
    if (complexity > 15) {
      colorClass = 'text-red-600 bg-red-100';
      level = 'Critical';
      icon = <AlertCircle size={12} />;
    } else if (complexity > 10) {
      colorClass = 'text-red-500 bg-red-50';
      level = 'High';
      icon = <AlertCircle size={12} />;
    } else if (complexity > 5) {
      colorClass = 'text-yellow-600 bg-yellow-100';
      level = 'Medium';
      icon = <TrendingUp size={12} />;
    }

    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colorClass} transition-all duration-200`}>
        {icon}
        <span>{complexity}</span>
        <span className="hidden group-hover:inline">({level})</span>
      </div>
    );
  };

  const colors = getNodeColors();

  return (
    <div 
      className={`
        relative min-w-[180px] max-w-[260px] rounded-xl border-2 
        ${colors.bg} ${colors.border}
        ${isHovered || selected ? `shadow-lg ${colors.glow}` : `shadow-md ${colors.shadow}`}
        hover:shadow-lg transition-all duration-300 ease-out
        group cursor-pointer
        ${isHovered ? 'scale-105' : 'scale-100'}
        ${selected ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Accent bar with animation */}
      <div className={`
        absolute top-0 left-0 right-0 h-1.5 rounded-t-xl ${colors.accent}
        transition-all duration-300
        ${isHovered ? 'h-2' : 'h-1.5'}
      `} />
      
      {/* Glow effect for selected/hovered state */}
      {(isHovered || selected) && (
        <div className={`
          absolute inset-0 rounded-xl ${colors.accent} opacity-10 
          animate-pulse transition-opacity duration-300
        `} />
      )}
      
      {/* Node content */}
      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`
            flex-shrink-0 p-2 rounded-lg bg-white/80 backdrop-blur-sm
            transition-all duration-200
            ${isHovered ? 'scale-110 rotate-3' : 'scale-100 rotate-0'}
          `}>
            {getNodeIcon()}
          </div>
          <div className="flex-1 min-w-0">
            {data.showLabel !== false && (
              <div className={`font-semibold text-sm ${colors.text} truncate transition-colors duration-200`}>
                {data.label}
              </div>
            )}
            {data.description && (
              <div className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                {data.description}
              </div>
            )}
          </div>
        </div>

        {/* Metrics Row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {getComplexityIndicator(data.complexity)}
            {data.executionTime && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                <Clock size={12} />
                <span>{data.executionTime}ms</span>
              </div>
            )}
          </div>
          
          {data.isServiceCall && (
            <div className="flex items-center gap-1 px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-medium">
              <ExternalLink size={12} />
              <span>Service</span>
            </div>
          )}
        </div>

        {/* Warning indicators */}
        {data.complexity && data.complexity > 15 && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={14} className="text-red-600 flex-shrink-0" />
            <span className="text-red-700 text-xs font-medium">
              Critical Complexity - Consider Refactoring
            </span>
          </div>
        )}

        {/* Metadata badges */}
        {data.metadata && (
          <div className="flex flex-wrap gap-1 mt-2">
            {data.metadata.isAsync && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                Async
              </span>
            )}
            {data.metadata.parameters && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
                {data.metadata.parameters} params
              </span>
            )}
            {data.metadata.hooks && Array.isArray(data.metadata.hooks) && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                {data.metadata.hooks.length} hooks
              </span>
            )}
          </div>
        )}
      </div>

      {/* Connection handles with improved styling */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-4 h-4 !bg-white !border-2 !border-gray-400 hover:!border-blue-500 transition-colors duration-200"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-4 h-4 !bg-white !border-2 !border-gray-400 hover:!border-blue-500 transition-colors duration-200"
      />
      
      {/* Side handles for horizontal connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-4 h-4 !bg-white !border-2 !border-gray-400 hover:!border-blue-500 transition-colors duration-200"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-4 h-4 !bg-white !border-2 !border-gray-400 hover:!border-blue-500 transition-colors duration-200"
      />

      {/* Enhanced hover tooltip */}
      <div className={`
        absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 
        px-3 py-2 bg-gray-900 text-white text-xs rounded-lg
        opacity-0 group-hover:opacity-100 transition-all duration-200 
        pointer-events-none whitespace-nowrap z-20
        shadow-lg backdrop-blur-sm
        ${isHovered ? 'translate-y-0' : 'translate-y-1'}
      `}>
        <div className="font-medium">
          {nodeType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </div>
        {data.complexity && (
          <div className="text-gray-300 mt-1">
            Complexity: {data.complexity}
          </div>
        )}
        {data.executionTime && (
          <div className="text-gray-300">
            Execution: {data.executionTime}ms
          </div>
        )}
        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
});