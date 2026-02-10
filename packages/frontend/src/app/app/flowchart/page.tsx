'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Download, Share2, Loader2, FileCode } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { apiClient } from '../../../lib/api';

// Dynamically import FlowchartViewer to avoid SSR issues with React Flow
const FlowchartViewer = dynamic(
  () => import('../../../components/flowchart/FlowchartViewer').then(mod => ({ default: mod.FlowchartViewer })),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div> }
);

function FlowchartContent() {
  const searchParams = useSearchParams();
  const fileName = searchParams.get('file');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flowchartData, setFlowchartData] = useState<any>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);

  useEffect(() => {
    if (fileName) {
      loadFlowchart();
    }
  }, [fileName]);

  const loadFlowchart = async () => {
    if (!fileName) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get file data from localStorage (uploaded files)
      const uploadedFilesStr = localStorage.getItem('uploadedFiles');
      if (!uploadedFilesStr) {
        throw new Error('No uploaded files found. Please upload and analyze a file first.');
      }

      const uploadedFiles = JSON.parse(uploadedFilesStr);
      const file = uploadedFiles.find((f: any) => f.name === fileName);

      if (!file) {
        throw new Error(`File "${fileName}" not found in uploaded files.`);
      }

      if (!file.analyzed || !file.analysisData) {
        throw new Error(`File "${fileName}" has not been analyzed yet. Please analyze it first.`);
      }

      console.log('[Flowchart] Generating flowchart for:', fileName);
      setAnalysisData(file.analysisData);

      // Generate flowchart
      const result = await apiClient.generateFlowchart(
        'file_specific',  // Use the correct FlowchartType enum value
        file.path,
        file.analysisData
      );

      console.log('[Flowchart] Flowchart generated:', result);
      setFlowchartData(result.flowchart);
    } catch (err: any) {
      console.error('[Flowchart] Error:', err);
      setError(err.message || 'Failed to generate flowchart');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (!flowchartData) return;
    
    const dataStr = JSON.stringify(flowchartData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName || 'flowchart'}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
              <h1 className="text-lg font-semibold text-gray-900">
                {fileName || 'Flowchart Viewer'}
              </h1>
              <p className="text-sm text-gray-500">Interactive code visualization</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button 
              onClick={handleExport}
              disabled={!flowchartData}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Export JSON</span>
            </button>
            <button 
              onClick={loadFlowchart}
              disabled={isLoading || !fileName}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Regenerate</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Generating flowchart...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Flowchart</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="flex gap-3 justify-center">
                <Link
                  href="/app"
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Go Back
                </Link>
                {fileName && (
                  <button
                    onClick={loadFlowchart}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : flowchartData ? (
          <div className="absolute inset-0">
            <FlowchartViewer 
              flowchartData={flowchartData}
              onNodeClick={(nodeId, nodeData) => {
                console.log('Node clicked:', nodeId, nodeData);
              }}
              onEdgeClick={(edgeId, edgeData) => {
                console.log('Edge clicked:', edgeId, edgeData);
              }}
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="text-center max-w-2xl px-6">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileCode className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Flowchart Viewer</h2>
              <p className="text-gray-600 mb-6">
                Select a file from the dashboard and click "Generate Flowchart" to visualize your code structure.
              </p>
              <Link
                href="/app"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FlowchartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <FlowchartContent />
    </Suspense>
  );
}
