import * as vscode from 'vscode';
import { FlowchartData, FlowNode, FlowEdge, ComplexityAnalysis, SecurityScanResult } from '../types/shared';
import { Logger } from './Logger';

/**
 * Transforms data between different formats to ensure consistency
 * across web application and VSCode extension
 */
export class DataTransformer {
    
    /**
     * Transform backend flowchart data to extension format
     */
    static transformFlowchartData(backendData: any): FlowchartData {
        try {
            // Ensure the data has the expected structure
            const flowchartData: FlowchartData = {
                nodes: this.transformNodes(backendData.nodes || []),
                edges: this.transformEdges(backendData.edges || []),
                metadata: {
                    type: backendData.metadata?.type || 'file',
                    title: backendData.metadata?.title || 'Flowchart',
                    description: backendData.metadata?.description,
                    theme: backendData.metadata?.theme || 'light',
                    generatedAt: backendData.metadata?.generatedAt || new Date().toISOString(),
                    version: backendData.metadata?.version || '1.0.0'
                }
            };

            Logger.debug('Transformed flowchart data', { 
                nodeCount: flowchartData.nodes.length, 
                edgeCount: flowchartData.edges.length 
            });

            return flowchartData;
        } catch (error) {
            Logger.error('Failed to transform flowchart data', error);
            return this.createEmptyFlowchart();
        }
    }

    /**
     * Transform backend nodes to extension format
     */
    private static transformNodes(backendNodes: any[]): FlowNode[] {
        return backendNodes.map((node, index) => {
            try {
                return {
                    id: node.id || `node-${index}`,
                    type: node.type || 'default',
                    data: {
                        label: node.data?.label || node.label || `Node ${index + 1}`,
                        description: node.data?.description || node.description,
                        complexity: this.normalizeComplexity(node.data?.complexity || node.complexity),
                        performance: this.transformPerformanceData(node.data?.performance || node.performance),
                        security: this.transformSecurityData(node.data?.security || node.security),
                        sourceLocation: this.transformSourceLocation(node.data?.sourceLocation || node.sourceLocation),
                        metadata: node.data?.metadata || node.metadata
                    },
                    position: {
                        x: node.position?.x || (index % 5) * 150,
                        y: node.position?.y || Math.floor(index / 5) * 100
                    },
                    style: node.style || {}
                };
            } catch (error) {
                Logger.warn(`Failed to transform node ${index}`, error);
                return this.createDefaultNode(index);
            }
        });
    }

    /**
     * Transform backend edges to extension format
     */
    private static transformEdges(backendEdges: any[]): FlowEdge[] {
        return backendEdges.map((edge, index) => {
            try {
                return {
                    id: edge.id || `edge-${index}`,
                    source: edge.source || '',
                    target: edge.target || '',
                    type: edge.type || 'default',
                    data: {
                        label: edge.data?.label || edge.label,
                        relationship: edge.data?.relationship || edge.relationship || 'depends',
                        weight: edge.data?.weight || edge.weight || 1,
                        metadata: edge.data?.metadata || edge.metadata
                    },
                    style: edge.style || {}
                };
            } catch (error) {
                Logger.warn(`Failed to transform edge ${index}`, error);
                return this.createDefaultEdge(index);
            }
        });
    }

    /**
     * Transform complexity analysis data
     */
    static transformComplexityAnalysis(backendData: any): ComplexityAnalysis {
        try {
            return {
                file: backendData.file || backendData.filePath || '',
                overallComplexity: backendData.overallComplexity || backendData.complexity || 0,
                maintainabilityIndex: backendData.maintainabilityIndex || 0,
                technicalDebt: backendData.technicalDebt || 0,
                functions: (backendData.functions || []).map(this.transformComplexityFunction),
                classes: (backendData.classes || []).map(this.transformComplexityClass),
                recommendations: backendData.recommendations || [],
                metrics: {
                    linesOfCode: backendData.metrics?.linesOfCode || backendData.linesOfCode || 0,
                    cyclomaticComplexity: backendData.metrics?.cyclomaticComplexity || backendData.cyclomaticComplexity || 0,
                    cognitiveComplexity: backendData.metrics?.cognitiveComplexity || backendData.cognitiveComplexity || 0,
                    halsteadComplexity: backendData.metrics?.halsteadComplexity || backendData.halsteadComplexity
                }
            };
        } catch (error) {
            Logger.error('Failed to transform complexity analysis', error);
            return this.createEmptyComplexityAnalysis();
        }
    }

    /**
     * Transform security scan results
     */
    static transformSecurityScanResult(backendData: any): SecurityScanResult {
        try {
            return {
                file: backendData.file || backendData.filePath || '',
                vulnerabilities: (backendData.vulnerabilities || []).map(this.transformVulnerability),
                riskScore: backendData.riskScore || 0,
                summary: {
                    total: backendData.summary?.total || backendData.total || 0,
                    bySeverity: backendData.summary?.bySeverity || backendData.bySeverity || {},
                    byType: backendData.summary?.byType || backendData.byType || {}
                },
                recommendations: backendData.recommendations || [],
                scanTime: backendData.scanTime || new Date().toISOString()
            };
        } catch (error) {
            Logger.error('Failed to transform security scan result', error);
            return this.createEmptySecurityScanResult();
        }
    }

    /**
     * Convert VSCode URI to relative path for backend
     */
    static uriToRelativePath(uri: vscode.Uri): string {
        return vscode.workspace.asRelativePath(uri);
    }

    /**
     * Convert relative path to VSCode URI
     */
    static relativePathToUri(relativePath: string): vscode.Uri | null {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return null;
        }
        return vscode.Uri.joinPath(workspaceFolder.uri, relativePath);
    }

    /**
     * Normalize file paths for cross-platform compatibility
     */
    static normalizePath(path: string): string {
        return path.replace(/\\/g, '/');
    }

    /**
     * Create request payload for backend API
     */
    static createAnalysisRequest(uri: vscode.Uri, content: string, options: any = {}): any {
        return {
            filePath: this.uriToRelativePath(uri),
            content,
            language: this.getLanguageFromUri(uri),
            options: {
                includeComplexity: true,
                includeSecurity: true,
                includePerformance: true,
                ...options
            },
            metadata: {
                timestamp: new Date().toISOString(),
                source: 'vscode-extension',
                version: '1.0.0'
            }
        };
    }

    // Private helper methods

    private static normalizeComplexity(complexity: any): number | undefined {
        if (typeof complexity === 'number') {
            return Math.max(0, complexity);
        }
        if (typeof complexity === 'string') {
            const parsed = parseFloat(complexity);
            return isNaN(parsed) ? undefined : Math.max(0, parsed);
        }
        return undefined;
    }

    private static transformPerformanceData(performance: any): any {
        if (!performance) return undefined;
        
        return {
            score: performance.score || 0,
            issues: performance.issues || [],
            bottlenecks: performance.bottlenecks || []
        };
    }

    private static transformSecurityData(security: any): any {
        if (!security) return undefined;
        
        return {
            vulnerabilities: (security.vulnerabilities || []).map(this.transformVulnerability),
            riskScore: security.riskScore || 0
        };
    }

    private static transformSourceLocation(sourceLocation: any): any {
        if (!sourceLocation) return undefined;
        
        return {
            file: sourceLocation.file || sourceLocation.filePath || '',
            line: sourceLocation.line || sourceLocation.startLine,
            column: sourceLocation.column || sourceLocation.startColumn,
            endLine: sourceLocation.endLine,
            endColumn: sourceLocation.endColumn
        };
    }

    private static transformComplexityFunction(func: any): any {
        return {
            name: func.name || '',
            complexity: func.complexity || 0,
            maintainabilityIndex: func.maintainabilityIndex || 0,
            technicalDebt: func.technicalDebt || 0,
            startLine: func.startLine || func.line || 0,
            endLine: func.endLine || func.startLine || 0,
            parameters: func.parameters || func.parameterCount || 0,
            returns: func.returns || func.returnType || 'void'
        };
    }

    private static transformComplexityClass(cls: any): any {
        return {
            name: cls.name || '',
            complexity: cls.complexity || 0,
            methods: (cls.methods || []).map(this.transformComplexityFunction),
            properties: cls.properties || cls.propertyCount || 0,
            startLine: cls.startLine || cls.line || 0,
            endLine: cls.endLine || cls.startLine || 0
        };
    }

    private static transformVulnerability(vuln: any): any {
        return {
            id: vuln.id,
            type: vuln.type || '',
            severity: vuln.severity || 'low',
            description: vuln.description || '',
            line: vuln.line || vuln.startLine,
            column: vuln.column || vuln.startColumn,
            endLine: vuln.endLine,
            endColumn: vuln.endColumn,
            recommendation: vuln.recommendation || vuln.fix || '',
            cwe: vuln.cwe,
            confidence: vuln.confidence || 'medium',
            impact: vuln.impact
        };
    }

    private static getLanguageFromUri(uri: vscode.Uri): string {
        const extension = uri.fsPath.split('.').pop()?.toLowerCase();
        
        switch (extension) {
            case 'ts': return 'typescript';
            case 'tsx': return 'typescriptreact';
            case 'js': return 'javascript';
            case 'jsx': return 'javascriptreact';
            default: return 'javascript';
        }
    }

    // Default/empty data creators

    private static createEmptyFlowchart(): FlowchartData {
        return {
            nodes: [],
            edges: [],
            metadata: {
                type: 'file',
                title: 'Empty Flowchart',
                generatedAt: new Date().toISOString(),
                version: '1.0.0'
            }
        };
    }

    private static createDefaultNode(index: number): FlowNode {
        return {
            id: `node-${index}`,
            type: 'default',
            data: {
                label: `Node ${index + 1}`
            },
            position: {
                x: (index % 5) * 150,
                y: Math.floor(index / 5) * 100
            }
        };
    }

    private static createDefaultEdge(index: number): FlowEdge {
        return {
            id: `edge-${index}`,
            source: '',
            target: '',
            data: {
                relationship: 'unknown'
            }
        };
    }

    private static createEmptyComplexityAnalysis(): ComplexityAnalysis {
        return {
            file: '',
            overallComplexity: 0,
            maintainabilityIndex: 0,
            technicalDebt: 0,
            functions: [],
            classes: [],
            recommendations: [],
            metrics: {
                linesOfCode: 0,
                cyclomaticComplexity: 0,
                cognitiveComplexity: 0
            }
        };
    }

    private static createEmptySecurityScanResult(): SecurityScanResult {
        return {
            file: '',
            vulnerabilities: [],
            riskScore: 0,
            summary: {
                total: 0,
                bySeverity: {},
                byType: {}
            },
            recommendations: [],
            scanTime: new Date().toISOString()
        };
    }
}