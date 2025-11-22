import { EventEmitter } from 'eventemitter3';
import {
  IComponentRegistry,
  IComponent,
  ICMSPlugin,
  ComponentMetadata,
  PluginContext
} from '../interfaces';

export class ComponentRegistry extends EventEmitter implements IComponentRegistry {
  private components = new Map<string, new (metadata: ComponentMetadata) => IComponent>();
  private componentMetadata = new Map<string, ComponentMetadata>();
  private plugins = new Map<string, ICMSPlugin>();
  private initializedPlugins = new Set<string>();

  /**
   * Register a component class
   */
  registerComponent(
    name: string,
    componentClass: new (metadata: ComponentMetadata) => IComponent,
    metadata?: ComponentMetadata
  ): void {
    if (this.components.has(name)) {
      throw new Error(`Component '${name}' is already registered`);
    }

    this.components.set(name, componentClass);
    if (metadata) {
      this.componentMetadata.set(name, metadata);
    }

    this.emit('component.registered', { name, componentClass, metadata });
  }

  /**
   * Register a plugin
   */
  registerPlugin(plugin: ICMSPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already registered`);
    }

    this.plugins.set(plugin.name, plugin);
    this.emit('plugin.registered', { plugin });
  }

  /**
   * Get a component class by name
   */
  getComponent(name: string): (new (metadata: ComponentMetadata) => IComponent) | undefined {
    return this.components.get(name);
  }

  /**
   * Get all registered components
   */
  getComponents(): Map<string, (new (metadata: ComponentMetadata) => IComponent)> {
    return new Map(this.components);
  }

  /**
   * Get component metadata
   */
  getComponentMetadata(name: string): ComponentMetadata | undefined {
    return this.componentMetadata.get(name);
  }

  /**
   * Get all component metadata
   */
  getAllComponentMetadata(): Map<string, ComponentMetadata> {
    return new Map(this.componentMetadata);
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): ICMSPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a plugin by name
   */
  getPlugin(name: string): ICMSPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Initialize all plugins
   */
  async initializePlugins(context: PluginContext): Promise<void> {
    const initPromises: Promise<void>[] = [];

    for (const [name, plugin] of this.plugins) {
      if (!this.initializedPlugins.has(name)) {
        initPromises.push(this.initializePlugin(plugin, context));
      }
    }

    await Promise.all(initPromises);
    this.emit('plugins.initialized', { count: initPromises.length });
  }

  /**
   * Initialize a specific plugin
   */
  async initializePlugin(plugin: ICMSPlugin, context: PluginContext): Promise<void> {
    if (this.initializedPlugins.has(plugin.name)) {
      return;
    }

    try {
      await plugin.initialize(context);
      this.initializedPlugins.add(plugin.name);
      this.emit('plugin.initialized', { plugin });
    } catch (error) {
      this.emit('plugin.error', { plugin, error });
      throw new Error(`Failed to initialize plugin '${plugin.name}': ${error}`);
    }
  }

  /**
   * Dispose all plugins
   */
  async disposePlugins(): Promise<void> {
    const disposePromises: Promise<void>[] = [];

    for (const [name, plugin] of this.plugins) {
      if (this.initializedPlugins.has(name)) {
        disposePromises.push(this.disposePlugin(plugin));
      }
    }

    await Promise.all(disposePromises);
    this.initializedPlugins.clear();
    this.emit('plugins.disposed', { count: disposePromises.length });
  }

  /**
   * Dispose a specific plugin
   */
  async disposePlugin(plugin: ICMSPlugin): Promise<void> {
    if (!this.initializedPlugins.has(plugin.name)) {
      return;
    }

    try {
      await plugin.dispose();
      this.initializedPlugins.delete(plugin.name);
      this.emit('plugin.disposed', { plugin });
    } catch (error) {
      this.emit('plugin.error', { plugin, error });
      console.error(`Failed to dispose plugin '${plugin.name}':`, error);
    }
  }

  /**
   * Create a component instance
   */
  createComponent(name: string, metadata?: Partial<ComponentMetadata>): IComponent | undefined {
    const ComponentClass = this.components.get(name);
    if (!ComponentClass) {
      return undefined;
    }

    const defaultMetadata = this.componentMetadata.get(name);
    const finalMetadata: ComponentMetadata = {
      name,
      category: 'unknown',
      tags: [],
      configuration: {},
      ...defaultMetadata,
      ...metadata
    };

    try {
      return new ComponentClass(finalMetadata);
    } catch (error) {
      this.emit('component.creation.error', { name, metadata: finalMetadata, error });
      throw new Error(`Failed to create component '${name}': ${error}`);
    }
  }

  /**
   * Check if a component is registered
   */
  hasComponent(name: string): boolean {
    return this.components.has(name);
  }

  /**
   * Check if a plugin is registered
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Check if a plugin is initialized
   */
  isPluginInitialized(name: string): boolean {
    return this.initializedPlugins.has(name);
  }

  /**
   * Get components by category
   */
  getComponentsByCategory(category: string): Map<string, (new (metadata: ComponentMetadata) => IComponent)> {
    const result = new Map<string, (new (metadata: ComponentMetadata) => IComponent)>();

    for (const [name, metadata] of this.componentMetadata) {
      if (metadata.category === category) {
        const componentClass = this.components.get(name);
        if (componentClass) {
          result.set(name, componentClass);
        }
      }
    }

    return result;
  }

  /**
   * Get components by tags
   */
  getComponentsByTags(tags: string[]): Map<string, (new (metadata: ComponentMetadata) => IComponent)> {
    const result = new Map<string, (new (metadata: ComponentMetadata) => IComponent)>();

    for (const [name, metadata] of this.componentMetadata) {
      if (tags.some(tag => metadata.tags.includes(tag))) {
        const componentClass = this.components.get(name);
        if (componentClass) {
          result.set(name, componentClass);
        }
      }
    }

    return result;
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const metadata of this.componentMetadata.values()) {
      categories.add(metadata.category);
    }
    return Array.from(categories).sort();
  }

  /**
   * Get all tags
   */
  getTags(): string[] {
    const tags = new Set<string>();
    for (const metadata of this.componentMetadata.values()) {
      for (const tag of metadata.tags) {
        tags.add(tag);
      }
    }
    return Array.from(tags).sort();
  }

  /**
   * Unregister a component
   */
  unregisterComponent(name: string): boolean {
    const componentRemoved = this.components.delete(name);
    const metadataRemoved = this.componentMetadata.delete(name);

    if (componentRemoved || metadataRemoved) {
      this.emit('component.unregistered', { name });
      return true;
    }

    return false;
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(name: string): Promise<boolean> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      return false;
    }

    // Dispose plugin if initialized
    if (this.initializedPlugins.has(name)) {
      await this.disposePlugin(plugin);
    }

    this.plugins.delete(name);
    this.emit('plugin.unregistered', { name, plugin });
    return true;
  }

  /**
   * Clear all components and plugins
   */
  async clear(): Promise<void> {
    await this.disposePlugins();
    this.components.clear();
    this.componentMetadata.clear();
    this.plugins.clear();
    this.emit('registry.cleared', {});
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    componentCount: number;
    pluginCount: number;
    initializedPluginCount: number;
    categories: string[];
    tags: string[];
  } {
    return {
      componentCount: this.components.size,
      pluginCount: this.plugins.size,
      initializedPluginCount: this.initializedPlugins.size,
      categories: this.getCategories(),
      tags: this.getTags()
    };
  }
}