import { EventEmitter } from 'eventemitter3';
import {
  IComponent,
  ComponentMetadata,
  RenderContext,
  RenderResult,
  ValidationResult,
  CMSEvent
} from '../interfaces';

export abstract class BaseComponent extends EventEmitter implements IComponent {
  protected config: Record<string, any> = {};
  protected _metadata: ComponentMetadata;

  constructor(metadata: ComponentMetadata) {
    super();
    this._metadata = { ...metadata };
    this.initializeDefaultConfig();
  }

  /**
   * Get component metadata
   */
  get metadata(): ComponentMetadata {
    return { ...this._metadata };
  }

  /**
   * Validate component configuration and state
   */
  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required metadata
    if (!this._metadata.name || this._metadata.name.trim() === '') {
      errors.push('Component name is required');
    }

    if (!this._metadata.category || this._metadata.category.trim() === '') {
      errors.push('Component category is required');
    }

    // Validate configuration
    const configValidation = this.validateConfig();
    errors.push(...configValidation.errors);
    warnings.push(...configValidation.warnings);

    // Custom validation
    const customValidation = this.validateCustom();
    errors.push(...customValidation.errors);
    warnings.push(...customValidation.warnings);

    const isValid = errors.length === 0;

    this.emit('component.validated', {
      type: 'component.validated',
      data: { isValid, errors, warnings },
      timestamp: new Date()
    } as CMSEvent);

    return {
      isValid,
      errors,
      warnings
    };
  }

  /**
   * Get a configuration value
   */
  getConfig<T>(key: string, defaultValue?: T): T {
    const keys = key.split('.');
    let value = this.config;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue as T;
      }
    }

    return value as T;
  }

  /**
   * Set a configuration value
   */
  setConfig(key: string, value: any): void {
    const keys = key.split('.');
    let current = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object' || current[k] === null) {
        current[k] = {};
      }
      current = current[k];
    }

    const lastKey = keys[keys.length - 1];
    const oldValue = current[lastKey];
    current[lastKey] = value;

    this.emit('config.changed', {
      type: 'config.changed',
      data: { key, oldValue, newValue: value },
      timestamp: new Date()
    } as CMSEvent);
  }

  /**
   * Get all configuration
   */
  getAllConfig(): Record<string, any> {
    return { ...this.config };
  }

  /**
   * Set multiple configuration values
   */
  setMultipleConfig(config: Record<string, any>): void {
    for (const [key, value] of Object.entries(config)) {
      this.setConfig(key, value);
    }
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig(): void {
    this.config = {};
    this.initializeDefaultConfig();
    this.emit('config.reset', {
      type: 'config.reset',
      data: {},
      timestamp: new Date()
    } as CMSEvent);
  }

  /**
   * Render the component - must be implemented by subclasses
   */
  abstract render(context: RenderContext): Promise<RenderResult>;

  /**
   * Initialize default configuration
   */
  protected initializeDefaultConfig(): void {
    // Set default configuration from metadata
    if (this._metadata.configuration) {
      this.config = { ...this._metadata.configuration };
    }
  }

  /**
   * Validate component configuration - can be overridden
   */
  public validateConfig(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required configuration keys
    const requiredKeys = this.getRequiredConfigKeys();
    for (const key of requiredKeys) {
      if (this.getConfig(key) === undefined) {
        errors.push(`Required configuration key '${key}' is missing`);
      }
    }

    // Check configuration types
    const typeValidation = this.validateConfigTypes();
    errors.push(...typeValidation.errors);
    warnings.push(...typeValidation.warnings);

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Custom validation - can be overridden by subclasses
   */
  public validateCustom(): ValidationResult {
    return { isValid: true, errors: [], warnings: [] };
  }

  /**
   * Get required configuration keys - can be overridden
   */
  public getRequiredConfigKeys(): string[] {
    return [];
  }

  /**
   * Validate configuration types - can be overridden
   */
  public validateConfigTypes(): ValidationResult {
    return { isValid: true, errors: [], warnings: [] };
  }

  /**
   * Generate unique CSS class names
   */
  public generateClassName(suffix?: string): string {
    const base = this._metadata.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const id = Math.random().toString(36).substr(2, 9);
    return suffix ? `${base}-${suffix}-${id}` : `${base}-${id}`;
  }

  /**
   * Extract CSS from render result
   */
  public extractCSS(html: string): string {
    // Extract style tags from HTML
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    const styles: string[] = [];
    let match;

    while ((match = styleRegex.exec(html)) !== null) {
      styles.push(match[1]);
    }

    return styles.join('\n');
  }

  /**
   * Extract JavaScript from render result
   */
  public extractJS(html: string): string {
    // Extract script tags from HTML
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    const scripts: string[] = [];
    let match;

    while ((match = scriptRegex.exec(html)) !== null) {
      scripts.push(match[1]);
    }

    return scripts.join('\n');
  }

  /**
   * Clean up component resources
   */
  dispose(): void {
    this.removeAllListeners();
    this.config = {};
  }

  /**
   * Get component information
   */
  getInfo(): Record<string, any> {
    return {
      name: this._metadata.name,
      category: this._metadata.category,
      tags: this._metadata.tags,
      dependencies: this._metadata.dependencies,
      config: this.getAllConfig()
    };
  }
}