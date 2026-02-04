// Shared types that match the web application and backend
// These should be kept in sync with packages/shared/src/types/

export interface FlowchartData {
    nodes: FlowNode[];
    edges: FlowEdge[];
    metadata: {
        type: 'project' | 'file' | 'function';
        title: string;
        description?: string;
        theme?: string;
        generatedAt?: string;
        version?: string;
    };
}

export interface FlowNode {
    id: string;
    type: string;
    data: {
        label: string;
        description?: string;
        complexity?: number;
        performance?: {
            score: number;
            issues: string[];
            bottlenecks?: string[];
        };
        security?: {
            vulnerabilities: SecurityVulnerability[];
            riskScore?: number;
        };
        sourceLocation?: {
            file: string;
            line?: number;
            column?: number;
            endLine?: number;
            endColumn?: number;
        };
        metadata?: Record<string, any>;
    };
    position: { x: number; y: number };
    style?: Record<string, any>;
}

export interface FlowEdge {
    id: string;
    source: string;
    target: string;
    type?: string;
    data?: {
        label?: string;
        relationship: string;
        weight?: number;
        metadata?: Record<string, any>;
    };
    style?: Record<string, any>;
}

export interface SecurityVulnerability {
    id?: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    line?: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
    recommendation: string;
    cwe?: string;
    confidence?: 'low' | 'medium' | 'high';
    impact?: string;
}

export interface ComplexityAnalysis {
    file: string;
    overallComplexity: number;
    maintainabilityIndex: number;
    technicalDebt: number;
    functions: ComplexityFunction[];
    classes: ComplexityClass[];
    recommendations: string[];
    metrics: {
        linesOfCode: number;
        cyclomaticComplexity: number;
        cognitiveComplexity: number;
        halsteadComplexity?: number;
    };
}

export interface ComplexityFunction {
    name: string;
    complexity: number;
    maintainabilityIndex: number;
    technicalDebt: number;
    startLine: number;
    endLine: number;
    parameters: number;
    returns: string;
}

export interface ComplexityClass {
    name: string;
    complexity: number;
    methods: ComplexityFunction[];
    properties: number;
    startLine: number;
    endLine: number;
}

export interface SecurityScanResult {
    file: string;
    vulnerabilities: SecurityVulnerability[];
    riskScore: number;
    summary: {
        total: number;
        bySeverity: Record<string, number>;
        byType: Record<string, number>;
    };
    recommendations: string[];
    scanTime: string;
}

export interface PerformanceAnalysis {
    file: string;
    score: number;
    issues: PerformanceIssue[];
    bottlenecks: PerformanceBottleneck[];
    recommendations: string[];
    metrics: {
        executionTime?: number;
        memoryUsage?: number;
        cpuUsage?: number;
    };
}

export interface PerformanceIssue {
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    line?: number;
    column?: number;
    impact: string;
    solution: string;
}

export interface PerformanceBottleneck {
    location: string;
    type: string;
    impact: number;
    description: string;
    suggestions: string[];
}

export interface ProjectAnalysis {
    projectPath: string;
    files: FileAnalysis[];
    dependencies: DependencyGraph;
    complexity: ProjectComplexity;
    security: ProjectSecurity;
    performance: ProjectPerformance;
    metadata: {
        analyzedAt: string;
        version: string;
        totalFiles: number;
        totalLines: number;
    };
}

export interface FileAnalysis {
    filePath: string;
    language: string;
    complexity: ComplexityAnalysis;
    security: SecurityScanResult;
    performance: PerformanceAnalysis;
    dependencies: FileDependency[];
    exports: FileExport[];
    imports: FileImport[];
}

export interface DependencyGraph {
    nodes: DependencyNode[];
    edges: DependencyEdge[];
    cycles: string[][];
    metrics: {
        totalDependencies: number;
        circularDependencies: number;
        maxDepth: number;
        fanIn: Record<string, number>;
        fanOut: Record<string, number>;
    };
}

export interface DependencyNode {
    id: string;
    filePath: string;
    type: 'internal' | 'external' | 'builtin';
    size: number;
    complexity: number;
}

export interface DependencyEdge {
    id: string;
    source: string;
    target: string;
    type: 'import' | 'require' | 'dynamic';
    weight: number;
}

export interface FileDependency {
    path: string;
    type: 'import' | 'require' | 'dynamic';
    specifiers: string[];
    line: number;
    column: number;
}

export interface FileExport {
    name: string;
    type: 'function' | 'class' | 'variable' | 'type' | 'interface';
    line: number;
    column: number;
    isDefault: boolean;
}

export interface FileImport {
    source: string;
    specifiers: ImportSpecifier[];
    type: 'import' | 'require' | 'dynamic';
    line: number;
    column: number;
}

export interface ImportSpecifier {
    name: string;
    alias?: string;
    isDefault: boolean;
    isNamespace: boolean;
}

export interface ProjectComplexity {
    overall: number;
    average: number;
    median: number;
    highest: {
        file: string;
        complexity: number;
    };
    distribution: Record<string, number>;
    trends: ComplexityTrend[];
}

export interface ProjectSecurity {
    riskScore: number;
    totalVulnerabilities: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    hotspots: SecurityHotspot[];
    trends: SecurityTrend[];
}

export interface ProjectPerformance {
    score: number;
    totalIssues: number;
    bottlenecks: PerformanceBottleneck[];
    recommendations: string[];
    trends: PerformanceTrend[];
}

export interface ComplexityTrend {
    date: string;
    complexity: number;
    files: number;
}

export interface SecurityTrend {
    date: string;
    riskScore: number;
    vulnerabilities: number;
}

export interface PerformanceTrend {
    date: string;
    score: number;
    issues: number;
}

export interface SecurityHotspot {
    file: string;
    vulnerabilities: number;
    riskScore: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

// Configuration types
export interface ExtensionConfig {
    apiUrl: string;
    autoAnalysis: boolean;
    showComplexityIndicators: boolean;
    enableSecurityScanning: boolean;
    flowchartTheme: 'light' | 'dark' | 'ocean';
    maxFileSize: number;
    excludePatterns: string[];
    enablePerformanceAnalysis: boolean;
    cacheResults: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// API Response types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    timestamp: string;
}

export interface HealthCheckResponse {
    status: 'ok' | 'error';
    version: string;
    uptime: number;
    services: Record<string, 'healthy' | 'unhealthy'>;
}

// Event types for communication between extension and webview
export interface WebviewEvent {
    type: string;
    data?: any;
    timestamp: number;
    source: 'extension' | 'webview';
}

export interface ExtensionEvent extends WebviewEvent {
    source: 'extension';
}

export interface WebviewMessage extends WebviewEvent {
    source: 'webview';
    requestId?: string;
}