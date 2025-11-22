import { ComponentRegistry } from '../plugins/ComponentRegistry';
import { BaseComponent } from '../components/BaseComponent';
import { ICMSPlugin, ComponentMetadata, PluginContext, IIoCContainer } from '../interfaces';

// Mock component classes
class TestComponent extends BaseComponent {
  async render(): Promise<any> {
    return { html: 'test' };
  }
}

class AnotherComponent extends BaseComponent {
  async render(): Promise<any> {
    return { html: 'another' };
  }
}

// Mock plugin
class TestPlugin implements ICMSPlugin {
  name = 'test-plugin';
  version = '1.0.0';

  async initialize(context: PluginContext): Promise<void> {
    // Mock initialization
  }

  async dispose(): Promise<void> {
    // Mock disposal
  }
}

class ErrorPlugin implements ICMSPlugin {
  name = 'error-plugin';
  version = '1.0.0';

  async initialize(context: PluginContext): Promise<void> {
    throw new Error('Plugin initialization failed');
  }

  async dispose(): Promise<void> {
    // Mock disposal
  }
}

describe('ComponentRegistry', () => {
  let registry: ComponentRegistry;
  let mockContainer: jest.Mocked<IIoCContainer>;
  let mockPipeline: jest.Mocked<any>;

  beforeEach(() => {
    registry = new ComponentRegistry();
    mockContainer = {
      register: jest.fn(),
      resolve: jest.fn(),
      isRegistered: jest.fn(),
      dispose: jest.fn()
    } as any;

    mockPipeline = {
      use: jest.fn(),
      execute: jest.fn()
    } as any;
  });

  describe('Component Registration', () => {
    it('should register component with metadata', () => {
      const metadata: ComponentMetadata = {
        name: 'TestComponent',
        category: 'test',
        tags: ['test', 'component'],
        configuration: { setting: 'value' }
      };

      registry.registerComponent('TestComponent', TestComponent, metadata);

      expect(registry.hasComponent('TestComponent')).toBe(true);
      expect(registry.getComponent('TestComponent')).toBe(TestComponent);
      expect(registry.getComponentMetadata('TestComponent')).toEqual(metadata);
    });

    it('should register component without metadata', () => {
      registry.registerComponent('TestComponent', TestComponent);

      expect(registry.hasComponent('TestComponent')).toBe(true);
      expect(registry.getComponent('TestComponent')).toBe(TestComponent);
      expect(registry.getComponentMetadata('TestComponent')).toBeUndefined();
    });

    it('should throw error for duplicate component registration', () => {
      registry.registerComponent('TestComponent', TestComponent);

      expect(() => {
        registry.registerComponent('TestComponent', AnotherComponent);
      }).toThrow("Component 'TestComponent' is already registered");
    });

    it('should get all components', () => {
      registry.registerComponent('TestComponent', TestComponent);
      registry.registerComponent('AnotherComponent', AnotherComponent);

      const components = registry.getComponents();

      expect(components.size).toBe(2);
      expect(components.get('TestComponent')).toBe(TestComponent);
      expect(components.get('AnotherComponent')).toBe(AnotherComponent);
    });

    it('should get all component metadata', () => {
      const metadata1: ComponentMetadata = {
        name: 'TestComponent',
        category: 'test1',
        tags: ['test1'],
        configuration: {}
      };

      const metadata2: ComponentMetadata = {
        name: 'AnotherComponent',
        category: 'test2',
        tags: ['test2'],
        configuration: {}
      };

      registry.registerComponent('TestComponent', TestComponent, metadata1);
      registry.registerComponent('AnotherComponent', AnotherComponent, metadata2);

      const allMetadata = registry.getAllComponentMetadata();

      expect(allMetadata.size).toBe(2);
      expect(allMetadata.get('TestComponent')).toEqual(metadata1);
      expect(allMetadata.get('AnotherComponent')).toEqual(metadata2);
    });
  });

  describe('Component Creation', () => {
    it('should create component with default metadata', () => {
      registry.registerComponent('TestComponent', TestComponent, {
        name: 'TestComponent',
        category: 'test',
        tags: ['test'],
        configuration: { defaultProp: 'default' }
      });

      const component = registry.createComponent('TestComponent');

      expect(component).toBeInstanceOf(TestComponent);
      expect(component.metadata.name).toBe('TestComponent');
      expect(component.metadata.category).toBe('test');
      expect(component.getConfig('defaultProp')).toBe('default');
    });

    it('should create component with custom metadata', () => {
      registry.registerComponent('TestComponent', TestComponent);

      const component = registry.createComponent('TestComponent', {
        category: 'custom',
        tags: ['custom'],
        configuration: { customProp: 'custom' }
      });

      expect(component).toBeInstanceOf(TestComponent);
      expect(component.metadata.category).toBe('custom');
      expect(component.metadata.tags).toEqual(['custom']);
      expect(component.getConfig('customProp')).toBe('custom');
    });

    it('should return undefined for non-existent component', () => {
      const component = registry.createComponent('NonExistent');
      expect(component).toBeUndefined();
    });

    it('should handle component creation errors', () => {
      class BrokenComponent {
        constructor() {
          throw new Error('Construction failed');
        }
      }

      registry.registerComponent('BrokenComponent', BrokenComponent as any);

      expect(() => {
        registry.createComponent('BrokenComponent');
      }).toThrow("Failed to create component 'BrokenComponent': Error: Construction failed");
    });
  });

  describe('Component Organization', () => {
    beforeEach(() => {
      registry.registerComponent('TestComponent', TestComponent, {
        name: 'TestComponent',
        category: 'category1',
        tags: ['tag1', 'shared'],
        configuration: {}
      });

      registry.registerComponent('AnotherComponent', AnotherComponent, {
        name: 'AnotherComponent',
        category: 'category2',
        tags: ['tag2', 'shared'],
        configuration: {}
      });
    });

    it('should get components by category', () => {
      const category1Components = registry.getComponentsByCategory('category1');
      const category2Components = registry.getComponentsByCategory('category2');
      const emptyComponents = registry.getComponentsByCategory('nonexistent');

      expect(category1Components.size).toBe(1);
      expect(category1Components.get('TestComponent')).toBe(TestComponent);

      expect(category2Components.size).toBe(1);
      expect(category2Components.get('AnotherComponent')).toBe(AnotherComponent);

      expect(emptyComponents.size).toBe(0);
    });

    it('should get components by tags', () => {
      const tag1Components = registry.getComponentsByTags(['tag1']);
      const tag2Components = registry.getComponentsByTags(['tag2']);
      const sharedComponents = registry.getComponentsByTags(['shared']);
      const multiTagComponents = registry.getComponentsByTags(['tag1', 'tag2']);

      expect(tag1Components.size).toBe(1);
      expect(tag1Components.get('TestComponent')).toBe(TestComponent);

      expect(tag2Components.size).toBe(1);
      expect(tag2Components.get('AnotherComponent')).toBe(AnotherComponent);

      expect(sharedComponents.size).toBe(2);
      expect(sharedComponents.get('TestComponent')).toBe(TestComponent);
      expect(sharedComponents.get('AnotherComponent')).toBe(AnotherComponent);

      expect(multiTagComponents.size).toBe(2); // Both components have at least one of the tags
    });

    it('should get all categories', () => {
      const categories = registry.getCategories();
      expect(categories).toEqual(['category1', 'category2']);
    });

    it('should get all tags', () => {
      const tags = registry.getTags();
      expect(tags).toEqual(['shared', 'tag1', 'tag2']); // Sorted alphabetically
    });
  });

  describe('Plugin Management', () => {
    let testPlugin: TestPlugin;

    beforeEach(() => {
      testPlugin = new TestPlugin();
    });

    it('should register plugin', () => {
      registry.registerPlugin(testPlugin);

      expect(registry.hasPlugin('test-plugin')).toBe(true);
      expect(registry.getPlugin('test-plugin')).toBe(testPlugin);
      expect(registry.getPlugins()).toContain(testPlugin);
    });

    it('should throw error for duplicate plugin registration', () => {
      registry.registerPlugin(testPlugin);

      expect(() => {
        registry.registerPlugin(testPlugin);
      }).toThrow("Plugin 'test-plugin' is already registered");
    });

    it('should initialize plugins', async () => {
      const context: PluginContext = {
        container: mockContainer,
        pipeline: mockPipeline
      };

      registry.registerPlugin(testPlugin);
      await registry.initializePlugins(context);

      expect(registry.isPluginInitialized('test-plugin')).toBe(true);
    });

    it('should initialize specific plugin', async () => {
      const context: PluginContext = {
        container: mockContainer,
        pipeline: mockPipeline
      };

      registry.registerPlugin(testPlugin);
      await registry.initializePlugin(testPlugin, context);

      expect(registry.isPluginInitialized('test-plugin')).toBe(true);
    });

    it('should not reinitialize already initialized plugin', async () => {
      const context: PluginContext = {
        container: mockContainer,
        pipeline: mockPipeline
      };

      registry.registerPlugin(testPlugin);
      await registry.initializePlugin(testPlugin, context);
      await registry.initializePlugin(testPlugin, context); // Second call should not initialize again

      expect(registry.isPluginInitialized('test-plugin')).toBe(true);
    });

    it('should handle plugin initialization errors', async () => {
      const context: PluginContext = {
        container: mockContainer,
        pipeline: mockPipeline
      };

      const errorPlugin = new ErrorPlugin();
      registry.registerPlugin(errorPlugin);

      await expect(
        registry.initializePlugins(context)
      ).rejects.toThrow("Failed to initialize plugin 'error-plugin': Error: Plugin initialization failed");

      expect(registry.isPluginInitialized('error-plugin')).toBe(false);
    });

    it('should dispose plugins', async () => {
      const context: PluginContext = {
        container: mockContainer,
        pipeline: mockPipeline
      };

      registry.registerPlugin(testPlugin);
      await registry.initializePlugin(testPlugin, context);
      await registry.disposePlugins();

      expect(registry.isPluginInitialized('test-plugin')).toBe(false);
    });

    it('should dispose specific plugin', async () => {
      const context: PluginContext = {
        container: mockContainer,
        pipeline: mockPipeline
      };

      registry.registerPlugin(testPlugin);
      await registry.initializePlugin(testPlugin, context);
      await registry.disposePlugin(testPlugin);

      expect(registry.isPluginInitialized('test-plugin')).toBe(false);
    });

    it('should handle plugin disposal errors gracefully', async () => {
      const errorPlugin = new ErrorPlugin();
      jest.spyOn(errorPlugin, 'dispose').mockRejectedValue(new Error('Dispose failed'));

      registry.registerPlugin(errorPlugin);
      registry.markAsInitialized('error-plugin'); // Manually mark as initialized

      // Should not throw error, should just log it
      await expect(
        registry.disposePlugin(errorPlugin)
      ).resolves.not.toThrow();
    });
  });

  describe('Registry Management', () => {
    it('should unregister component', () => {
      registry.registerComponent('TestComponent', TestComponent);
      const removed = registry.unregisterComponent('TestComponent');

      expect(removed).toBe(true);
      expect(registry.hasComponent('TestComponent')).toBe(false);
    });

    it('should return false when unregistering non-existent component', () => {
      const removed = registry.unregisterComponent('NonExistent');
      expect(removed).toBe(false);
    });

    it('should unregister plugin', async () => {
      const testPlugin = new TestPlugin();
      registry.registerPlugin(testPlugin);

      const removed = await registry.unregisterPlugin('test-plugin');

      expect(removed).toBe(true);
      expect(registry.hasPlugin('test-plugin')).toBe(false);
    });

    it('should return false when unregistering non-existent plugin', async () => {
      const removed = await registry.unregisterPlugin('NonExistent');
      expect(removed).toBe(false);
    });

    it('should clear registry', async () => {
      const testPlugin = new TestPlugin();

      registry.registerComponent('TestComponent', TestComponent);
      registry.registerPlugin(testPlugin);
      await registry.initializePlugin(testPlugin, {
        container: mockContainer,
        pipeline: mockPipeline
      });

      await registry.clear();

      expect(registry.hasComponent('TestComponent')).toBe(false);
      expect(registry.hasPlugin('test-plugin')).toBe(false);
      expect(registry.getComponents().size).toBe(0);
      expect(registry.getPlugins().length).toBe(0);
    });
  });

  describe('Registry Statistics', () => {
    it('should provide accurate statistics', () => {
      const testPlugin = new TestPlugin();

      registry.registerComponent('TestComponent', TestComponent, {
        name: 'TestComponent',
        category: 'test',
        tags: ['test'],
        configuration: {}
      });

      registry.registerComponent('AnotherComponent', AnotherComponent);
      registry.registerPlugin(testPlugin);

      const stats = registry.getStats();

      expect(stats.componentCount).toBe(2);
      expect(stats.pluginCount).toBe(1);
      expect(stats.initializedPluginCount).toBe(0);
      expect(stats.categories).toEqual(['test']);
      expect(stats.tags).toEqual(['test']);
    });
  });

  describe('Events', () => {
    it('should emit component registration event', () => {
      const listener = jest.fn();
      registry.on('component.registered', listener);

      registry.registerComponent('TestComponent', TestComponent);

      expect(listener).toHaveBeenCalledWith({
        name: 'TestComponent',
        componentClass: TestComponent,
        metadata: undefined
      });
    });

    it('should emit plugin registration event', () => {
      const testPlugin = new TestPlugin();
      const listener = jest.fn();
      registry.on('plugin.registered', listener);

      registry.registerPlugin(testPlugin);

      expect(listener).toHaveBeenCalledWith({
        plugin: testPlugin
      });
    });

    it('should emit plugin initialization event', async () => {
      const testPlugin = new TestPlugin();
      const listener = jest.fn();
      registry.on('plugin.initialized', listener);

      const context: PluginContext = {
        container: mockContainer,
        pipeline: mockPipeline
      };

      registry.registerPlugin(testPlugin);
      await registry.initializePlugin(testPlugin, context);

      expect(listener).toHaveBeenCalledWith({
        plugin: testPlugin
      });
    });
  });
});

// Helper method for testing
declare module '../plugins/ComponentRegistry' {
  interface ComponentRegistry {
    markAsInitialized(name: string): void;
  }
}

// Add helper method for testing
ComponentRegistry.prototype.markAsInitialized = function(name: string): void {
  (this as any).initializedPlugins.add(name);
};