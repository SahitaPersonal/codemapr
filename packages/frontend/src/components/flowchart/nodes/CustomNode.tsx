'use client';

import React, { memo, useState, useCallback } from 'react';
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
  TrendingUp,
  Server,
  Cloud,
  Wifi,
  HardDrive,
  Activity,
  Gauge,
  Shield,
  ShieldAlert,
  Timer,
  Cpu,
  Memory,
  Flame
} from 'lucide-react';
import { NodeType, ServiceCallType, PerformanceIssue, SecurityVulnerability, PerformanceSeverity, SecuritySeverity } from '@codemapr/shared';
import { themes } from '../../../lib/flowchartThemes';

interface CustomNodeData {
  label: string;
  description?: string;
  complexity?: number;
  executionTime?: number;
  performanceScore?: number;
  securityScore?: number;
  performanceIssues?: PerformanceIssue[];
  securityVulnerabilities?: SecurityVulnerability[];
  isServiceCall?: boolean;
  serviceCallType?: ServiceCallType;
  isExternal?: boolean;
  showLabel?: boolean;
  metadata?: Record<string, any>;
  theme?: 'light' | 'dark' | 'ocean';
  isBottleneck?: boolean;
  memoryUsage?: number;
  cpuUsage?: number;
}

export const CustomNode = memo(({ data, type, selected }: NodeProps<CustomNodeData>) => {
  const [isHovered, setIsHovered] = useState(false);
  const nodeType = type as NodeType;
  const theme = data.theme || 'light';

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const getNodeIcon = () => {
    const iconProps = { size: 18, className: "transition-all duration-200" };
    
    // Service call specific icons
    if (data.isServiceCall && data.serviceCallType) {
      switch (data.serviceCallType) {
        case ServiceCallType.HTTP_REQUEST:
          return data.isExternal ? 
            <Cloud {...iconProps} className={`${iconProps.className} text-blue-600`} /> :
            <Server {...iconProps} className={`${iconProps.className} text-green-600`} />;
        case ServiceCallType.DATABASE_QUERY:
          return <HardDrive {...iconProps} className={`${iconProps.className} text-purple-600`} />;
        case ServiceCallType.EXTERNAL_API:
          return <Wifi {...iconProps} className={`${iconProps.className} text-indigo-600`} />;
        case ServiceCallType.INTERNAL_SERVICE:
          return <Server {...iconProps} className={`${iconProps.className} text-teal-600`} />;
      }
    }
    
    // Default node type icons
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
    const currentTheme = themes[theme];
    const nodeTheme = currentTheme.colors.nodes[nodeType];
    
    if (!nodeTheme) {
      // Fallback to FILE theme if nodeType not found
      const fallbackTheme = currentTheme.colors.nodes[NodeType.FILE];
      return {
        background: fallbackTheme.background,
        borderColor: fallbackTheme.border,
        textColor: fallbackTheme.text,
        accentColor: fallbackTheme.accent,
        hoverBackground: fallbackTheme.hover,
      };
    }

    // Override colors based on performance and security issues
    let borderColor = nodeTheme.border;
    let accentColor = nodeTheme.accent;
    
    // Critical security issues get red border
    const criticalSecurityIssues = data.securityVulnerabilities?.filter(v => v.severity === SecuritySeverity.CRITICAL).length || 0;
    if (criticalSecurityIssues > 0) {
      borderColor = '#dc2626'; // red-600
      accentColor = '#dc2626';
    }
    // Performance bottlenecks get orange border
    else if (data.isBottleneck || (data.performanceScore !== undefined && data.performanceScore < 30)) {
      borderColor = '#ea580c'; // orange-600
      accentColor = '#ea580c';
    }
    // High complexity gets yellow border
    else if (data.complexity && data.complexity > 15) {
      borderColor = '#d97706'; // amber-600
      accentColor = '#d97706';
    }

    return {
      background: nodeTheme.background,
      borderColor,
      textColor: nodeTheme.text,
      accentColor,
      hoverBackground: nodeTheme.hover,
    };
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

  const getPerformanceIndicator = (performanceScore?: number, executionTime?: number) => {
    if (!performanceScore && !executionTime) return null;
    
    let colorClass = 'text-green-600 bg-green-100';
    let level = 'Good';
    let icon = <Activity size={12} />;
    
    if (performanceScore !== undefined) {
      if (performanceScore < 30) {
        colorClass = 'text-red-600 bg-red-100';
        level = 'Poor';
        icon = <Flame size={12} />;
      } else if (performanceScore < 60) {
        colorClass = 'text-yellow-600 bg-yellow-100';
        level = 'Fair';
        icon = <Gauge size={12} />;
      }
    }

    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colorClass} transition-all duration-200`}>
        {icon}
        <span>{performanceScore ? `${performanceScore}%` : `${executionTime}ms`}</span>
        <span className="hidden group-hover:inline">({level})</span>
      </div>
    );
  };

  const getSecurityIndicator = (securityScore?: number, vulnerabilities?: SecurityVulnerability[]) => {
    if (!securityScore && !vulnerabilities?.length) return null;
    
    let colorClass = 'text-green-600 bg-green-100';
    let level = 'Secure';
    let icon = <Shield size={12} />;
    
    const criticalVulns = vulnerabilities?.filter(v => v.severity === SecuritySeverity.CRITICAL).length || 0;
    const highVulns = vulnerabilities?.filter(v => v.severity === SecuritySeverity.HIGH).length || 0;
    
    if (criticalVulns > 0 || (securityScore !== undefined && securityScore < 30)) {
      colorClass = 'text-red-600 bg-red-100';
      level = 'Critical';
      icon = <ShieldAlert size={12} />;
    } else if (highVulns > 0 || (securityScore !== undefined && securityScore < 60)) {
      colorClass = 'text-yellow-600 bg-yellow-100';
      level = 'Warning';
      icon = <ShieldAlert size={12} />;
    }

    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colorClass} transition-all duration-200`}>
        {icon}
        <span>{securityScore ? `${securityScore}%` : `${vulnerabilities?.length || 0}`}</span>
        <span className="hidden group-hover:inline">({level})</span>
      </div>
    );
  };

  const getBottleneckIndicator = () => {
    if (!data.isBottleneck) return null;
    
    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium animate-pulse">
        <Flame size={12} />
        <span>Bottleneck</span>
      </div>
    );
  };

  const getResourceUsageIndicators = () => {
    const indicators = [];
    
    if (data.cpuUsage !== undefined) {
      const cpuColorClass = data.cpuUsage > 80 ? 'text-red-600 bg-red-100' :
                           data.cpuUsage > 60 ? 'text-yellow-600 bg-yellow-100' :
                           'text-green-600 bg-green-100';
      
      indicators.push(
        <div key="cpu" className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cpuColorClass}`}>
          <Cpu size={12} />
          <span>{data.cpuUsage}%</span>
        </div>
      );
    }
    
    if (data.memoryUsage !== undefined) {
      const memoryColorClass = data.memoryUsage > 80 ? 'text-red-600 bg-red-100' :
                              data.memoryUsage > 60 ? 'text-yellow-600 bg-yellow-100' :
                              'text-green-600 bg-green-100';
      
      indicators.push(
        <div key="memory" className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${memoryColorClass}`}>
          <Memory size={12} />
          <span>{data.memoryUsage}MB</span>
        </div>
      );
    }
    
    return indicators;
  };

  const colors = getNodeColors();
  const currentTheme = themes[theme];

  return (
    <div 
      className={`
        relative min-w-[180px] max-w-[260px] rounded-xl border-2 
        hover:shadow-lg transition-all duration-300 ease-out
        group cursor-pointer
        ${isHovered ? 'scale-105' : 'scale-100'}
        ${selected ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
      `}
      style={{
        backgroundColor: colors.background,
        borderColor: colors.borderColor,
        boxShadow: isHovered || selected ? currentTheme.shadows.lg : currentTheme.shadows.md,
        cursor: 'pointer',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Accent bar with animation */}
      <div 
        className={`
          absolute top-0 left-0 right-0 rounded-t-xl
          transition-all duration-300
          ${isHovered ? 'h-2' : 'h-1.5'}
        `}
        style={{ backgroundColor: colors.accentColor }}
      />
      
      {/* Glow effect for selected/hovered state */}
      {(isHovered || selected) && (
        <div 
          className="absolute inset-0 rounded-xl opacity-10 animate-pulse transition-opacity duration-300"
          style={{ backgroundColor: colors.accentColor }}
        />
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
              <div 
                className="font-semibold text-sm truncate transition-colors duration-200"
                style={{ color: colors.textColor }}
              >
                {data.label}
              </div>
            )}
            {data.description && (
              <div 
                className="text-xs mt-1 line-clamp-2 leading-relaxed opacity-80"
                style={{ color: colors.textColor }}
              >
                {data.description}
              </div>
            )}
          </div>
        </div>

        {/* Metrics Row */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {getComplexityIndicator(data.complexity)}
          {getPerformanceIndicator(data.performanceScore, data.executionTime)}
          {getSecurityIndicator(data.securityScore, data.securityVulnerabilities)}
          {getBottleneckIndicator()}
          {data.executionTime && !data.performanceScore && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              <Timer size={12} />
              <span>{data.executionTime}ms</span>
            </div>
          )}
        </div>

        {/* Resource Usage Row */}
        {(data.cpuUsage !== undefined || data.memoryUsage !== undefined) && (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {getResourceUsageIndicators()}
          </div>
        )}
        {/* Service Call Indicator */}
        {data.isServiceCall && (
          <div className="flex items-center justify-end mb-2">
            <div className={`
              flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
              ${data.serviceCallType === ServiceCallType.HTTP_REQUEST && data.isExternal 
                ? 'bg-blue-100 text-blue-700' 
                : data.serviceCallType === ServiceCallType.DATABASE_QUERY
                ? 'bg-purple-100 text-purple-700'
                : data.serviceCallType === ServiceCallType.EXTERNAL_API
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-pink-100 text-pink-700'
              }
            `}>
              {data.serviceCallType === ServiceCallType.HTTP_REQUEST && data.isExternal && <Cloud size={12} />}
              {data.serviceCallType === ServiceCallType.DATABASE_QUERY && <HardDrive size={12} />}
              {data.serviceCallType === ServiceCallType.EXTERNAL_API && <Wifi size={12} />}
              {!data.serviceCallType && <ExternalLink size={12} />}
              <span>
                {data.serviceCallType === ServiceCallType.HTTP_REQUEST && data.isExternal ? 'API' :
                 data.serviceCallType === ServiceCallType.DATABASE_QUERY ? 'DB' :
                 data.serviceCallType === ServiceCallType.EXTERNAL_API ? 'External' :
                 'Service'}
              </span>
            </div>
          </div>
        )}

        {/* Warning indicators */}
        {data.complexity && data.complexity > 15 && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={14} className="text-red-600 flex-shrink-0" />
            <span className="text-red-700 text-xs font-medium">
              Critical Complexity - Consider Refactoring
            </span>
          </div>
        )}

        {/* Performance Issues */}
        {data.performanceIssues && data.performanceIssues.length > 0 && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
            <Flame size={14} className="text-orange-600 flex-shrink-0" />
            <span className="text-orange-700 text-xs font-medium">
              {data.performanceIssues.length} Performance Issue{data.performanceIssues.length > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Security Vulnerabilities */}
        {data.securityVulnerabilities && data.securityVulnerabilities.length > 0 && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <ShieldAlert size={14} className="text-red-600 flex-shrink-0" />
            <span className="text-red-700 text-xs font-medium">
              {data.securityVulnerabilities.length} Security Issue{data.securityVulnerabilities.length > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Bottleneck Warning */}
        {data.isBottleneck && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg animate-pulse">
            <Flame size={14} className="text-red-600 flex-shrink-0" />
            <span className="text-red-700 text-xs font-medium">
              Performance Bottleneck Detected
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
            {data.metadata.method && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                {data.metadata.method}
              </span>
            )}
            {data.metadata.orm && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                {data.metadata.orm}
              </span>
            )}
            {data.metadata.operationType && (
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                data.metadata.operationType === 'read' ? 'bg-blue-100 text-blue-700' :
                data.metadata.operationType === 'write' ? 'bg-orange-100 text-orange-700' :
                data.metadata.operationType === 'delete' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {data.metadata.operationType}
              </span>
            )}
            {data.metadata.table && (
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                {data.metadata.table}
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
        pointer-events-none whitespace-nowrap z-10
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
        {data.performanceScore && (
          <div className="text-gray-300">
            Performance: {data.performanceScore}%
          </div>
        )}
        {data.securityScore && (
          <div className="text-gray-300">
            Security: {data.securityScore}%
          </div>
        )}
        {data.cpuUsage !== undefined && (
          <div className="text-gray-300">
            CPU: {data.cpuUsage}%
          </div>
        )}
        {data.memoryUsage !== undefined && (
          <div className="text-gray-300">
            Memory: {data.memoryUsage}MB
          </div>
        )}
        {data.isBottleneck && (
          <div className="text-red-400 font-medium">
            ⚠️ Bottleneck
          </div>
        )}
        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
});