'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  NodeTypes,
  EdgeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FlowchartData, NodeType, EdgeType } from '@codemapr/shared';
import { FlowchartControls } from './FlowchartControls';
import { FlowchartFilters } from './FlowchartFilters';
import { NodeDetailsPanel } from './NodeDetailsPanel';
import { ThemeSelector } from './ThemeSelector';
import { CustomNode } from './nodes/CustomNode';
import { CustomEdge } from './edges/CustomEdge';
import { ThemeName } from '../../lib/flowchartThemes';

interface FlowchartViewerProps {
  flowchartData: FlowchartData;
  onNodeClick?: (nodeId: string, nodeData: any) => void;
  onEdgeClick?: (edgeId: string, edgeData: any) => void;
  className?: string;
}

const nodeTypes: NodeTypes = {
  [NodeType.FUNCTION]: CustomNode,
  [NodeType.CLASS]: CustomNode,
  [NodeType.COMPONENT]: CustomNode,
  [NodeType.SERVICE_CALL]: CustomNode,
  [NodeType.DATABASE]: CustomNode,
  [NodeType.API_ENDPOINT]: CustomNode,
  [NodeType.FILE]: CustomNode,
  [NodeType.MODULE]: CustomNode,
};

const edgeTypes: EdgeTypes = {
  [EdgeType.FUNCTION_CALL]: CustomEdge,
  [EdgeType.IMPORT]: CustomEdge,
  [EdgeType.EXTENDS]: CustomEdge,
  [EdgeType.IMPLEMENTS]: CustomEdge,
  [EdgeType.HTTP_REQUEST]: CustomEdge,
  [EdgeType.DATABASE_QUERY]: CustomEdge,
};

function FlowchartViewerInner({ 
  flowchartData, 
  onNodeClick, 
  onEdgeClick, 
  className = '' 
}: FlowchartViewerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>('light');
  const [filters, setFilters] = useState({
    complexity: { min: 0, max: 100 },
    nodeTypes: Object.values(NodeType),
    showLabels: true,
    showMiniMap: true,
  });

  const { fitView, zoomIn, zoomOut, zoomTo } = useReactFlow();

  // Convert flowchart data to React Flow format
  const convertedNodes = useMemo(() => {
    return flowchartData.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        ...node.data,
        showLabel: filters.showLabels,
        theme: selectedTheme,
      },
      style: node.style,
      draggable: node.draggable,
      selectable: node.selectable,
    }));
  }, [flowchartData.nodes, filters.showLabels, selectedTheme]);

  const convertedEdges = useMemo(() => {
    return flowchartData.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      data: edge.data,
      style: edge.style,
      animated: edge.animated,
    }));
  }, [flowchartData.edges]);

  // Apply filters
  const filteredNodes = useMemo(() => {
    return convertedNodes.filter((node) => {
      // Filter by complexity
      const complexity = node.data.complexity || 0;
      if (complexity < filters.complexity.min || complexity > filters.complexity.max) {
        return false;
      }

      // Filter by node type
      if (!filters.nodeTypes.includes(node.type as NodeType)) {
        return false;
      }

      return true;
    });
  }, [convertedNodes, filters]);

  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    return convertedEdges.filter((edge) => 
      nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );
  }, [convertedEdges, filteredNodes]);

  // Update nodes and edges when data changes
  useEffect(() => {
    setNodes(filteredNodes);
    setEdges(filteredEdges);
  }, [filteredNodes, filteredEdges, setNodes, setEdges]);

  // Handle node position changes during drag
  const onNodesChangeHandler = useCallback((changes: any[]) => {
    try {
      onNodesChange(changes);
    } catch (error) {
      console.error('Error handling node changes:', error);
    }
  }, [onNodesChange]);

  // Handle edge changes
  const onEdgesChangeHandler = useCallback((changes: any[]) => {
    try {
      onEdgesChange(changes);
    } catch (error) {
      console.error('Error handling edge changes:', error);
    }
  }, [onEdgesChange]);

  // Handle node connections (for interactive editing)
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Handle node selection
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    setIsDetailsOpen(true);
    onNodeClick?.(node.id, node.data);
  }, [onNodeClick]);

  // Handle edge selection
  const handleEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    setIsDetailsOpen(true);
    onEdgeClick?.(edge.id, edge.data);
  }, [onEdgeClick]);

  // Navigation to source code
  const handleNavigateToSource = useCallback((sourceLocation: any) => {
    // This would integrate with VS Code or open file in editor
    console.log('Navigate to source:', sourceLocation);
    // TODO: Implement actual navigation
  }, []);

  // Layout controls
  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2 });
  }, [fitView]);

  const handleZoomIn = useCallback(() => {
    zoomIn();
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut();
  }, [zoomOut]);

  const handleResetZoom = useCallback(() => {
    zoomTo(1);
  }, [zoomTo]);

  // Export functionality
  const handleExport = useCallback((format: 'png' | 'svg' | 'json') => {
    // TODO: Implement export functionality
    console.log('Export as:', format);
  }, []);

  return (
    <div className={`relative w-full h-full ${className} cursor-default`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeHandler}
        onEdgesChange={onEdgesChangeHandler}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
        className="bg-gray-50 cursor-default [&_.react-flow__pane]:cursor-default [&_.react-flow__node]:cursor-pointer [&_.react-flow__edge]:cursor-pointer [&_.react-flow__handle]:cursor-crosshair"
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        panOnScroll={false}
        preventScrolling={true}
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1}
          color="#e5e7eb"
        />
        
        <Controls 
          position="top-left"
          showZoom={true}
          showFitView={true}
          showInteractive={true}
        />
        
        {filters.showMiniMap && (
          <MiniMap 
            position="bottom-right"
            nodeColor={(node) => {
              switch (node.type) {
                case NodeType.FUNCTION: return '#3b82f6';
                case NodeType.CLASS: return '#16a34a';
                case NodeType.COMPONENT: return '#f59e0b';
                case NodeType.SERVICE_CALL: return '#ec4899';
                case NodeType.FILE: return '#6b7280';
                default: return '#9ca3af';
              }
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        )}

        <Panel position="top-right">
          <div className="flex items-center gap-3">
            <ThemeSelector
              currentTheme={selectedTheme}
              onThemeChange={setSelectedTheme}
            />
            <FlowchartControls
              onFitView={handleFitView}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetZoom={handleResetZoom}
              onExport={handleExport}
              showMiniMap={filters.showMiniMap}
              onToggleMiniMap={() => setFilters(prev => ({ ...prev, showMiniMap: !prev.showMiniMap }))}
              showLabels={filters.showLabels}
              onToggleLabels={() => setFilters(prev => ({ ...prev, showLabels: !prev.showLabels }))}
            />
          </div>
        </Panel>

        <Panel position="top-center">
          <div className="bg-white rounded-lg shadow-lg p-4 border">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {flowchartData.name}
            </h3>
            <div className="flex gap-4 text-sm text-gray-600">
              <span>{flowchartData.metadata.totalNodes} nodes</span>
              <span>{flowchartData.metadata.totalEdges} edges</span>
              <span>Max depth: {flowchartData.metadata.maxDepth}</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>

      {/* Filters Panel */}
      <FlowchartFilters
        filters={filters}
        onFiltersChange={setFilters}
        flowchartData={flowchartData}
      />

      {/* Node/Edge Details Panel */}
      <NodeDetailsPanel
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
        onNavigateToSource={handleNavigateToSource}
      />
    </div>
  );
}

export function FlowchartViewer(props: FlowchartViewerProps) {
  return (
    <ReactFlowProvider>
      <FlowchartViewerInner {...props} />
    </ReactFlowProvider>
  );
}