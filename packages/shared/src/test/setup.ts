// Jest setup file for property-based testing
import fc from 'fast-check';

// Configure fast-check for consistent property-based testing
fc.configureGlobal({
  numRuns: 100, // Minimum 100 iterations per property test
  seed: 42, // Fixed seed for reproducible tests
  verbose: true,
});

// Global test timeout for property-based tests
jest.setTimeout(30000);