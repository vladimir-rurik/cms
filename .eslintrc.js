module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
    browser: true,
    es2020: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/**/*', 'coverage/**/*', 'node_modules/**/*', '**/*.test.ts', '**/*.spec.ts'],
  rules: {
    'no-unused-vars': 'off',
    'prefer-const': 'error',
    'no-console': 'off', // Allow console statements for error logging
    'no-debugger': 'error',
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    '@typescript-eslint/no-unused-vars': ['warn', {
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_',
      'args': 'none'
    }],
    '@typescript-eslint/explicit-any': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-require-imports': 'off',
  },
};