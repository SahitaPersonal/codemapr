'use client';

import { useState } from 'react';
import { ArrowLeft, Upload, FileCode, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AnalysisResult {
  filePath: string;
  language: string;
  complexity: {
    cyclomatic: number;
    cognitive: number;
    maintainability: number;
    technicalDebt: number;
  };
  functions: any[];
  classes: any[];
  imports: any[];
  exports: any[];
}

export default function UploadPage() {
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    setSelectedFiles(fileArray);
    setError(null);
  };

  const analyzeFiles = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setAnalyzing(true);
    setError(null);
    const analysisResults: AnalysisResult[] = [];

    try {
      for (const file of selectedFiles) {
        const content = await file.text();
        
        // Call backend API
        const response = await fetch('http://localhost:3001/analysis/file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filePath: file.name,
            content: content,
            language: getLanguageFromFileName(file.name),
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to analyze ${file.name}: ${response.statusText}`);
        }

        const data = await response.json();
        analysisResults.push(data);
      }

      setResults(analysisResults);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze files');
      console.error('Analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const getLanguageFromFileName = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts': return 'typescript';
      case 'tsx': return 'typescript';
      case 'js': return 'javascript';
      case 'jsx': return 'javascript';
      default: return 'javascript';
    }
  };

  const viewAnalysis = (result: AnalysisResult) => {
    // Store result in sessionStorage and navigate
    sessionStorage.setItem('analysisResult', JSON.stringify(result));
    router.push(`/app/analyze?file=${encodeURIComponent(result.filePath)}`);
  };

  const generateFlowchart = async (result: AnalysisResult) => {
    try {
      const response = await fetch('http://localhost:3001/flowchart/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'file_specific',
          filePath: result.filePath,
          analysisData: result,
          layoutAlgorithm: 'hierarchical',
          layoutDirection: 'TB',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate flowchart');
      }

      const data = await response.json();
      sessionStorage.setItem('flowchartData', JSON.stringify(data.flowchart));
      router.push(`/app/flowchart?file=${encodeURIComponent(result.filePath)}`);
    } catch (err: any) {
      setError(err.message || 'Failed to generate flowchart');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
              <h1 className="text-lg font-semibold text-gray-900">Upload & Analyze</h1>
              <p className="text-sm text-gray-500">Upload your code files for real-time analysis</p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-8 max-w-6xl mx-auto">
        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Files</h2>
          
          <label htmlFor="file-upload" className="block">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                {selectedFiles.length > 0 
                  ? `${selectedFiles.length} file(s) selected` 
                  : 'Click to upload or drag and drop'
                }
              </p>
              <p className="text-sm text-gray-500">
                Supports .js, .jsx, .ts, .tsx files
              </p>
            </div>
            <input
              id="file-upload"
              type="file"
              multiple
              accept=".js,.jsx,.ts,.tsx"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>

          {selectedFiles.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Selected Files:</h3>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileCode className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-gray-900">{file.name}</span>
                      <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(2)} KB)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-900">Error</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          <button
            onClick={analyzeFiles}
            disabled={analyzing || selectedFiles.length === 0}
            className="mt-6 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <FileCode className="w-5 h-5" />
                <span>Analyze Files</span>
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        {results.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Analysis Results</h2>
            
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{result.filePath}</h3>
                        <p className="text-sm text-gray-500">{result.language}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Complexity</p>
                      <p className="text-2xl font-bold text-blue-600">{result.complexity?.cyclomatic || 0}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Functions</p>
                      <p className="text-2xl font-bold text-green-600">{result.functions?.length || 0}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Classes</p>
                      <p className="text-2xl font-bold text-purple-600">{result.classes?.length || 0}</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Maintainability</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {result.complexity?.maintainability?.toFixed(0) || 0}%
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => viewAnalysis(result)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      View Detailed Analysis
                    </button>
                    <button
                      onClick={() => generateFlowchart(result)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Generate Flowchart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
