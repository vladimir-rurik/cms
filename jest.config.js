/**
 * Jest Configuration for Universal CMS Core
 */

module.exports = {
  // Test Environment
  testEnvironment: 'jsdom',

  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/src/**/*.spec.ts'
  ],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'clover'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    },
    './src/container/': {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  },

  // Module handling
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },

  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],

  // Test configuration
  maxWorkers: 4,
  verbose: false,
  bail: false,
  forceExit: true,
  detectOpenHandles: true,

  // Mock configuration
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!(.*\\.mjs$))'
  ],

  // Global variables
  globals: {
    'ts-jest': {
      tsconfig: {
        target: 'es6',
        module: 'commonjs',
        lib: ['es6', 'dom'],
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: false,
        noEmit: true
      }
    }
  }
};