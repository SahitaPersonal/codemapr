'use client';

import React, { memo, useState } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { EdgeType, CallType } from '@codemapr/shared';

interface CustomEdgeData {
  label?: string;
  callType: CallType;
  isAsync: boolean;
  parameters?: string[];
  metadata?: Record<string, any>;
}

export const CustomEdge = memo((props: EdgeProps<CustomEdgeData>) => {
  const [isHovered, setIsHovered] = useState(false);
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd,
    selected,
  } = props;
  
  // Try to get edge type from multiple sources with fallbacks
  const edgeType = (props as any).type || 
                   data?.metadata?.edgeType || 
                   EdgeType.FUNCTION_CALL;
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const getEdgeStyle = () => {
    const baseStyle = {
      strokeWidth: isHovered || selected ? 3 : 2,
      filter: isHovered || selected ? 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))' : 'none',
    };

    switch (edgeType) {
      case EdgeType.FUNCTION_CALL:
        return {
          ...baseStyle,
          stroke: isHovered ? '#2563eb' : '#3b82f6',
          strokeDasharray: data?.isAsync ? '8,4' : 'none',
        };
      case EdgeType.IMPORT:
        return {
          ...baseStyle,
          stroke: isHovered ? '#15803d' : '#16a34a',
          strokeDasharray: '10,6',
        };
      case EdgeType.EXTENDS:
        return {
          ...baseStyle,
          stroke: isHovered ? '#d97706' : '#f59e0b',
          strokeWidth: isHovered || selected ? 4 : 3,
        };
      case EdgeType.IMPLEMENTS:
        return {
          ...baseStyle,
          stroke: isHovered ? '#7c3aed' : '#8b5cf6',
          strokeDasharray: '12,6',
        };
      case EdgeType.HTTP_REQUEST:
        return {
          ...baseStyle,
          stroke: isHovered ? '#be185d' : '#ec4899',
          strokeWidth: isHovered || selected ? 4 : 2.5,
        };
      case EdgeType.DATABASE_QUERY:
        return {
          ...baseStyle,
          stroke: isHovered ? '#6d28d9' : '#7c3aed',
          strokeDasharray: '8,4',
        };
      default:
        return {
          ...baseStyle,
          stroke: isHovered ? '#4b5563' : '#6b7280',
        };
    }
  };

  const getEdgeLabel = () => {
    if (!data?.label && !data?.isAsync && !data?.parameters?.length) {
      return null;
    }

    let labelText = data?.label || '';
    
    if (data?.isAsync) {
      labelText = labelText ? `${labelText} (async)` : 'async';
    }

    if (data?.parameters?.length) {
      const paramCount = data.parameters.length;
      labelText = labelText 
        ? `${labelText} (${paramCount} params)` 
        : `${paramCount} params`;
    }

    return labelText || null;
  };

  const getEdgeColor = () => {
    const baseClasses = 'transition-all duration-200 backdrop-blur-sm';
    
    switch (edgeType) {
      case EdgeType.FUNCTION_CALL: 
        return `text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 ${baseClasses}`;
      case EdgeType.IMPORT: 
        return `text-green-700 bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300 ${baseClasses}`;
      case EdgeType.EXTENDS: 
        return `text-yellow-700 bg-yellow-50 border-yellow-200 hover:bg-yellow-100 hover:border-yellow-300 ${baseClasses}`;
      case EdgeType.IMPLEMENTS: 
        return `text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100 hover:border-purple-300 ${baseClasses}`;
      case EdgeType.HTTP_REQUEST: 
        return `text-pink-700 bg-pink-50 border-pink-200 hover:bg-pink-100 hover:border-pink-300 ${baseClasses}`;
      case EdgeType.DATABASE_QUERY: 
        return `text-violet-700 bg-violet-50 border-violet-200 hover:bg-violet-100 hover:border-violet-300 ${baseClasses}`;
      default: 
        return `text-gray-700 bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300 ${baseClasses}`;
    }
  };

  const getEdgeTypeIcon = () => {
    switch (edgeType) {
      case EdgeType.FUNCTION_CALL:
        return '→';
      case EdgeType.IMPORT:
        return '↗';
      case EdgeType.EXTENDS:
        return '⤴';
      case EdgeType.IMPLEMENTS:
        return '⟲';
      case EdgeType.HTTP_REQUEST:
        return '🌐';
      case EdgeType.DATABASE_QUERY:
        return '🗄';
      default:
        return '→';
    }
  };

  const edgeStyle = getEdgeStyle();
  const labelText = getEdgeLabel();
  const colorClasses = getEdgeColor();

  return (
    <>
      <path
        id={id}
        style={edgeStyle}
        className={`react-flow__edge-path transition-all duration-300 ${
          isHovered || selected ? 'opacity-100' : 'opacity-80'
        }`}
        d={edgePath}
        markerEnd={markerEnd}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      
      {/* Animated flow indicator for async calls */}
      {data?.isAsync && (
        <circle
          r="3"
          fill="#3b82f6"
          className="opacity-70"
        >
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            path={edgePath}
          />
        </circle>
      )}
      
      {labelText && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 1000,
            }}
            className={`
              px-3 py-2 text-xs font-semibold rounded-lg border
              ${colorClasses}
              shadow-md hover:shadow-lg
              max-w-[140px] truncate
              ${isHovered || selected ? 'scale-105' : 'scale-100'}
              transition-all duration-200
              cursor-pointer
              z-50
            `}
            title={labelText}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="flex items-center gap-1">
              <span className="text-sm">{getEdgeTypeIcon()}</span>
              <span style={{ color: '#111827' }}>{labelText}</span>
              {data?.isAsync && (
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Enhanced tooltip for edge details */}
      {isHovered && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -100%) translate(${labelX}px,${labelY - 40}px)`,
              pointerEvents: 'none',
              zIndex: 1001,
            }}
            className="px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-50 whitespace-nowrap"
          >
            <div className="font-medium">
              {edgeType ? edgeType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Connection'}
            </div>
            {data?.callType && (
              <div className="text-gray-300 mt-1">
                Type: {data.callType}
              </div>
            )}
            {data?.parameters?.length && (
              <div className="text-gray-300">
                Parameters: {data.parameters.length}
              </div>
            )}
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});