import { Test, TestingModule } from '@nestjs/testing';
import { FlowchartService } from './flowchart.service';
import {
  ProjectAnalysis,
  FileAnalysis,
  FlowchartType,
  NodeType,
  EdgeType,
  SupportedLanguage,
} from '@codemapr/shared';

describe('FlowchartService', () => {
  let service: FlowchartService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FlowchartService],
    }).compile();

    service = module.get<FlowchartService>(FlowchartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateProjectFlowchart', () => {
    it('should generate a project flowchart from analysis data', async () => {
      const mockAnalysis: ProjectAnalysis = {
        id: 'test-analysis',
        projectId: 'test-project',
        files: [
          {
            filePath: 'src/index.ts',
            language: SupportedLanguage.TYPESCRIPT,
            ast: {},
            symbols: [],
            imports: [],
            exports: [],
            functions: [
              {
                name: 'main',
                parameters: [],
                isAsync: false,
                location: {
                  filePath: 'src/index.ts',
                  start: { line: 1, column: 1 },
                  end: { line: 10, column: 1 },
                },
                complexity: 2,
              },
            ],
            classes: [],
            complexity: {
              cyclomatic: 2,
              cognitive: 1,
              maintainability: 85,
              technicalDebt: 0.1,
            },
          },
        ],
        dependencies: {
          nodes: [
            {
              id: 'src/index.ts',
              filePath: 'src/index.ts',
              type: 'file',
              name: 'index.ts',
            },
          ],
          edges: [],
          cycles: [],
        },
        entryPoints: ['src/index.ts'],
        metadata: {
          name: 'test-project',
          version: '1.0.0',
          language: SupportedLanguage.TYPESCRIPT,
          packageManager: 'npm',
          totalFiles: 1,
          totalLines: 10,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await service.generateProjectFlowchart(mockAnalysis);

      expect(result).toBeDefined();
      expect(result.type).toBe(FlowchartType.PROJECT_OVERVIEW);
      expect(result.nodes).toHaveLength(2); // file + function
      expect(result.edges).toHaveLength(1); // file -> function
      expect(result.nodes[0].type).toBe(NodeType.FILE);
      expect(result.nodes[1].type).toBe(NodeType.FUNCTION);
    });
  });

  describe('generateFileFlowchart', () => {
    it('should generate a file flowchart from file analysis data', async () => {
      const mockFileAnalysis: FileAnalysis = {
        filePath: 'src/components/Button.tsx',
        language: SupportedLanguage.TSX,
        ast: {},
        symbols: [],
        imports: [],
        exports: [],
        functions: [
          {
            name: 'Button',
            parameters: [
              {
                name: 'props',
                type: 'ButtonProps',
                optional: false,
              },
            ],
            isAsync: false,
            location: {
              filePath: 'src/components/Button.tsx',
              start: { line: 5, column: 1 },
              end: { line: 15, column: 1 },
            },
            complexity: 1,
          },
        ],
        classes: [],
        complexity: {
          cyclomatic: 1,
          cognitive: 1,
          maintainability: 90,
          technicalDebt: 0.05,
        },
      };

      const result = await service.generateFileFlowchart(mockFileAnalysis);

      expect(result).toBeDefined();
      expect(result.type).toBe(FlowchartType.FILE_SPECIFIC);
      expect(result.nodes).toHaveLength(2); // file + function
      expect(result.edges).toHaveLength(1); // file -> function
      expect(result.nodes[0].type).toBe(NodeType.FILE);
      expect(result.nodes[1].type).toBe(NodeType.FUNCTION);
    });
  });

  describe('generateDependencyGraph', () => {
    it('should generate a dependency graph from project analysis', async () => {
      const mockAnalysis: ProjectAnalysis = {
        id: 'test-analysis',
        projectId: 'test-project',
        files: [],
        dependencies: {
          nodes: [
            {
              id: 'src/utils.ts',
              filePath: 'src/utils.ts',
              type: 'file',
              name: 'utils.ts',
            },
            {
              id: 'src/index.ts',
              filePath: 'src/index.ts',
              type: 'file',
              name: 'index.ts',
            },
          ],
          edges: [
            {
              from: 'src/index.ts',
              to: 'src/utils.ts',
              type: 'import',
              dynamic: false,
            },
          ],
          cycles: [],
        },
        entryPoints: ['src/index.ts'],
        metadata: {
          name: 'test-project',
          version: '1.0.0',
          language: SupportedLanguage.TYPESCRIPT,
          packageManager: 'npm',
          totalFiles: 2,
          totalLines: 50,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await service.generateDependencyGraph(mockAnalysis);

      expect(result).toBeDefined();
      expect(result.type).toBe(FlowchartType.DEPENDENCY_GRAPH);
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].type).toBe(EdgeType.IMPORT);
    });
  });
});