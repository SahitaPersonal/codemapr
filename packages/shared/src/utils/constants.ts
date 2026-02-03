// API Configuration
export const API_ENDPOINTS = {
  PROJECTS: '/api/projects',
  ANALYSIS: '/api/analysis',
  FLOWCHARTS: '/api/flowcharts',
  AI_EXPLANATIONS: '/api/ai/explanations',
  COLLABORATION: '/api/collaboration',
  USERS: '/api/users',
  HEALTH: '/api/health',
} as const;

// WebSocket Events
export const WS_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  JOIN_SESSION: 'join_session',
  LEAVE_SESSION: 'leave_session',
  CURSOR_UPDATE: 'cursor_update',
  SELECTION_UPDATE: 'selection_update',
  ANNOTATION_CREATE: 'annotation_create',
  ANNOTATION_UPDATE: 'annotation_update',
  ANNOTATION_DELETE: 'annotation_delete',
  USER_PRESENCE: 'user_presence',
} as const;

// File Processing
export const SUPPORTED_EXTENSIONS = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
] as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_PROJECT_FILES = 10000;
export const ANALYSIS_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// UI Constants
export const COLORS = {
  PRIMARY: '#3b82f6',
  SECONDARY: '#64748b',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  INFO: '#06b6d4',
} as const;

export const USER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // yellow
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#ec4899', // pink
  '#6366f1', // indigo
] as const;

// Flowchart Configuration
export const FLOWCHART_DEFAULTS = {
  NODE_WIDTH: 200,
  NODE_HEIGHT: 80,
  NODE_SPACING: 100,
  RANK_SPACING: 150,
  EDGE_SPACING: 20,
  ZOOM_MIN: 0.1,
  ZOOM_MAX: 4,
  ZOOM_DEFAULT: 1,
} as const;

// Analysis Configuration
export const COMPLEXITY_THRESHOLDS = {
  LOW: 5,
  MEDIUM: 10,
  HIGH: 20,
  VERY_HIGH: 30,
} as const;

export const PERFORMANCE_THRESHOLDS = {
  EXECUTION_TIME_MS: {
    FAST: 100,
    MODERATE: 500,
    SLOW: 1000,
    VERY_SLOW: 5000,
  },
  MEMORY_MB: {
    LOW: 10,
    MODERATE: 50,
    HIGH: 100,
    VERY_HIGH: 500,
  },
} as const;

// Cache Configuration
export const CACHE_KEYS = {
  ANALYSIS_RESULT: 'analysis:result:',
  AI_EXPLANATION: 'ai:explanation:',
  PROJECT_METADATA: 'project:metadata:',
  USER_PREFERENCES: 'user:preferences:',
  FLOWCHART_DATA: 'flowchart:data:',
} as const;

export const CACHE_TTL = {
  ANALYSIS_RESULT: 24 * 60 * 60, // 24 hours
  AI_EXPLANATION: 7 * 24 * 60 * 60, // 7 days
  PROJECT_METADATA: 60 * 60, // 1 hour
  USER_PREFERENCES: 30 * 60, // 30 minutes
  FLOWCHART_DATA: 2 * 60 * 60, // 2 hours
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_FILE_TYPE: 'Unsupported file type. Please upload JavaScript, TypeScript, JSX, or TSX files.',
  FILE_TOO_LARGE: 'File size exceeds the maximum limit of 50MB.',
  TOO_MANY_FILES: 'Project contains too many files. Maximum allowed is 10,000 files.',
  ANALYSIS_TIMEOUT: 'Analysis timed out. Please try with a smaller project or contact support.',
  NETWORK_ERROR: 'Network error occurred. Please check your connection and try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  PROJECT_NOT_FOUND: 'Project not found or you do not have access to it.',
  INVALID_INPUT: 'Invalid input provided. Please check your data and try again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  PROJECT_CREATED: 'Project created successfully!',
  ANALYSIS_COMPLETED: 'Code analysis completed successfully!',
  FLOWCHART_GENERATED: 'Flowchart generated successfully!',
  COLLABORATION_STARTED: 'Collaboration session started!',
  ANNOTATION_SAVED: 'Annotation saved successfully!',
  SETTINGS_UPDATED: 'Settings updated successfully!',
} as const;

// Regex Patterns
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PROJECT_NAME: /^[a-zA-Z0-9\s\-_]{1,100}$/,
  FILE_PATH: /^[a-zA-Z0-9\s\-_./\\]+$/,
  SEMANTIC_VERSION: /^\d+\.\d+\.\d+$/,
} as const;

// Feature Flags
export const FEATURES = {
  AI_EXPLANATIONS: true,
  REAL_TIME_COLLABORATION: true,
  PERFORMANCE_METRICS: true,
  SECURITY_ANALYSIS: true,
  EXPORT_FLOWCHARTS: true,
  VSCODE_EXTENSION: false, // Coming soon
} as const;