import { Injectable, Logger } from '@nestjs/common';
import {
  FileAnalysis,
  DependencyGraph,
  DependencyNode,
  DependencyEdge,
} from '@codemapr/shared';

@Injectable()
export class DependencyTracer {
  private readonly logger = new Logger(DependencyTracer.name);

  async buildDependencyGraph(fileAnalyses: FileAnalysis[]): Promise<DependencyGraph> {
    this.logger.debug(`Building dependency graph for ${fileAnalyses.length} files`);

    const nodes: DependencyNode[] = [];
    const edges: DependencyEdge[] = [];
    const cycles: string[][] = [];

    // Create nodes for files and their symbols
    fileAnalyses.forEach((file) => {
      // Add file node
      nodes.push({
        id: file.filePath,
        filePath: file.filePath,
        type: 'file',
        name: this.getFileName(file.filePath),
      });

      // Add function nodes
      file.functions.forEach((func) => {
        nodes.push({
          id: `${file.filePath}:${func.name}`,
          filePath: file.filePath,
          type: 'function',
          name: func.name,
        });
      });

      // Add class nodes
      file.classes.forEach((cls) => {
        nodes.push({
          id: `${file.filePath}:${cls.name}`,
          filePath: file.filePath,
          type: 'class',
          name: cls.name,
        });
      });

      // Add variable nodes
      file.symbols.forEach((symbol) => {
        nodes.push({
          id: symbol.id,
          filePath: file.filePath,
          type: 'variable',
          name: symbol.name,
        });
      });
    });

    // Create edges for imports and dependencies
    fileAnalyses.forEach((file) => {
      file.imports.forEach((importDecl) => {
        const targetFile = this.resolveImportPath(importDecl.source, file.filePath, fileAnalyses);
        
        if (targetFile) {
          // Create edge from current file to imported file
          edges.push({
            from: file.filePath,
            to: targetFile.filePath,
            type: 'import',
            dynamic: importDecl.isDynamic,
          });

          // Create edges for specific imports
          importDecl.specifiers.forEach((spec) => {
            const targetSymbol = this.findSymbolInFile(spec.imported, targetFile);
            if (targetSymbol) {
              edges.push({
                from: `${file.filePath}:${spec.local}`,
                to: targetSymbol.id,
                type: 'import',
                dynamic: importDecl.isDynamic,
              });
            }
          });
        }
      });

      // Create edges for class inheritance
      file.classes.forEach((cls) => {
        if (cls.extends) {
          const parentClass = this.findClassInFiles(cls.extends, fileAnalyses);
          if (parentClass) {
            edges.push({
              from: `${file.filePath}:${cls.name}`,
              to: parentClass.id,
              type: 'extends',
              dynamic: false,
            });
          }
        }

        if (cls.implements) {
          cls.implements.forEach((interfaceName) => {
            const interfaceSymbol = this.findInterfaceInFiles(interfaceName, fileAnalyses);
            if (interfaceSymbol) {
              edges.push({
                from: `${file.filePath}:${cls.name}`,
                to: interfaceSymbol.id,
                type: 'implements',
                dynamic: false,
              });
            }
          });
        }
      });
    });

    // Detect circular dependencies
    const detectedCycles = this.detectCircularDependencies(nodes, edges);
    cycles.push(...detectedCycles);

    this.logger.debug(`Built dependency graph with ${nodes.length} nodes, ${edges.length} edges, and ${cycles.length} cycles`);

    return {
      nodes,
      edges,
      cycles,
    };
  }

  private resolveImportPath(importPath: string, currentFile: string, fileAnalyses: FileAnalysis[]): FileAnalysis | null {
    // Handle relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const resolvedPath = this.resolveRelativePath(importPath, currentFile);
      return fileAnalyses.find((file) => 
        file.filePath === resolvedPath ||
        file.filePath === `${resolvedPath}.js` ||
        file.filePath === `${resolvedPath}.ts` ||
        file.filePath === `${resolvedPath}.jsx` ||
        file.filePath === `${resolvedPath}.tsx` ||
        file.filePath === `${resolvedPath}/index.js` ||
        file.filePath === `${resolvedPath}/index.ts` ||
        file.filePath === `${resolvedPath}/index.jsx` ||
        file.filePath === `${resolvedPath}/index.tsx`
      ) || null;
    }

    // Handle absolute imports (would need more sophisticated resolution in real implementation)
    return fileAnalyses.find((file) => file.filePath.includes(importPath)) || null;
  }

  private resolveRelativePath(importPath: string, currentFile: string): string {
    const currentDir = currentFile.substring(0, currentFile.lastIndexOf('/'));
    const parts = currentDir.split('/');
    const importParts = importPath.split('/');

    for (const part of importParts) {
      if (part === '..') {
        parts.pop();
      } else if (part !== '.') {
        parts.push(part);
      }
    }

    return parts.join('/');
  }

  private findSymbolInFile(symbolName: string, file: FileAnalysis): { id: string } | null {
    // Check functions
    const func = file.functions.find((f) => f.name === symbolName);
    if (func) {
      return { id: `${file.filePath}:${func.name}` };
    }

    // Check classes
    const cls = file.classes.find((c) => c.name === symbolName);
    if (cls) {
      return { id: `${file.filePath}:${cls.name}` };
    }

    // Check variables/symbols
    const symbol = file.symbols.find((s) => s.name === symbolName);
    if (symbol) {
      return { id: symbol.id };
    }

    // Check exports
    const exportDecl = file.exports.find((e) => e.name === symbolName || e.name === 'default');
    if (exportDecl) {
      return { id: `${file.filePath}:${exportDecl.name}` };
    }

    return null;
  }

  private findClassInFiles(className: string, fileAnalyses: FileAnalysis[]): { id: string } | null {
    for (const file of fileAnalyses) {
      const cls = file.classes.find((c) => c.name === className);
      if (cls) {
        return { id: `${file.filePath}:${cls.name}` };
      }
    }
    return null;
  }

  private findInterfaceInFiles(interfaceName: string, fileAnalyses: FileAnalysis[]): { id: string } | null {
    for (const file of fileAnalyses) {
      const symbol = file.symbols.find((s) => s.name === interfaceName && s.type === 'interface');
      if (symbol) {
        return { id: symbol.id };
      }
    }
    return null;
  }

  private detectCircularDependencies(nodes: DependencyNode[], edges: DependencyEdge[]): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    // Build adjacency list
    const adjacencyList = new Map<string, string[]>();
    nodes.forEach((node) => {
      adjacencyList.set(node.id, []);
    });

    edges.forEach((edge) => {
      const neighbors = adjacencyList.get(edge.from) || [];
      neighbors.push(edge.to);
      adjacencyList.set(edge.from, neighbors);
    });

    // DFS to detect cycles
    const dfs = (nodeId: string, path: string[]): void => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const neighbors = adjacencyList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recursionStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            const cycle = path.slice(cycleStart);
            cycle.push(neighbor); // Complete the cycle
            cycles.push(cycle);
          }
        }
      }

      recursionStack.delete(nodeId);
    };

    // Check all nodes for cycles
    nodes.forEach((node) => {
      if (!visited.has(node.id)) {
        dfs(node.id, []);
      }
    });

    return cycles;
  }

  private getFileName(filePath: string): string {
    return filePath.split('/').pop() || filePath;
  }
}