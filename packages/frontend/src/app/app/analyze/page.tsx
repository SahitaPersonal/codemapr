'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, AlertTriangle, CheckCircle, Info, TrendingUp, Shield, Zap, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';

function AnalyzeContent() {
  const searchParams = useSearchParams();
  const fileName = searchParams.get('file');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Load analysis data from localStorage
  useEffect(() => {
    if (fileName) {
      console.log('[Analyze] Loading data for file:', fileName);
      const savedFiles = localStorage.getItem('uploadedFiles');
      if (savedFiles) {
        try {
          const files = JSON.parse(savedFiles);
          const file = files.find((f: any) => f.name === fileName);
          
          if (file && file.analyzed && file.analysisData) {
            console.log('[Analyze] Found analysis data for:', fileName);
            setAnalysisData(file.analysisData);
          } else {
            console.log('[Analyze] No analysis data found for:', fileName);
            setError('File has not been analyzed yet. Please analyze it from the dashboard first.');
          }
        } catch (err) {
          console.error('[Analyze] Error loading file data:', err);
          setError('Failed to load file data');
        }
      } else {
        setError('No uploaded files found. Please upload and analyze a file first.');
      }
    }
  }, [fileName]);

  // Default/mock data structure
  const defaultData = {
    complexity: {
      cyclomatic: 0,
      cognitive: 0,
      maintainability: 0,
      technicalDebt: 0
    },
    security: {
      vulnerabilities: 0,
      warnings: 0,
      info: 0
    },
    performance: {
      score: 0,
      bottlenecks: 0,
      optimizations: 0
    },
    structure: {
      functions: 0,
      classes: 0,
      imports: 0,
      exports: 0
    }
  };

  // Map analysis data to display format
  const data = analysisData ? {
    complexity: {
      cyclomatic: analysisData.complexity?.cyclomatic || 0,
      cognitive: analysisData.complexity?.cognitive || 0,
      maintainability: analysisData.complexity?.maintainability || 0,
      technicalDebt: analysisData.complexity?.technicalDebt || 0
    },
    security: {
      vulnerabilities: 0, // TODO: Add security analysis
      warnings: 0,
      info: 0
    },
    performance: {
      score: Math.max(0, 100 - (analysisData.complexity?.cyclomatic || 0) * 2), // Simple score based on complexity
      bottlenecks: 0, // TODO: Add performance analysis
      optimizations: 0
    },
    structure: {
      functions: analysisData.functions?.length || 0,
      classes: analysisData.classes?.length || 0,
      imports: analysisData.imports?.length || 0,
      exports: analysisData.exports?.length || 0
    }
  } : defaultData;

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
              <h1 className="text-lg font-semibold text-gray-900">
                Code Analysis: {fileName || 'Unknown File'}
              </h1>
              <p className="text-sm text-gray-500">Detailed code metrics and insights</p>
            </div>
          </div>

          <button
            onClick={() => setIsAnalyzing(true)}
            disabled={isAnalyzing}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {isAnalyzing && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isAnalyzing ? 'Analyzing...' : 'Re-analyze'}</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="mx-8 mt-4 bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!analysisData && !error && (
        <div className="mx-8 mt-4 bg-blue-50 border-l-4 border-blue-500 p-4">
          <p className="text-sm text-blue-700">
            Upload and analyze a file from the dashboard to see real metrics here.
          </p>
        </div>
      )}

      {/* Main Content */}
      <div className="p-8">
        {/* Overview Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{data.complexity.cyclomatic}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Complexity Score</h3>
            <p className="text-xs text-gray-500 mt-1">Cyclomatic complexity</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{data.security.vulnerabilities}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Vulnerabilities</h3>
            <p className="text-xs text-gray-500 mt-1">Security issues found</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{data.performance.score}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Performance</h3>
            <p className="text-xs text-gray-500 mt-1">Overall score</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{data.complexity.maintainability.toFixed(0)}%</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Maintainability</h3>
            <p className="text-xs text-gray-500 mt-1">Code quality index</p>
          </div>
        </div>

        {/* Detailed Analysis Sections */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Complexity Analysis */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Complexity Analysis</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Cyclomatic Complexity</span>
                  <span className="text-sm font-medium text-gray-900">{data.complexity.cyclomatic}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${Math.min(data.complexity.cyclomatic * 5, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Cognitive Complexity</span>
                  <span className="text-sm font-medium text-gray-900">{data.complexity.cognitive}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${Math.min(data.complexity.cognitive * 10, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Maintainability Index</span>
                  <span className="text-sm font-medium text-gray-900">{data.complexity.maintainability}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${data.complexity.maintainability}%` }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Technical Debt</span>
                  <span className="text-sm font-medium text-orange-600">{data.complexity.technicalDebt} minutes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Security Analysis */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Analysis</h2>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-900">Critical Vulnerabilities</h4>
                  <p className="text-xs text-red-700 mt-1">{data.security.vulnerabilities} issues require immediate attention</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-yellow-900">Warnings</h4>
                  <p className="text-xs text-yellow-700 mt-1">{data.security.warnings} potential security concerns</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-blue-900">Informational</h4>
                  <p className="text-xs text-blue-700 mt-1">{data.security.info} suggestions for improvement</p>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Analysis */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Analysis</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-green-900">Overall Score</h4>
                  <p className="text-xs text-green-700 mt-1">
                    {data.performance.score > 80 ? 'Excellent' : data.performance.score > 60 ? 'Good' : 'Needs improvement'}
                  </p>
                </div>
                <div className="text-3xl font-bold text-green-600">{data.performance.score}</div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Issues Found</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Bottlenecks</span>
                    <span className="font-medium text-orange-600">{data.performance.bottlenecks}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Optimization Opportunities</span>
                    <span className="font-medium text-blue-600">{data.performance.optimizations}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Code Structure */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Code Structure</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Functions</span>
                <span className="text-sm font-medium text-gray-900">{data.structure.functions}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Classes</span>
                <span className="text-sm font-medium text-gray-900">{data.structure.classes}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Imports</span>
                <span className="text-sm font-medium text-gray-900">{data.structure.imports}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Exports</span>
                <span className="text-sm font-medium text-gray-900">{data.structure.exports}</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">AI-Powered Recommendations</h2>
          <div className="space-y-3">
            {data.complexity.cyclomatic > 10 && (
              <div className="bg-white p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-1">Refactor Complex Functions</h4>
                <p className="text-sm text-gray-600">Consider breaking down functions with cyclomatic complexity > 10 into smaller, more manageable pieces.</p>
              </div>
            )}
            {data.performance.score < 80 && (
              <div className="bg-white p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-1">Optimize Performance</h4>
                <p className="text-sm text-gray-600">Use memoization for expensive computations and consider lazy loading for large dependencies.</p>
              </div>
            )}
            {data.security.vulnerabilities > 0 && (
              <div className="bg-white p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-1">Security Improvements</h4>
                <p className="text-sm text-gray-600">Add input validation and sanitization to prevent potential security vulnerabilities.</p>
              </div>
            )}
            {!analysisData && (
              <div className="bg-white p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-1">Upload a File to Get Started</h4>
                <p className="text-sm text-gray-600">Upload and analyze a file to see personalized recommendations based on your code.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <AnalyzeContent />
    </Suspense>
  );
}
