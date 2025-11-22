/**
 * Jest Test Setup
 * Global configuration and utilities for testing
 */

// Set global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Global test utilities
(global as any).testUtils = {
  /**
   * Wait for specified milliseconds
   */
  wait: (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Create a mock service factory
   */
  createMockFactory: (instance: any) => ({
    create: jest.fn().mockResolvedValue(instance),
    dispose: jest.fn().mockResolvedValue(undefined)
  }),

  /**
   * Generate random test data
   */
  randomString: (length = 10): string => Math.random().toString(36).substring(2, 2 + length),

  /**
   * Create mock component metadata
   */
  createMockMetadata: (overrides = {}) => ({
    name: 'TestComponent',
    category: 'test',
    tags: ['test', 'mock'],
    configuration: {},
    dependencies: [],
    ...overrides
  })
};

// Global test cleanup
afterEach(() => {
  jest.clearAllMocks();
});