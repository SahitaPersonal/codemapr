// Jest setup file for NestJS testing
import fc from 'fast-check';

// Configure fast-check for property-based testing
fc.configureGlobal({
  numRuns: 100,
  seed: 42,
  verbose: true,
});

// Global test timeout
jest.setTimeout(30000);