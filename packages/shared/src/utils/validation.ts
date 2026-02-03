import { PATTERNS, SUPPORTED_EXTENSIONS, MAX_FILE_SIZE } from './constants';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  
  if (!email) {
    errors.push('Email is required');
  } else if (!PATTERNS.EMAIL.test(email)) {
    errors.push('Invalid email format');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateProjectName(name: string): ValidationResult {
  const errors: string[] = [];
  
  if (!name) {
    errors.push('Project name is required');
  } else if (name.length < 1 || name.length > 100) {
    errors.push('Project name must be between 1 and 100 characters');
  } else if (!PATTERNS.PROJECT_NAME.test(name)) {
    errors.push('Project name contains invalid characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateFilePath(filePath: string): ValidationResult {
  const errors: string[] = [];
  
  if (!filePath) {
    errors.push('File path is required');
  } else if (!PATTERNS.FILE_PATH.test(filePath)) {
    errors.push('Invalid file path format');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateFileExtension(fileName: string): ValidationResult {
  const errors: string[] = [];
  
  if (!fileName) {
    errors.push('File name is required');
  } else {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (!SUPPORTED_EXTENSIONS.includes(extension as any)) {
      errors.push(`Unsupported file extension: ${extension}. Supported extensions: ${SUPPORTED_EXTENSIONS.join(', ')}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateFileSize(size: number): ValidationResult {
  const errors: string[] = [];
  
  if (size > MAX_FILE_SIZE) {
    errors.push(`File size (${formatBytes(size)}) exceeds maximum allowed size (${formatBytes(MAX_FILE_SIZE)})`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateCodeContent(content: string): ValidationResult {
  const errors: string[] = [];
  
  if (!content || content.trim().length === 0) {
    errors.push('Code content cannot be empty');
  } else if (content.length > 1000000) { // 1MB text limit
    errors.push('Code content is too large (max 1MB)');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateAnnotationContent(content: string): ValidationResult {
  const errors: string[] = [];
  
  if (!content || content.trim().length === 0) {
    errors.push('Annotation content cannot be empty');
  } else if (content.length > 10000) { // 10KB limit for annotations
    errors.push('Annotation content is too long (max 10,000 characters)');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateCoordinates(x: number, y: number): ValidationResult {
  const errors: string[] = [];
  
  if (typeof x !== 'number' || typeof y !== 'number') {
    errors.push('Coordinates must be numbers');
  } else if (!isFinite(x) || !isFinite(y)) {
    errors.push('Coordinates must be finite numbers');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateComplexityScore(score: number): ValidationResult {
  const errors: string[] = [];
  
  if (typeof score !== 'number') {
    errors.push('Complexity score must be a number');
  } else if (score < 0) {
    errors.push('Complexity score cannot be negative');
  } else if (score > 100) {
    errors.push('Complexity score cannot exceed 100');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateUrl(url: string): ValidationResult {
  const errors: string[] = [];
  
  if (!url) {
    errors.push('URL is required');
  } else {
    try {
      new URL(url);
    } catch {
      errors.push('Invalid URL format');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateId(id: string): ValidationResult {
  const errors: string[] = [];
  
  if (!id) {
    errors.push('ID is required');
  } else if (typeof id !== 'string') {
    errors.push('ID must be a string');
  } else if (id.length < 1 || id.length > 100) {
    errors.push('ID must be between 1 and 100 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Utility functions
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[^\w\s\-_.@]/g, ''); // Keep only alphanumeric, spaces, and common symbols
}

export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

export function validateMultiple(validations: ValidationResult[]): ValidationResult {
  const allErrors = validations.flatMap(v => v.errors);
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}