import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConfigurationManager } from '../utils/ConfigurationManager';
import { DataTransformer } from '../utils/DataTransformer';
import { Logger } from '../utils/Logger';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Configuration Manager', () => {
        const configManager = new ConfigurationManager();
        const config = configManager.getConfiguration();
        
        assert.strictEqual(typeof config.apiUrl, 'string');
        assert.strictEqual(typeof config.autoAnalysis, 'boolean');
        assert.strictEqual(typeof config.showComplexityIndicators, 'boolean');
        assert.strictEqual(typeof config.enableSecurityScanning, 'boolean');
        assert.ok(['light', 'dark', 'ocean'].includes(config.flowchartTheme));
        assert.strictEqual(typeof config.maxFileSize, 'number');
        assert.ok(Array.isArray(config.excludePatterns));
    });

    test('Data Transformer - Empty Flowchart', () => {
        const emptyData = {};
        const transformed = DataTransformer.transformFlowchartData(emptyData);
        
        assert.ok(Array.isArray(transformed.nodes));
        assert.ok(Array.isArray(transformed.edges));
        assert.strictEqual(transformed.nodes.length, 0);
        assert.strictEqual(transformed.edges.length, 0);
        assert.strictEqual(transformed.metadata.type, 'file');
        assert.strictEqual(transformed.metadata.title, 'Flowchart');
    });

    test('Data Transformer - Flowchart with Nodes', () => {
        const testData = {
            nodes: [
                {
                    id: 'node1',
                    type: 'function',
                    data: { label: 'Test Function' },
                    position: { x: 100, y: 200 }
                }
            ],
            edges: [
                {
                    id: 'edge1',
                    source: 'node1',
                    target: 'node2',
                    data: { relationship: 'calls' }
                }
            ],
            metadata: {
                type: 'file',
                title: 'Test Flowchart'
            }
        };

        const transformed = DataTransformer.transformFlowchartData(testData);
        
        assert.strictEqual(transformed.nodes.length, 1);
        assert.strictEqual(transformed.edges.length, 1);
        assert.strictEqual(transformed.nodes[0].id, 'node1');
        assert.strictEqual(transformed.nodes[0].data.label, 'Test Function');
        assert.strictEqual(transformed.edges[0].data?.relationship, 'calls');
    });

    test('Data Transformer - Complexity Analysis', () => {
        const testData = {
            file: 'test.ts',
            overallComplexity: 15,
            functions: [
                {
                    name: 'testFunction',
                    complexity: 5,
                    maintainabilityIndex: 80,
                    technicalDebt: 2
                }
            ],
            recommendations: ['Reduce complexity']
        };

        const transformed = DataTransformer.transformComplexityAnalysis(testData);
        
        assert.strictEqual(transformed.file, 'test.ts');
        assert.strictEqual(transformed.overallComplexity, 15);
        assert.strictEqual(transformed.functions.length, 1);
        assert.strictEqual(transformed.functions[0].name, 'testFunction');
        assert.strictEqual(transformed.recommendations.length, 1);
    });

    test('Data Transformer - Security Scan Result', () => {
        const testData = {
            file: 'test.ts',
            vulnerabilities: [
                {
                    type: 'SQL Injection',
                    severity: 'high',
                    description: 'Potential SQL injection',
                    line: 42,
                    recommendation: 'Use parameterized queries'
                }
            ],
            riskScore: 85,
            summary: {
                total: 1,
                bySeverity: { high: 1 }
            }
        };

        const transformed = DataTransformer.transformSecurityScanResult(testData);
        
        assert.strictEqual(transformed.file, 'test.ts');
        assert.strictEqual(transformed.vulnerabilities.length, 1);
        assert.strictEqual(transformed.vulnerabilities[0].type, 'SQL Injection');
        assert.strictEqual(transformed.vulnerabilities[0].severity, 'high');
        assert.strictEqual(transformed.riskScore, 85);
    });

    test('Data Transformer - Path Normalization', () => {
        const windowsPath = 'src\\components\\Test.tsx';
        const normalized = DataTransformer.normalizePath(windowsPath);
        
        assert.strictEqual(normalized, 'src/components/Test.tsx');
    });

    test('Logger Initialization', () => {
        Logger.initialize();
        
        // Test that logger methods don't throw
        assert.doesNotThrow(() => {
            Logger.info('Test info message');
            Logger.warn('Test warning message');
            Logger.debug('Test debug message');
        });
    });

    test('File Extension Detection', () => {
        const testCases = [
            { path: 'test.ts', expected: 'typescript' },
            { path: 'test.tsx', expected: 'typescriptreact' },
            { path: 'test.js', expected: 'javascript' },
            { path: 'test.jsx', expected: 'javascriptreact' },
            { path: 'test.unknown', expected: 'javascript' }
        ];

        testCases.forEach(({ path, expected }) => {
            const uri = vscode.Uri.file(path);
            const request = DataTransformer.createAnalysisRequest(uri, 'test content');
            assert.strictEqual(request.language, expected);
        });
    });

    test('Configuration File Exclusion', () => {
        const configManager = new ConfigurationManager();
        
        // Test default exclusion patterns
        assert.strictEqual(configManager.isFileExcluded('node_modules/test.js'), true);
        assert.strictEqual(configManager.isFileExcluded('dist/bundle.js'), true);
        assert.strictEqual(configManager.isFileExcluded('src/test.ts'), false);
    });

    test('Configuration File Size Check', () => {
        const configManager = new ConfigurationManager();
        
        // Test file size limits
        assert.strictEqual(configManager.isFileSizeAllowed(1000), true);
        assert.strictEqual(configManager.isFileSizeAllowed(2000000), false); // 2MB > 1MB default
    });
});