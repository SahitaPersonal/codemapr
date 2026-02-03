import { Injectable, Logger } from '@nestjs/common';
import * as ts from 'typescript';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import {
  FileAnalysis,
  AnalysisSourceLocation,
  SupportedLanguage,
} from '@codemapr/shared';

export interface SecurityVulnerability {
  id: string;
  type: SecurityVulnerabilityType;
  severity: SecuritySeverity;
  title: string;
  description: string;
  location: AnalysisSourceLocation;
  recommendation: string;
  cweId?: string;
  owaspCategory?: string;
  confidence: number;
  metadata: Record<string, any>;
}

export interface SecurityAnalysisResult {
  vulnerabilities: SecurityVulnerability[];
  summary: SecuritySummary;
  riskScore: number;
}

export interface SecuritySummary {
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  categories: Record<string, number>;
}

export enum SecurityVulnerabilityType {
  SQL_INJECTION = 'sql_injection',
  XSS = 'xss',
  COMMAND_INJECTION = 'command_injection',
  PATH_TRAVERSAL = 'path_traversal',
  INSECURE_CRYPTO = 'insecure_crypto',
  WEAK_AUTHENTICATION = 'weak_authentication',
  AUTHORIZATION_BYPASS = 'authorization_bypass',
  SENSITIVE_DATA_EXPOSURE = 'sensitive_data_exposure',
  INSECURE_DESERIALIZATION = 'insecure_deserialization',
  HARDCODED_SECRETS = 'hardcoded_secrets',
  UNSAFE_EVAL = 'unsafe_eval',
  PROTOTYPE_POLLUTION = 'prototype_pollution',
  REGEX_DOS = 'regex_dos',
  INSECURE_RANDOM = 'insecure_random',
  MISSING_VALIDATION = 'missing_validation',
}

export enum SecuritySeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

@Injectable()
export class SecurityAnalyzer {
  private readonly logger = new Logger(SecurityAnalyzer.name);

  // SQL injection patterns
  private readonly sqlInjectionPatterns = [
    /\$\{[^}]*\}/g, // Template literal injection
    /['"`]\s*\+\s*\w+\s*\+\s*['"`]/g, // String concatenation
    /query\s*\(\s*['"`][^'"`]*['"`]\s*\+/gi, // Query concatenation
    /execute\s*\(\s*['"`][^'"`]*['"`]\s*\+/gi, // Execute concatenation
  ];

  // XSS patterns
  private readonly xssPatterns = [
    /innerHTML\s*=\s*[^;]+/gi,
    /outerHTML\s*=\s*[^;]+/gi,
    /document\.write\s*\(/gi,
    /eval\s*\(/gi,
    /setTimeout\s*\(\s*['"`]/gi,
    /setInterval\s*\(\s*['"`]/gi,
  ];

  // Command injection patterns
  private readonly commandInjectionPatterns = [
    /exec\s*\(/gi,
    /spawn\s*\(/gi,
    /system\s*\(/gi,
    /shell_exec\s*\(/gi,
    /passthru\s*\(/gi,
  ];

  // Hardcoded secrets patterns
  private readonly secretPatterns = [
    /password\s*[:=]\s*['"`][^'"`]{3,}['"`]/gi,
    /api[_-]?key\s*[:=]\s*['"`][^'"`]{10,}['"`]/gi,
    /secret\s*[:=]\s*['"`][^'"`]{10,}['"`]/gi,
    /token\s*[:=]\s*['"`][^'"`]{10,}['"`]/gi,
    /private[_-]?key\s*[:=]\s*['"`][^'"`]{10,}['"`]/gi,
  ];

  // Insecure crypto patterns
  private readonly insecureCryptoPatterns = [
    /md5\s*\(/gi,
    /sha1\s*\(/gi,
    /des\s*\(/gi,
    /rc4\s*\(/gi,
    /Math\.random\s*\(\s*\)/gi, // Insecure random
  ];

  // Dangerous functions
  private readonly dangerousFunctions = [
    'eval',
    'Function',
    'setTimeout',
    'setInterval',
    'execScript',
    'msWriteProfilerMark',
  ];

  async analyzeTypeScriptFile(filePath: string, sourceFile: ts.SourceFile): Promise<SecurityAnalysisResult> {
    this.logger.debug(`Analyzing TypeScript file for security issues: ${filePath}`);

    const vulnerabilities: SecurityVulnerability[] = [];

    const visit = (node: ts.Node) => {
      // Check for SQL injection vulnerabilities
      const sqlVulns = this.detectSqlInjectionTypeScript(node, sourceFile, filePath);
      vulnerabilities.push(...sqlVulns);

      // Check for XSS vulnerabilities
      const xssVulns = this.detectXssTypeScript(node, sourceFile, filePath);
      vulnerabilities.push(...xssVulns);

      // Check for command injection
      const cmdVulns = this.detectCommandInjectionTypeScript(node, sourceFile, filePath);
      vulnerabilities.push(...cmdVulns);

      // Check for hardcoded secrets
      const secretVulns = this.detectHardcodedSecretsTypeScript(node, sourceFile, filePath);
      vulnerabilities.push(...secretVulns);

      // Check for insecure crypto
      const cryptoVulns = this.detectInsecureCryptoTypeScript(node, sourceFile, filePath);
      vulnerabilities.push(...cryptoVulns);

      // Check for unsafe eval usage
      const evalVulns = this.detectUnsafeEvalTypeScript(node, sourceFile, filePath);
      vulnerabilities.push(...evalVulns);

      // Check for prototype pollution
      const prototypeVulns = this.detectPrototypePollutionTypeScript(node, sourceFile, filePath);
      vulnerabilities.push(...prototypeVulns);

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return this.buildSecurityAnalysisResult(vulnerabilities);
  }

  async analyzeJavaScriptFile(filePath: string, ast: t.File): Promise<SecurityAnalysisResult> {
    this.logger.debug(`Analyzing JavaScript file for security issues: ${filePath}`);

    const vulnerabilities: SecurityVulnerability[] = [];

    traverse(ast, {
      CallExpression: (path) => {
        // Check for dangerous function calls
        const callVulns = this.detectDangerousFunctionCalls(path.node, filePath);
        vulnerabilities.push(...callVulns);

        // Check for SQL injection
        const sqlVulns = this.detectSqlInjectionJavaScript(path.node, filePath);
        vulnerabilities.push(...sqlVulns);

        // Check for command injection
        const cmdVulns = this.detectCommandInjectionJavaScript(path.node, filePath);
        vulnerabilities.push(...cmdVulns);
      },
      AssignmentExpression: (path) => {
        // Check for XSS through DOM manipulation
        const xssVulns = this.detectXssJavaScript(path.node, filePath);
        vulnerabilities.push(...xssVulns);
      },
      StringLiteral: (path) => {
        // Check for hardcoded secrets
        const secretVulns = this.detectHardcodedSecretsJavaScript(path.node, filePath);
        vulnerabilities.push(...secretVulns);
      },
      TemplateLiteral: (path) => {
        // Check for template injection
        const templateVulns = this.detectTemplateInjectionJavaScript(path.node, filePath);
        vulnerabilities.push(...templateVulns);
      },
      MemberExpression: (path) => {
        // Check for prototype pollution
        const prototypeVulns = this.detectPrototypePollutionJavaScript(path.node, filePath);
        vulnerabilities.push(...prototypeVulns);
      },
    });

    return this.buildSecurityAnalysisResult(vulnerabilities);
  }

  private detectSqlInjectionTypeScript(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    if (ts.isCallExpression(node)) {
      const callText = node.getText();
      
      // Check for string concatenation in SQL queries
      if (this.containsSqlKeywords(callText) && this.hasStringConcatenation(node)) {
        vulnerabilities.push({
          id: `sql-injection-${node.getStart()}`,
          type: SecurityVulnerabilityType.SQL_INJECTION,
          severity: SecuritySeverity.HIGH,
          title: 'Potential SQL Injection',
          description: 'SQL query uses string concatenation which may lead to SQL injection vulnerabilities.',
          location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
          recommendation: 'Use parameterized queries or prepared statements instead of string concatenation.',
          cweId: 'CWE-89',
          owaspCategory: 'A03:2021 – Injection',
          confidence: 0.8,
          metadata: {
            queryText: callText.substring(0, 200),
            pattern: 'string_concatenation',
          },
        });
      }

      // Check for template literal injection
      if (this.containsSqlKeywords(callText) && this.hasTemplateLiteral(node)) {
        vulnerabilities.push({
          id: `sql-template-${node.getStart()}`,
          type: SecurityVulnerabilityType.SQL_INJECTION,
          severity: SecuritySeverity.HIGH,
          title: 'SQL Injection via Template Literal',
          description: 'SQL query uses template literals with user input which may lead to SQL injection.',
          location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
          recommendation: 'Use parameterized queries instead of template literals for SQL queries.',
          cweId: 'CWE-89',
          owaspCategory: 'A03:2021 – Injection',
          confidence: 0.9,
          metadata: {
            queryText: callText.substring(0, 200),
            pattern: 'template_literal',
          },
        });
      }
    }

    return vulnerabilities;
  }

  private detectXssTypeScript(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const leftText = node.left.getText();
      
      if (leftText.includes('innerHTML') || leftText.includes('outerHTML')) {
        vulnerabilities.push({
          id: `xss-dom-${node.getStart()}`,
          type: SecurityVulnerabilityType.XSS,
          severity: SecuritySeverity.MEDIUM,
          title: 'Potential XSS via DOM Manipulation',
          description: 'Direct assignment to innerHTML/outerHTML may lead to XSS vulnerabilities.',
          location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
          recommendation: 'Use textContent or sanitize HTML content before assignment.',
          cweId: 'CWE-79',
          owaspCategory: 'A03:2021 – Injection',
          confidence: 0.7,
          metadata: {
            assignment: leftText,
            pattern: 'dom_manipulation',
          },
        });
      }
    }

    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();
      
      if (callText === 'eval' || callText.includes('document.write')) {
        vulnerabilities.push({
          id: `xss-eval-${node.getStart()}`,
          type: SecurityVulnerabilityType.XSS,
          severity: SecuritySeverity.HIGH,
          title: 'Dangerous Function Usage',
          description: `Usage of ${callText} can lead to code injection vulnerabilities.`,
          location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
          recommendation: `Avoid using ${callText}. Use safer alternatives.`,
          cweId: 'CWE-79',
          owaspCategory: 'A03:2021 – Injection',
          confidence: 0.9,
          metadata: {
            function: callText,
            pattern: 'dangerous_function',
          },
        });
      }
    }

    return vulnerabilities;
  }

  private detectCommandInjectionTypeScript(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();
      
      if (callText.includes('exec') || callText.includes('spawn') || callText.includes('system')) {
        vulnerabilities.push({
          id: `cmd-injection-${node.getStart()}`,
          type: SecurityVulnerabilityType.COMMAND_INJECTION,
          severity: SecuritySeverity.HIGH,
          title: 'Potential Command Injection',
          description: 'Execution of system commands with user input may lead to command injection.',
          location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
          recommendation: 'Validate and sanitize all user input before executing system commands.',
          cweId: 'CWE-78',
          owaspCategory: 'A03:2021 – Injection',
          confidence: 0.8,
          metadata: {
            function: callText,
            pattern: 'system_command',
          },
        });
      }
    }

    return vulnerabilities;
  }

  private detectHardcodedSecretsTypeScript(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    if (ts.isStringLiteral(node) || ts.isTemplateExpression(node)) {
      const text = node.getText();
      
      for (const pattern of this.secretPatterns) {
        const matches = text.match(pattern);
        if (matches) {
          vulnerabilities.push({
            id: `hardcoded-secret-${node.getStart()}`,
            type: SecurityVulnerabilityType.HARDCODED_SECRETS,
            severity: SecuritySeverity.HIGH,
            title: 'Hardcoded Secret Detected',
            description: 'Hardcoded secrets in source code pose security risks.',
            location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
            recommendation: 'Use environment variables or secure secret management systems.',
            cweId: 'CWE-798',
            owaspCategory: 'A07:2021 – Identification and Authentication Failures',
            confidence: 0.9,
            metadata: {
              secretType: this.identifySecretType(text),
              pattern: pattern.source,
            },
          });
        }
      }
    }

    return vulnerabilities;
  }

  private detectInsecureCryptoTypeScript(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();
      
      if (callText.includes('md5') || callText.includes('sha1')) {
        vulnerabilities.push({
          id: `weak-crypto-${node.getStart()}`,
          type: SecurityVulnerabilityType.INSECURE_CRYPTO,
          severity: SecuritySeverity.MEDIUM,
          title: 'Weak Cryptographic Algorithm',
          description: 'Usage of weak cryptographic algorithms (MD5, SHA1) is not recommended.',
          location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
          recommendation: 'Use stronger cryptographic algorithms like SHA-256 or SHA-3.',
          cweId: 'CWE-327',
          owaspCategory: 'A02:2021 – Cryptographic Failures',
          confidence: 0.9,
          metadata: {
            algorithm: callText,
            pattern: 'weak_crypto',
          },
        });
      }

      if (callText.includes('Math.random')) {
        vulnerabilities.push({
          id: `insecure-random-${node.getStart()}`,
          type: SecurityVulnerabilityType.INSECURE_RANDOM,
          severity: SecuritySeverity.LOW,
          title: 'Insecure Random Number Generation',
          description: 'Math.random() is not cryptographically secure.',
          location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
          recommendation: 'Use crypto.randomBytes() or crypto.getRandomValues() for security-sensitive operations.',
          cweId: 'CWE-338',
          owaspCategory: 'A02:2021 – Cryptographic Failures',
          confidence: 0.8,
          metadata: {
            function: 'Math.random',
            pattern: 'insecure_random',
          },
        });
      }
    }

    return vulnerabilities;
  }

  private detectUnsafeEvalTypeScript(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText();
      
      if (this.dangerousFunctions.includes(callText)) {
        vulnerabilities.push({
          id: `unsafe-eval-${node.getStart()}`,
          type: SecurityVulnerabilityType.UNSAFE_EVAL,
          severity: SecuritySeverity.HIGH,
          title: 'Unsafe Code Execution',
          description: `Usage of ${callText} allows arbitrary code execution.`,
          location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
          recommendation: `Avoid using ${callText}. Use safer alternatives for dynamic code execution.`,
          cweId: 'CWE-95',
          owaspCategory: 'A03:2021 – Injection',
          confidence: 0.9,
          metadata: {
            function: callText,
            pattern: 'code_injection',
          },
        });
      }
    }

    return vulnerabilities;
  }

  private detectPrototypePollutionTypeScript(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    if (ts.isElementAccessExpression(node)) {
      const text = node.getText();
      
      if (text.includes('__proto__') || text.includes('constructor') || text.includes('prototype')) {
        vulnerabilities.push({
          id: `prototype-pollution-${node.getStart()}`,
          type: SecurityVulnerabilityType.PROTOTYPE_POLLUTION,
          severity: SecuritySeverity.MEDIUM,
          title: 'Potential Prototype Pollution',
          description: 'Access to prototype properties may lead to prototype pollution vulnerabilities.',
          location: this.getSourceLocationTypeScript(node, sourceFile, filePath),
          recommendation: 'Validate object keys and avoid direct prototype manipulation.',
          cweId: 'CWE-1321',
          owaspCategory: 'A08:2021 – Software and Data Integrity Failures',
          confidence: 0.6,
          metadata: {
            access: text,
            pattern: 'prototype_access',
          },
        });
      }
    }

    return vulnerabilities;
  }

  // JavaScript-specific detection methods
  private detectDangerousFunctionCalls(node: t.CallExpression, filePath: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    if (t.isIdentifier(node.callee)) {
      const functionName = node.callee.name;
      
      if (this.dangerousFunctions.includes(functionName)) {
        vulnerabilities.push({
          id: `dangerous-func-${node.start || 0}`,
          type: SecurityVulnerabilityType.UNSAFE_EVAL,
          severity: SecuritySeverity.HIGH,
          title: 'Dangerous Function Usage',
          description: `Usage of ${functionName} can lead to code injection vulnerabilities.`,
          location: this.getSourceLocationJavaScript(node, filePath),
          recommendation: `Avoid using ${functionName}. Use safer alternatives.`,
          cweId: 'CWE-95',
          owaspCategory: 'A03:2021 – Injection',
          confidence: 0.9,
          metadata: {
            function: functionName,
            pattern: 'dangerous_function',
          },
        });
      }
    }

    return vulnerabilities;
  }

  private detectSqlInjectionJavaScript(node: t.CallExpression, filePath: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check arguments for SQL injection patterns
    for (const arg of node.arguments) {
      if (t.isStringLiteral(arg) || t.isTemplateLiteral(arg)) {
        const argText = t.isStringLiteral(arg) ? arg.value : arg.quasis.map(q => q.value.raw).join('${...}');
        
        if (this.containsSqlKeywords(argText) && (argText.includes('${') || argText.includes('+'))) {
          vulnerabilities.push({
            id: `sql-injection-js-${node.start || 0}`,
            type: SecurityVulnerabilityType.SQL_INJECTION,
            severity: SecuritySeverity.HIGH,
            title: 'SQL Injection Vulnerability',
            description: 'SQL query uses dynamic content which may lead to SQL injection.',
            location: this.getSourceLocationJavaScript(node, filePath),
            recommendation: 'Use parameterized queries or prepared statements.',
            cweId: 'CWE-89',
            owaspCategory: 'A03:2021 – Injection',
            confidence: 0.8,
            metadata: {
              queryText: argText.substring(0, 200),
              pattern: 'dynamic_sql',
            },
          });
        }
      }
    }

    return vulnerabilities;
  }

  private detectCommandInjectionJavaScript(node: t.CallExpression, filePath: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    if (t.isMemberExpression(node.callee)) {
      const memberText = this.getMemberExpressionText(node.callee);
      
      if (memberText.includes('exec') || memberText.includes('spawn')) {
        vulnerabilities.push({
          id: `cmd-injection-js-${node.start || 0}`,
          type: SecurityVulnerabilityType.COMMAND_INJECTION,
          severity: SecuritySeverity.HIGH,
          title: 'Command Injection Risk',
          description: 'System command execution may be vulnerable to command injection.',
          location: this.getSourceLocationJavaScript(node, filePath),
          recommendation: 'Validate and sanitize all input before executing system commands.',
          cweId: 'CWE-78',
          owaspCategory: 'A03:2021 – Injection',
          confidence: 0.8,
          metadata: {
            function: memberText,
            pattern: 'system_command',
          },
        });
      }
    }

    return vulnerabilities;
  }

  private detectXssJavaScript(node: t.AssignmentExpression, filePath: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    if (t.isMemberExpression(node.left)) {
      const memberText = this.getMemberExpressionText(node.left);
      
      if (memberText.includes('innerHTML') || memberText.includes('outerHTML')) {
        vulnerabilities.push({
          id: `xss-js-${node.start || 0}`,
          type: SecurityVulnerabilityType.XSS,
          severity: SecuritySeverity.MEDIUM,
          title: 'XSS via DOM Manipulation',
          description: 'Direct assignment to innerHTML/outerHTML may lead to XSS.',
          location: this.getSourceLocationJavaScript(node, filePath),
          recommendation: 'Use textContent or sanitize HTML content.',
          cweId: 'CWE-79',
          owaspCategory: 'A03:2021 – Injection',
          confidence: 0.7,
          metadata: {
            assignment: memberText,
            pattern: 'dom_manipulation',
          },
        });
      }
    }

    return vulnerabilities;
  }

  private detectHardcodedSecretsJavaScript(node: t.StringLiteral, filePath: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    for (const pattern of this.secretPatterns) {
      if (pattern.test(node.value)) {
        vulnerabilities.push({
          id: `secret-js-${node.start || 0}`,
          type: SecurityVulnerabilityType.HARDCODED_SECRETS,
          severity: SecuritySeverity.HIGH,
          title: 'Hardcoded Secret',
          description: 'Hardcoded secrets detected in source code.',
          location: this.getSourceLocationJavaScript(node, filePath),
          recommendation: 'Use environment variables or secure secret management.',
          cweId: 'CWE-798',
          owaspCategory: 'A07:2021 – Identification and Authentication Failures',
          confidence: 0.9,
          metadata: {
            secretType: this.identifySecretType(node.value),
            pattern: pattern.source,
          },
        });
      }
    }

    return vulnerabilities;
  }

  private detectTemplateInjectionJavaScript(node: t.TemplateLiteral, filePath: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    const templateText = node.quasis.map(q => q.value.raw).join('${...}');
    
    if (this.containsSqlKeywords(templateText) || templateText.includes('eval') || templateText.includes('exec')) {
      vulnerabilities.push({
        id: `template-injection-${node.start || 0}`,
        type: SecurityVulnerabilityType.SQL_INJECTION,
        severity: SecuritySeverity.HIGH,
        title: 'Template Injection Risk',
        description: 'Template literal contains potentially dangerous content.',
        location: this.getSourceLocationJavaScript(node, filePath),
        recommendation: 'Validate and sanitize all template literal content.',
        cweId: 'CWE-94',
        owaspCategory: 'A03:2021 – Injection',
        confidence: 0.7,
        metadata: {
          template: templateText.substring(0, 200),
          pattern: 'template_injection',
        },
      });
    }

    return vulnerabilities;
  }

  private detectPrototypePollutionJavaScript(node: t.MemberExpression, filePath: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    const memberText = this.getMemberExpressionText(node);
    
    if (memberText.includes('__proto__') || memberText.includes('constructor.prototype')) {
      vulnerabilities.push({
        id: `prototype-js-${node.start || 0}`,
        type: SecurityVulnerabilityType.PROTOTYPE_POLLUTION,
        severity: SecuritySeverity.MEDIUM,
        title: 'Prototype Pollution Risk',
        description: 'Access to prototype properties may lead to prototype pollution.',
        location: this.getSourceLocationJavaScript(node, filePath),
        recommendation: 'Validate object keys and avoid prototype manipulation.',
        cweId: 'CWE-1321',
        owaspCategory: 'A08:2021 – Software and Data Integrity Failures',
        confidence: 0.6,
        metadata: {
          access: memberText,
          pattern: 'prototype_access',
        },
      });
    }

    return vulnerabilities;
  }

  // Helper methods
  private containsSqlKeywords(text: string): boolean {
    const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'FROM', 'WHERE'];
    const upperText = text.toUpperCase();
    return sqlKeywords.some(keyword => upperText.includes(keyword));
  }

  private hasStringConcatenation(node: ts.Node): boolean {
    return node.getText().includes('+') || node.getText().includes('concat');
  }

  private hasTemplateLiteral(node: ts.Node): boolean {
    return node.getText().includes('${');
  }

  private identifySecretType(text: string): string {
    if (text.toLowerCase().includes('password')) return 'password';
    if (text.toLowerCase().includes('api') && text.toLowerCase().includes('key')) return 'api_key';
    if (text.toLowerCase().includes('secret')) return 'secret';
    if (text.toLowerCase().includes('token')) return 'token';
    if (text.toLowerCase().includes('private') && text.toLowerCase().includes('key')) return 'private_key';
    return 'unknown';
  }

  private getMemberExpressionText(node: t.MemberExpression): string {
    let text = '';
    
    if (t.isIdentifier(node.object)) {
      text = node.object.name;
    } else if (t.isMemberExpression(node.object)) {
      text = this.getMemberExpressionText(node.object);
    }

    if (t.isIdentifier(node.property)) {
      text += '.' + node.property.name;
    }

    return text;
  }

  private buildSecurityAnalysisResult(vulnerabilities: SecurityVulnerability[]): SecurityAnalysisResult {
    const summary: SecuritySummary = {
      totalVulnerabilities: vulnerabilities.length,
      criticalCount: vulnerabilities.filter(v => v.severity === SecuritySeverity.CRITICAL).length,
      highCount: vulnerabilities.filter(v => v.severity === SecuritySeverity.HIGH).length,
      mediumCount: vulnerabilities.filter(v => v.severity === SecuritySeverity.MEDIUM).length,
      lowCount: vulnerabilities.filter(v => v.severity === SecuritySeverity.LOW).length,
      categories: {},
    };

    // Count by category
    vulnerabilities.forEach(vuln => {
      const category = vuln.type;
      summary.categories[category] = (summary.categories[category] || 0) + 1;
    });

    // Calculate risk score (0-100)
    const riskScore = Math.min(100, 
      summary.criticalCount * 25 + 
      summary.highCount * 15 + 
      summary.mediumCount * 8 + 
      summary.lowCount * 3
    );

    return {
      vulnerabilities,
      summary,
      riskScore,
    };
  }

  private getSourceLocationTypeScript(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): AnalysisSourceLocation {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

    return {
      start: { line: start.line + 1, column: start.character + 1 },
      end: { line: end.line + 1, column: end.character + 1 },
      filePath,
    };
  }

  private getSourceLocationJavaScript(node: t.Node, filePath: string): AnalysisSourceLocation {
    return {
      start: {
        line: node.loc?.start.line || 1,
        column: node.loc?.start.column || 1,
      },
      end: {
        line: node.loc?.end.line || 1,
        column: node.loc?.end.column || 1,
      },
      filePath,
    };
  }
}