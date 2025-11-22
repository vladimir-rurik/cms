/**
 * Universal CMS Core Framework
 * Main entry point for the Universal Content Management System
 */

// Version information
export const CMS_VERSION = '1.0.0';

// Core classes and interfaces
export * from './interfaces';
export * from './container/IoCContainer';
export * from './components/BaseComponent';
export * from './components/CompositeComponent';
export * from './builder/PageBuilder';
export * from './plugins/ComponentRegistry';
export * from './pipeline/Pipeline';

/**
 * Basic CMS information for the standalone package
 */
export interface CMSInfo {
  version: string;
  name: string;
  description: string;
  author: string;
}

/**
 * Creates a basic CMS info object
 */
export function createCMSInfo(): CMSInfo {
  return {
    version: CMS_VERSION,
    name: '@universal-cms/core',
    description: 'Universal Content Management System Core Framework',
    author: 'Universal CMS Team'
  };
}

/**
 * Default CMS factory
 */
export const CMS = {
  version: CMS_VERSION,
  create: createCMSInfo,
  info: 'Universal CMS Core Framework - A modular, extensible Content Management System built with TypeScript'
};

// Default export
export default CMS;