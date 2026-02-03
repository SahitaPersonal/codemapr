import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIService } from './ai.service';
import { AICacheService } from './ai-cache.service';

describe('AIService Integration', () => {
  let service: AIService;
  let cacheService: AICacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined), // No OpenAI API key for testing
          },
        },
        {
          provide: AICacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            getStats: jest.fn().mockReturnValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<AIService>(AIService);
    cacheService = module.get<AICacheService>(AICacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('mapStaticToAISecurityIssue', () => {
    it('should map static security vulnerability to AI security issue', () => {
      const staticVuln = {
        type: 'sql_injection',
        severity: 'high',
        title: 'SQL Injection Vulnerability',
        description: 'Potential SQL injection found',
        location: {
          start: { line: 10, column: 5 },
          end: { line: 10, column: 20 },
        },
        recommendation: 'Use parameterized queries',
        cweId: 'CWE-89',
      };

      // Access the private method through type assertion
      const mappedIssue = (service as any).mapStaticToAISecurityIssue(staticVuln);

      expect(mappedIssue).toEqual({
        type: 'vulnerability',
        severity: 'high',
        title: 'SQL Injection Vulnerability',
        description: 'Potential SQL injection found',
        location: {
          line: 10,
          column: 5,
        },
        recommendation: 'Use parameterized queries',
        cweId: 'CWE-89',
      });
    });

    it('should handle missing location', () => {
      const staticVuln = {
        type: 'hardcoded_secrets',
        severity: 'critical',
        title: 'Hardcoded Secret',
        description: 'API key found in code',
        recommendation: 'Use environment variables',
      };

      const mappedIssue = (service as any).mapStaticToAISecurityIssue(staticVuln);

      expect(mappedIssue.location).toBeUndefined();
      expect(mappedIssue.type).toBe('configuration');
      expect(mappedIssue.severity).toBe('critical');
    });
  });

  describe('mapStaticToAIPerformanceIssue', () => {
    it('should map static performance issue to AI performance issue', () => {
      const staticIssue = {
        type: 'algorithmic_complexity',
        severity: 'high',
        title: 'Nested Loop Detected',
        description: 'O(n²) complexity found',
        location: {
          start: { line: 15, column: 8 },
          end: { line: 20, column: 10 },
        },
        recommendation: 'Use hash map for O(1) lookup',
        estimatedImpact: 'High - O(n²) time complexity',
      };

      const mappedIssue = (service as any).mapStaticToAIPerformanceIssue(staticIssue);

      expect(mappedIssue).toEqual({
        type: 'algorithm',
        severity: 'high',
        title: 'Nested Loop Detected',
        description: 'O(n²) complexity found',
        location: {
          line: 15,
          column: 8,
        },
        recommendation: 'Use hash map for O(1) lookup',
        estimatedImpact: 'High - O(n²) time complexity',
      });
    });

    it('should map different performance issue types correctly', () => {
      const memoryIssue = {
        type: 'memory_leak',
        severity: 'medium',
        title: 'Memory Leak',
        description: 'Potential memory leak detected',
        recommendation: 'Clear intervals properly',
        estimatedImpact: 'Medium - gradual memory growth',
      };

      const mappedIssue = (service as any).mapStaticToAIPerformanceIssue(memoryIssue);

      expect(mappedIssue.type).toBe('memory');
      expect(mappedIssue.severity).toBe('medium');
    });
  });

  describe('analyzeCodeSecurity', () => {
    it('should handle analysis without OpenAI API key', async () => {
      const code = 'const query = "SELECT * FROM users WHERE id = " + userId;';
      const filePath = 'test.js';
      const fileAnalysis = {
        securityVulnerabilities: [
          {
            type: 'sql_injection',
            severity: 'high',
            title: 'SQL Injection',
            description: 'Potential SQL injection',
            recommendation: 'Use parameterized queries',
          },
        ],
      };

      const result = await service.analyzeCodeSecurity(code, filePath, fileAnalysis as any);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('vulnerability');
      expect(result[0].severity).toBe('high');
    });
  });

  describe('analyzeCodePerformance', () => {
    it('should handle analysis without OpenAI API key', async () => {
      const code = 'for(let i = 0; i < arr.length; i++) { for(let j = 0; j < arr.length; j++) { } }';
      const filePath = 'test.js';
      const complexity = { cyclomatic: 5, cognitive: 8, maintainability: 70, technicalDebt: 2 };
      const fileAnalysis = {
        performanceIssues: [
          {
            type: 'algorithmic_complexity',
            severity: 'high',
            title: 'Nested Loop',
            description: 'O(n²) complexity',
            recommendation: 'Optimize algorithm',
            estimatedImpact: 'High performance impact',
          },
        ],
      };

      const result = await service.analyzeCodePerformance(code, filePath, complexity, fileAnalysis as any);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('algorithm');
      expect(result[0].severity).toBe('high');
    });
  });

  describe('service health', () => {
    it('should return unhealthy status without API key', async () => {
      const health = await service.getServiceHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.configured).toBe(false);
      expect(health.rateLimitStatus.requestsInLastMinute).toBe(0);
      expect(health.rateLimitStatus.maxRequestsPerMinute).toBe(60);
    });
  });
});