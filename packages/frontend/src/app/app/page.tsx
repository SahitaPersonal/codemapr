'use client';

import { useEffect, useState } from 'react';
import { Upload, FolderOpen, FileCode, Search, Settings, User, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '../../lib/api';

interface UploadedFile {
  name: string;
  path: string;
  content: string;
  language: string;
  analyzed: boolean;
  analysisData?: any;
  size: number;
}

export default function AppPage() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load files from localStorage on mount
  useEffect(() => {
    console.log('[Storage] Loading files from localStorage...');
    const savedFiles = localStorage.getItem('uploadedFiles');
    if (savedFiles) {
      try {
        const parsed = JSON.parse(savedFiles);
        console.log('[Storage] Loaded', parsed.length, 'files from localStorage');
        setUploadedFiles(parsed);
      } catch (err) {
        console.error('[Storage] Failed to load saved files:', err);
      }
    } else {
      console.log('[Storage] No saved files found');
    }
  }, []);

  // Save files to localStorage whenever they change
  useEffect(() => {
    if (uploadedFiles.length > 0) {
      console.log('[Storage] Saving', uploadedFiles.length, 'files to localStorage');
      localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
    }
  }, [uploadedFiles]);

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // Ask user if they want to replace existing files
    if (uploadedFiles.length > 0) {
      const shouldReplace = window.confirm(
        `You have ${uploadedFiles.length} file(s) already uploaded.\n\nDo you want to:\n- Click OK to REPLACE all existing files\n- Click Cancel to ADD to existing files`
      );
      
      if (shouldReplace) {
        setUploadedFiles([]);
        localStorage.removeItem('uploadedFiles');
      }
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress('');

    try {
      const fileArray = Array.from(files);
      
      // Filter code files first
      const codeFiles = fileArray.filter(file => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        return ['js', 'jsx', 'ts', 'tsx'].includes(ext || '');
      });

      if (codeFiles.length === 0) {
        setError('No valid code files found. Please upload .js, .jsx, .ts, or .tsx files.');
        setIsUploading(false);
        return;
      }

      // Limit file size (5MB per file)
      const MAX_FILE_SIZE = 5 * 1024 * 1024;
      const oversizedFiles = codeFiles.filter(f => f.size > MAX_FILE_SIZE);
      if (oversizedFiles.length > 0) {
        setError(`Some files are too large (max 5MB): ${oversizedFiles.map(f => f.name).join(', ')}`);
        setIsUploading(false);
        return;
      }

      // Limit total number of files
      const MAX_FILES = 50;
      if (codeFiles.length > MAX_FILES) {
        setError(`Too many files. Please upload maximum ${MAX_FILES} files at once.`);
        setIsUploading(false);
        return;
      }

      setUploadProgress(`Processing ${codeFiles.length} files...`);
      const newFiles: UploadedFile[] = [];

      // Process files in batches to avoid freezing
      const BATCH_SIZE = 10;
      for (let i = 0; i < codeFiles.length; i += BATCH_SIZE) {
        const batch = codeFiles.slice(i, i + BATCH_SIZE);
        setUploadProgress(`Processing files ${i + 1}-${Math.min(i + BATCH_SIZE, codeFiles.length)} of ${codeFiles.length}...`);
        
        const batchResults = await Promise.all(
          batch.map(async (file) => {
            const content = await file.text();
            const language = getLanguageFromFileName(file.name);
            
            return {
              name: file.name,
              path: (file as any).webkitRelativePath || file.name,
              content,
              language,
              analyzed: false,
              size: file.size,
            };
          })
        );

        newFiles.push(...batchResults);
        
        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      setUploadedFiles(prev => [...prev, ...newFiles]);
      setUploadProgress('');
    } catch (err) {
      setError('Failed to upload files. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const analyzeFile = async (fileName: string) => {
    const file = uploadedFiles.find(f => f.name === fileName);
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      console.log('Analyzing file:', fileName);
      const analysisData = await apiClient.analyzeFile(
        file.path,
        file.content,
        file.language
      );

      console.log('Analysis complete for:', fileName, analysisData);

      setUploadedFiles(prev =>
        prev.map(f =>
          f.name === fileName
            ? { ...f, analyzed: true, analysisData }
            : f
        )
      );
    } catch (err) {
      setError(`Failed to analyze ${fileName}. Make sure the backend is running.`);
      console.error('Analysis error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const analyzeAllFiles = async () => {
    const unanalyzedFiles = uploadedFiles.filter(f => !f.analyzed);
    if (unanalyzedFiles.length === 0) return;

    setIsUploading(true);
    setError(null);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < unanalyzedFiles.length; i++) {
      const file = unanalyzedFiles[i];
      setUploadProgress(`Analyzing ${i + 1} of ${unanalyzedFiles.length}: ${file.name}...`);
      
      try {
        const analysisData = await apiClient.analyzeFile(
          file.path,
          file.content,
          file.language
        );

        setUploadedFiles(prev =>
          prev.map(f =>
            f.name === file.name
              ? { ...f, analyzed: true, analysisData }
              : f
          )
        );
        successCount++;
      } catch (err) {
        console.error(`Failed to analyze ${file.name}:`, err);
        failCount++;
      }

      // Allow UI to update
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setUploadProgress('');
    setIsUploading(false);
    
    if (failCount > 0) {
      setError(`Analysis complete: ${successCount} succeeded, ${failCount} failed.`);
    }
  };

  const selectedFileData = uploadedFiles.find(f => f.name === selectedFile);

  // Filter files based on search query
  const filteredFiles = uploadedFiles.filter(file => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      file.name.toLowerCase().includes(query) ||
      file.path.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <FileCode className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">CodeMapr</span>
              </Link>
              
              <div className="hidden md:flex items-center space-x-2 ml-8">
                <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg">
                  Projects
                </button>
                <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
                  Recent
                </button>
                <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
                  Shared
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 text-gray-900 placeholder-gray-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                )}
              </div>
              
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <Settings className="w-5 h-5" />
              </button>
              
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-6 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto">
              <span className="text-red-500 hover:text-red-700">×</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar - File Browser */}
        <aside className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <div className="mb-4">
              <label htmlFor="file-upload" className="block mb-2">
                <div className={`border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {isUploading ? (
                    <>
                      <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-2 animate-spin" />
                      <p className="text-sm font-medium text-gray-700">
                        {uploadProgress || 'Uploading...'}
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-700">Upload Files</p>
                      <p className="text-xs text-gray-500 mt-1">Click to browse individual files</p>
                    </>
                  )}
                </div>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".js,.jsx,.ts,.tsx"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>

              <label htmlFor="folder-upload" className="block">
                <div className={`border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {isUploading ? (
                    <>
                      <Loader2 className="w-8 h-8 text-green-600 mx-auto mb-2 animate-spin" />
                      <p className="text-sm font-medium text-gray-700">
                        {uploadProgress || 'Uploading...'}
                      </p>
                    </>
                  ) : (
                    <>
                      <FolderOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-700">Upload Project Folder</p>
                      <p className="text-xs text-gray-500 mt-1">Click to select entire project</p>
                    </>
                  )}
                </div>
                <input
                  id="folder-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  webkitdirectory=""
                  directory=""
                />
              </label>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                <span className="flex items-center">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Your Files ({uploadedFiles.length})
                </span>
                <div className="flex items-center gap-2">
                  {uploadedFiles.length > 0 && uploadedFiles.some(f => !f.analyzed) && (
                    <button
                      onClick={analyzeAllFiles}
                      disabled={isUploading}
                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Analyze All
                    </button>
                  )}
                  {uploadedFiles.length > 0 && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to remove all ${uploadedFiles.length} file(s)?`)) {
                          setUploadedFiles([]);
                          setSelectedFile(null);
                          localStorage.removeItem('uploadedFiles');
                        }
                      }}
                      className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </h3>
              
              {uploadedFiles.length === 0 ? (
                <div className="text-center py-8">
                  <FileCode className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No files uploaded yet</p>
                  <p className="text-xs text-gray-400 mt-1">Upload files to get started</p>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No files match "{searchQuery}"</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredFiles.map((file, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedFile(file.name)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedFile === file.name
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <FileCode className="w-4 h-4 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="truncate">{file.name}</div>
                            {file.path !== file.name && (
                              <div className="text-xs text-gray-500 truncate">{file.path}</div>
                            )}
                          </div>
                        </div>
                        {file.analyzed && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded ml-2">
                            ✓
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href="/app/analyze"
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Analyze Project
                </Link>
                <Link
                  href="/app/flowchart"
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Generate Flowchart
                </Link>
                <Link
                  href="/app/collaborate"
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Start Collaboration
                </Link>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            {/* Show summary if multiple files are analyzed */}
            {uploadedFiles.length > 1 && uploadedFiles.some(f => f.analyzed) && !selectedFile && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Project Summary</h2>
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-600">Total Files</p>
                    <p className="text-3xl font-bold text-gray-900">{uploadedFiles.length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-600">Analyzed</p>
                    <p className="text-3xl font-bold text-green-600">
                      {uploadedFiles.filter(f => f.analyzed).length}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-600">Total Functions</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {uploadedFiles.reduce((sum, f) => sum + (f.analysisData?.functions?.length || 0), 0)}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-600">Total Classes</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {uploadedFiles.reduce((sum, f) => sum + (f.analysisData?.classes?.length || 0), 0)}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Analyzed Files</h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {uploadedFiles.filter(f => f.analyzed).map((file, index) => (
                      <div key={index} className="px-6 py-4 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedFile(file.name)}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{file.name}</p>
                            {file.path !== file.name && (
                              <p className="text-sm text-gray-500">{file.path}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-6 text-sm">
                            <div className="text-center">
                              <p className="text-gray-600">Functions</p>
                              <p className="font-semibold text-gray-900">
                                {file.analysisData?.functions?.length || 0}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-gray-600">Classes</p>
                              <p className="font-semibold text-gray-900">
                                {file.analysisData?.classes?.length || 0}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-gray-600">Complexity</p>
                              <p className="font-semibold text-gray-900">
                                {file.analysisData?.complexity?.cyclomatic || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedFileData ? (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedFileData.name}</h2>
                  <p className="text-gray-600">
                    {selectedFileData.analyzed 
                      ? 'Analysis complete - Ready to visualize' 
                      : 'Ready to analyze and visualize'
                    }
                  </p>
                </div>

                {!selectedFileData.analyzed && (
                  <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 mb-3">
                      This file hasn't been analyzed yet. Analyze it to unlock all features.
                    </p>
                    <button
                      onClick={() => analyzeFile(selectedFileData.name)}
                      disabled={isUploading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                      {isUploading ? 'Analyzing...' : 'Analyze Now'}
                    </button>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  <Link
                    href={`/app/flowchart?file=${encodeURIComponent(selectedFileData.name)}`}
                    className={`bg-white p-6 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer group ${!selectedFileData.analyzed ? 'opacity-50' : ''}`}
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                      <FileCode className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Generate Flowchart</h3>
                    <p className="text-gray-600 text-sm">
                      Create an interactive flowchart visualization of your code structure
                    </p>
                    {!selectedFileData.analyzed && (
                      <p className="text-xs text-orange-600 mt-2">⚠️ Analyze file first</p>
                    )}
                  </Link>

                  <Link
                    href={`/app/analyze?file=${encodeURIComponent(selectedFileData.name)}`}
                    className="bg-white p-6 rounded-xl border-2 border-gray-200 hover:border-green-500 hover:shadow-lg transition-all cursor-pointer group"
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                      <Search className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">View Analysis</h3>
                    <p className="text-gray-600 text-sm">
                      {selectedFileData.analyzed 
                        ? 'View detailed analysis including complexity, security, and performance metrics'
                        : 'Analyze code to see complexity, security, and performance metrics'
                      }
                    </p>
                  </Link>
                </div>

                {selectedFileData.analyzed && selectedFileData.analysisData && (
                  <div className="mt-6 bg-white p-6 rounded-xl shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Functions</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedFileData.analysisData.functions?.length || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Classes</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedFileData.analysisData.classes?.length || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Complexity</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedFileData.analysisData.complexity?.cyclomatic || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Imports</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedFileData.analysisData.imports?.length || 0}
                        </p>
                      </div>
                    </div>

                    {/* Debug info */}
                    <details className="mt-4">
                      <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                        Show raw data (debug)
                      </summary>
                      <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-96 text-gray-900">
                        {JSON.stringify(selectedFileData.analysisData, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FolderOpen className="w-12 h-12 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to CodeMapr</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Upload your code files to get started with analysis and visualization
                </p>
                
                <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
                  <div className="bg-white p-6 rounded-xl shadow-sm">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">1. Upload Files</h3>
                    <p className="text-sm text-gray-600">
                      Upload your JavaScript, TypeScript, or React files
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Search className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">2. Analyze</h3>
                    <p className="text-sm text-gray-600">
                      Get instant analysis of your code structure and dependencies
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <FileCode className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">3. Visualize</h3>
                    <p className="text-sm text-gray-600">
                      Explore interactive flowcharts and insights
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
