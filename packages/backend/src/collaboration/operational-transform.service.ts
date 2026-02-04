import { Injectable, Logger } from '@nestjs/common';

export interface Operation {
  id: string;
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
  userId: string;
  timestamp: Date;
  sessionId: string;
}

export interface DocumentState {
  content: string;
  version: number;
  operations: Operation[];
}

export interface TransformResult {
  transformedOp: Operation;
  priority: 'local' | 'remote';
}

@Injectable()
export class OperationalTransformService {
  private readonly logger = new Logger(OperationalTransformService.name);
  private readonly documentStates = new Map<string, DocumentState>();

  /**
   * Transform two concurrent operations against each other
   * Based on the operational transformation algorithm
   */
  transform(op1: Operation, op2: Operation): TransformResult {
    // If operations are from the same user, no transformation needed
    if (op1.userId === op2.userId) {
      return { transformedOp: op1, priority: 'local' };
    }

    // Determine priority based on timestamp and user ID (for deterministic ordering)
    const priority = this.determinePriority(op1, op2);
    
    let transformedOp: Operation;

    if (priority === 'local') {
      transformedOp = this.transformOperation(op1, op2);
    } else {
      transformedOp = this.transformOperation(op2, op1);
    }

    return { transformedOp, priority };
  }

  /**
   * Transform operation op1 against operation op2
   */
  private transformOperation(op1: Operation, op2: Operation): Operation {
    const transformed = { ...op1 };

    // Transform based on operation types
    if (op1.type === 'insert' && op2.type === 'insert') {
      // Both insertions
      if (op2.position <= op1.position) {
        transformed.position += op2.content?.length || 0;
      }
    } else if (op1.type === 'insert' && op2.type === 'delete') {
      // Insert vs Delete
      if (op2.position < op1.position) {
        transformed.position -= Math.min(op2.length || 0, op1.position - op2.position);
      }
    } else if (op1.type === 'delete' && op2.type === 'insert') {
      // Delete vs Insert
      if (op2.position <= op1.position) {
        transformed.position += op2.content?.length || 0;
      }
    } else if (op1.type === 'delete' && op2.type === 'delete') {
      // Both deletions
      if (op2.position < op1.position) {
        const overlap = Math.min(op2.length || 0, op1.position - op2.position);
        transformed.position -= overlap;
        if (op2.position + (op2.length || 0) > op1.position) {
          // Overlapping deletes - adjust length
          const overlapEnd = Math.min(
            op1.position + (op1.length || 0),
            op2.position + (op2.length || 0)
          );
          const overlapStart = Math.max(op1.position, op2.position);
          transformed.length = (transformed.length || 0) - Math.max(0, overlapEnd - overlapStart);
        }
      } else if (op2.position < op1.position + (op1.length || 0)) {
        // Overlapping deletes
        const overlapEnd = Math.min(
          op1.position + (op1.length || 0),
          op2.position + (op2.length || 0)
        );
        const overlapStart = Math.max(op1.position, op2.position);
        transformed.length = (transformed.length || 0) - Math.max(0, overlapEnd - overlapStart);
      }
    }

    // Ensure position is never negative
    transformed.position = Math.max(0, transformed.position);
    
    // Ensure length is never negative
    if (transformed.length !== undefined) {
      transformed.length = Math.max(0, transformed.length);
    }

    return transformed;
  }

  /**
   * Determine which operation has priority for deterministic ordering
   */
  private determinePriority(op1: Operation, op2: Operation): 'local' | 'remote' {
    // First, compare timestamps
    const timeDiff = op1.timestamp.getTime() - op2.timestamp.getTime();
    
    if (timeDiff < 0) {
      return 'local'; // op1 is earlier
    } else if (timeDiff > 0) {
      return 'remote'; // op2 is earlier
    }
    
    // If timestamps are equal, use user ID for deterministic ordering
    return op1.userId < op2.userId ? 'local' : 'remote';
  }

  /**
   * Apply an operation to a document state
   */
  applyOperation(sessionId: string, operation: Operation): DocumentState {
    let docState = this.documentStates.get(sessionId);
    
    if (!docState) {
      docState = {
        content: '',
        version: 0,
        operations: [],
      };
    }

    // Apply the operation to the content
    let newContent = docState.content;
    
    switch (operation.type) {
      case 'insert':
        newContent = 
          newContent.slice(0, operation.position) +
          (operation.content || '') +
          newContent.slice(operation.position);
        break;
        
      case 'delete':
        const deleteEnd = operation.position + (operation.length || 0);
        newContent = 
          newContent.slice(0, operation.position) +
          newContent.slice(deleteEnd);
        break;
        
      case 'retain':
        // Retain operations don't change content, just move cursor
        break;
    }

    // Update document state
    const newDocState: DocumentState = {
      content: newContent,
      version: docState.version + 1,
      operations: [...docState.operations, operation],
    };

    // Keep only last 100 operations for memory management
    if (newDocState.operations.length > 100) {
      newDocState.operations = newDocState.operations.slice(-100);
    }

    this.documentStates.set(sessionId, newDocState);
    
    this.logger.debug(`Applied operation ${operation.type} to session ${sessionId}, new version: ${newDocState.version}`);
    
    return newDocState;
  }

  /**
   * Get current document state for a session
   */
  getDocumentState(sessionId: string): DocumentState | null {
    return this.documentStates.get(sessionId) || null;
  }

  /**
   * Initialize or reset document state for a session
   */
  initializeDocument(sessionId: string, initialContent = ''): DocumentState {
    const docState: DocumentState = {
      content: initialContent,
      version: 0,
      operations: [],
    };

    this.documentStates.set(sessionId, docState);
    return docState;
  }

  /**
   * Transform a batch of operations against each other
   */
  transformBatch(operations: Operation[]): Operation[] {
    if (operations.length <= 1) {
      return operations;
    }

    // Sort operations by timestamp for consistent ordering
    const sortedOps = [...operations].sort((a, b) => {
      const timeDiff = a.timestamp.getTime() - b.timestamp.getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.userId.localeCompare(b.userId);
    });

    const transformedOps: Operation[] = [];
    
    for (let i = 0; i < sortedOps.length; i++) {
      let currentOp = sortedOps[i];
      
      // Transform against all previous operations
      for (let j = 0; j < i; j++) {
        const result = this.transform(currentOp, transformedOps[j]);
        currentOp = result.transformedOp;
      }
      
      transformedOps.push(currentOp);
    }

    return transformedOps;
  }

  /**
   * Cleanup old document states
   */
  cleanup(): void {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [sessionId, docState] of this.documentStates.entries()) {
      const lastOpTime = docState.operations.length > 0 
        ? docState.operations[docState.operations.length - 1].timestamp
        : new Date(0);
        
      if (now.getTime() - lastOpTime.getTime() > maxAge) {
        this.documentStates.delete(sessionId);
        this.logger.debug(`Cleaned up document state for session ${sessionId}`);
      }
    }
  }

  /**
   * Get statistics about document states
   */
  getStats(): {
    totalSessions: number;
    totalOperations: number;
    averageOperationsPerSession: number;
  } {
    const sessions = Array.from(this.documentStates.values());
    const totalOperations = sessions.reduce((sum, doc) => sum + doc.operations.length, 0);
    
    return {
      totalSessions: sessions.length,
      totalOperations,
      averageOperationsPerSession: sessions.length > 0 ? totalOperations / sessions.length : 0,
    };
  }
}