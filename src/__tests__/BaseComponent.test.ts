import { BaseComponent } from '../components/BaseComponent';
import { ComponentMetadata, RenderContext } from '../interfaces';

// Test component implementation
class TestComponent extends BaseComponent {
  async render(_context: RenderContext): Promise<any> {
    return {
      html: `<div class="${this.generateClassName()}">${this.getConfig('content', '')}</div>`,
      css: `.test-component { color: ${this.getConfig('color', 'black')}; }`
    };
  }

  public override getRequiredConfigKeys(): string[] {
    return ['content'];
  }
}

class ValidatedComponent extends BaseComponent {
  async render(_context: RenderContext): Promise<any> {
    return { html: 'test' };
  }

  public override getRequiredConfigKeys(): string[] {
    return ['requiredField'];
  }

  public override validateConfig(): any {
    const result = super.validateConfig();
    if (this.getConfig('invalidField')) {
      result.errors.push('Invalid field is not allowed');
    }
    return result;
  }
}

describe('BaseComponent', () => {
  let metadata: ComponentMetadata;

  beforeEach(() => {
    metadata = {
      name: 'TestComponent',
      category: 'test',
      tags: ['test', 'component'],
      configuration: {
        content: 'default content',
        color: 'blue'
      }
    };
  });

  describe('Component Creation', () => {
    it('should create component with metadata', () => {
      const component = new TestComponent(metadata);
      expect(component.metadata.name).toBe('TestComponent');
      expect(component.metadata.category).toBe('test');
      expect(component.metadata.tags).toEqual(['test', 'component']);
    });

    it('should initialize default configuration from metadata', () => {
      const component = new TestComponent(metadata);
      expect(component.getConfig('content')).toBe('default content');
      expect(component.getConfig('color')).toBe('blue');
    });

    it('should handle empty configuration', () => {
      const emptyMetadata: ComponentMetadata = {
        name: 'EmptyComponent',
        category: 'test',
        tags: [],
        configuration: {}
      };

      const component = new TestComponent(emptyMetadata);
      expect(component.getConfig('nonexistent', 'default')).toBe('default');
    });
  });

  describe('Configuration Management', () => {
    let component: TestComponent;

    beforeEach(() => {
      component = new TestComponent(metadata);
    });

    it('should get configuration values', () => {
      expect(component.getConfig('content')).toBe('default content');
      expect(component.getConfig('color')).toBe('blue');
    });

    it('should get nested configuration values', () => {
      component.setConfig('nested.deep.value', 'deep value');
      expect(component.getConfig('nested.deep.value')).toBe('deep value');
    });

    it('should return default value for missing keys', () => {
      expect(component.getConfig('missing', 'default')).toBe('default');
    });

    it('should set configuration values', () => {
      component.setConfig('content', 'new content');
      expect(component.getConfig('content')).toBe('new content');
    });

    it('should set nested configuration values', () => {
      component.setConfig('nested.value', 'nested');
      expect(component.getConfig('nested.value')).toBe('nested');
    });

    it('should set multiple configuration values', () => {
      component.setMultipleConfig({
        content: 'multi content',
        color: 'red',
        newField: 'new value'
      });

      expect(component.getConfig('content')).toBe('multi content');
      expect(component.getConfig('color')).toBe('red');
      expect(component.getConfig('newField')).toBe('new value');
    });

    it('should reset configuration to defaults', () => {
      component.setConfig('content', 'modified');
      component.setConfig('extra', 'extra field');

      component.resetConfig();

      expect(component.getConfig('content')).toBe('default content');
      expect(component.getConfig('extra', 'not found')).toBe('not found');
    });

    it('should get all configuration', () => {
      component.setConfig('extra', 'value');
      const allConfig = component.getAllConfig();

      expect(allConfig.content).toBe('default content');
      expect(allConfig.color).toBe('blue');
      expect(allConfig.extra).toBe('value');
    });
  });

  describe('Validation', () => {
    it('should validate valid component', () => {
      const component = new TestComponent(metadata);
      const result = component.validate();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate missing required configuration', () => {
      const component = new TestComponent({
        name: 'TestComponent',
        category: 'test',
        tags: [],
        configuration: {}
      });

      const result = component.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Required configuration key \'content\' is missing');
    });

    it('should validate custom validation rules', () => {
      const component = new ValidatedComponent(metadata);
      component.setConfig('invalidField', 'invalid');

      const result = component.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid field is not allowed');
    });

    it('should collect warnings', () => {
      const component = new TestComponent(metadata);
      // Add a custom validation that produces a warning
      jest.spyOn(component, 'validateCustom').mockReturnValue({
        isValid: true,
        errors: [],
        warnings: ['This is a warning']
      });

      const result = component.validate();

      expect(result.warnings).toContain('This is a warning');
    });

    it('should validate metadata completeness', () => {
      const invalidMetadata: ComponentMetadata = {
        name: '',
        category: '',
        tags: [],
        configuration: {}
      };

      const component = new TestComponent(invalidMetadata);
      const result = component.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Component name is required');
      expect(result.errors).toContain('Component category is required');
    });
  });

  describe('Rendering', () => {
    it('should render component with configuration', async () => {
      const component = new TestComponent(metadata);
      component.setConfig('content', 'Hello World');

      const context: RenderContext = {
        services: {},
        request: { url: '/', method: 'GET' },
        response: { headers: {}, statusCode: 200 }
      };

      const result = await component.render(context);

      expect(result.html).toContain('Hello World');
      expect(result.css).toContain('color: blue');
    });

    it('should generate unique CSS class names', () => {
      const component1 = new TestComponent(metadata);
      const component2 = new TestComponent(metadata);

      const class1 = component1.generateClassName();
      const class2 = component2.generateClassName();

      expect(class1).not.toBe(class2);
      expect(class1).toMatch(/testcomponent-/);
    });

    it('should generate unique CSS class names with suffix', () => {
      const component = new TestComponent(metadata);
      const className = component.generateClassName('header');

      expect(className).toMatch(/testcomponent-header-/);
    });
  });

  describe('Events', () => {
    it('should emit events on configuration changes', () => {
      const component = new TestComponent(metadata);
      const listener = jest.fn();

      component.on('config.changed', listener);
      component.setConfig('content', 'new content');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'config.changed',
          data: {
            key: 'content',
            oldValue: 'default content',
            newValue: 'new content'
          }
        })
      );
    });

    it('should emit events on configuration reset', () => {
      const component = new TestComponent(metadata);
      const listener = jest.fn();

      component.on('config.reset', listener);
      component.resetConfig();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'config.reset',
          data: {}
        })
      );
    });

    it('should emit events on validation', () => {
      const component = new TestComponent(metadata);
      const listener = jest.fn();

      component.on('component.validated', listener);
      component.validate();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'component.validated',
          data: {
            isValid: true,
            errors: [],
            warnings: []
          }
        })
      );
    });
  });

  describe('Component Information', () => {
    it('should provide component info', () => {
      const component = new TestComponent(metadata);
      component.setConfig('customField', 'custom value');

      const info = component.getInfo();

      expect(info.name).toBe('TestComponent');
      expect(info.category).toBe('test');
      expect(info.tags).toEqual(['test', 'component']);
      expect(info.config.customField).toBe('custom value');
    });
  });

  describe('Resource Management', () => {
    it('should dispose properly', () => {
      const component = new TestComponent(metadata);
      const listener = jest.fn();

      component.on('test-event', listener);
      component.dispose();

      // Should remove all listeners
      component.emit('test-event', {});
      expect(listener).not.toHaveBeenCalled();

      // Should clear configuration
      expect(component.getConfig('content', 'not found')).toBe('not found');
    });
  });

  describe('HTML/CSS/JS Extraction', () => {
    it('should extract CSS from HTML', () => {
      const component = new TestComponent(metadata);
      const html = '<style>.test { color: red; }</style><div>content</div>';

      const css = component.extractCSS(html);

      expect(css).toBe('.test { color: red; }');
    });

    it('should extract JavaScript from HTML', () => {
      const component = new TestComponent(metadata);
      const html = '<script>console.log("test");</script><div>content</div>';

      const js = component.extractJS(html);

      expect(js).toBe('console.log("test");');
    });

    it('should extract multiple style and script tags', () => {
      const component = new TestComponent(metadata);
      const html = `
        <style>.one { color: red; }</style>
        <div>content</div>
        <style>.two { color: blue; }</style>
        <script>console.log("one");</script>
        <script>console.log("two");</script>
      `;

      const css = component.extractCSS(html);
      const js = component.extractJS(html);

      expect(css).toContain('.one { color: red; }');
      expect(css).toContain('.two { color: blue; }');
      expect(js).toContain('console.log("one");');
      expect(js).toContain('console.log("two");');
    });
  });
});