// API client for backend communication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface AnalysisResult {
  filePath: string;
  language: string;
  ast: any;
  symbols: any[];
  imports: any[];
  exports: any[];
  functions: any[];
  classes: any[];
  complexity: {
    cyclomatic: number;
    cognitive: number;
    maintainability: number;
    technicalDebt: number;
  };
}

export interface FlowchartData {
  nodes: any[];
  edges: any[];
  metadata: any;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async analyzeFile(filePath: string, content: string, language: string): Promise<AnalysisResult> {
    console.log('[API] Analyzing file:', filePath, 'language:', language);
    const response = await fetch(`${this.baseUrl}/analysis/file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filePath,
        content,
        language,
      }),
    });

    console.log('[API] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Error response:', errorText);
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[API] Analysis data received:', {
      functions: data.functions?.length,
      classes: data.classes?.length,
      complexity: data.complexity?.cyclomatic
    });
    
    return data;
  }

  async generateFlowchart(
    type: string,
    filePath: string,
    analysisData: any
  ): Promise<{ flowchart: FlowchartData; generatedAt: Date; processingTime: number }> {
    console.log('[API] Generating flowchart for:', filePath);
    console.log('[API] Request payload:', { type, filePath, analysisData: '...' });
    
    const response = await fetch(`${this.baseUrl}/flowchart/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        filePath,
        analysisData,
        layoutAlgorithm: 'hierarchical',
        layoutDirection: 'TB',
      }),
    });

    console.log('[API] Flowchart response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Flowchart error response:', errorText);
      let errorMessage = `Flowchart generation failed: ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          errorMessage = `Flowchart generation failed: ${errorJson.message}`;
        }
      } catch (e) {
        // Not JSON, use text
        if (errorText) {
          errorMessage = `Flowchart generation failed: ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('[API] Flowchart generated successfully');
    return data;
  }

  async analyzeComplexity(filePath: string, content: string, language: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/analysis/complexity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filePath,
        content,
        language,
      }),
    });

    if (!response.ok) {
      throw new Error(`Complexity analysis failed: ${response.statusText}`);
    }

    return response.json();
  }

  async scanSecurity(filePath: string, content: string, language: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/security-vulnerability/scan-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filePath,
        content,
        language,
      }),
    });

    if (!response.ok) {
      throw new Error(`Security scan failed: ${response.statusText}`);
    }

    return response.json();
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/analysis/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export const apiClient = new ApiClient();
