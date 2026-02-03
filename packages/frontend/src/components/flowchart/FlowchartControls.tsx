'use client';

import React from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  RotateCcw, 
  Download,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';

interface FlowchartControlsProps {
  onFitView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onExport: (format: 'png' | 'svg' | 'json') => void;
  showMiniMap?: boolean;
  onToggleMiniMap?: () => void;
  showLabels?: boolean;
  onToggleLabels?: () => void;
}

export function FlowchartControls({
  onFitView,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onExport,
  showMiniMap = true,
  onToggleMiniMap,
  showLabels = true,
  onToggleLabels,
}: FlowchartControlsProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg border p-2 flex flex-col gap-1">
      {/* Zoom Controls */}
      <div className="flex flex-col gap-1">
        <button
          onClick={onZoomIn}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        
        <button
          onClick={onZoomOut}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        
        <button
          onClick={onResetZoom}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Reset Zoom"
        >
          <RotateCcw size={16} />
        </button>
        
        <button
          onClick={onFitView}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Fit View"
        >
          <Maximize size={16} />
        </button>
      </div>

      <div className="border-t border-gray-200 my-1" />

      {/* View Controls */}
      <div className="flex flex-col gap-1">
        {onToggleLabels && (
          <button
            onClick={onToggleLabels}
            className={`p-2 rounded transition-colors ${
              showLabels 
                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                : 'hover:bg-gray-100'
            }`}
            title={showLabels ? 'Hide Labels' : 'Show Labels'}
          >
            {showLabels ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        )}

        {onToggleMiniMap && (
          <button
            onClick={onToggleMiniMap}
            className={`p-2 rounded transition-colors ${
              showMiniMap 
                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                : 'hover:bg-gray-100'
            }`}
            title={showMiniMap ? 'Hide MiniMap' : 'Show MiniMap'}
          >
            <Settings size={16} />
          </button>
        )}
      </div>

      <div className="border-t border-gray-200 my-1" />

      {/* Export Controls */}
      <div className="relative group">
        <button
          className="p-2 hover:bg-gray-100 rounded transition-colors w-full"
          title="Export"
        >
          <Download size={16} />
        </button>
        
        {/* Export Dropdown */}
        <div className="absolute right-full top-0 mr-2 bg-white rounded-lg shadow-lg border p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
          <div className="flex flex-col gap-1 min-w-[120px]">
            <button
              onClick={() => onExport('png')}
              className="px-3 py-2 text-left hover:bg-gray-100 rounded text-sm"
            >
              Export PNG
            </button>
            <button
              onClick={() => onExport('svg')}
              className="px-3 py-2 text-left hover:bg-gray-100 rounded text-sm"
            >
              Export SVG
            </button>
            <button
              onClick={() => onExport('json')}
              className="px-3 py-2 text-left hover:bg-gray-100 rounded text-sm"
            >
              Export JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}