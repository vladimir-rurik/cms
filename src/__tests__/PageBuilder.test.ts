import { PageBuilder } from '../builder/PageBuilder';
import { BaseComponent } from '../components/BaseComponent';
import { ComponentMetadata, RenderContext } from '../interfaces';

// Mock BaseComponent for testing
class MockComponent extends BaseComponent {
  async render(context: RenderContext): Promise<any> {
    return {
      html: `<div class="${this.generateClassName()}">${this.getConfig('text')}</div>`,
      css: `.mock-component { color: ${this.getConfig('color')}; }`
    };
  }
}

describe('PageBuilder', () => {
  let pageBuilder: PageBuilder;
  let mockComponent: MockComponent;

  beforeEach(() => {
    pageBuilder = new PageBuilder();
    mockComponent = new MockComponent({
      name: 'MockComponent',
      category: 'test',
      tags: ['test'],
      configuration: { text: 'Default Text', color: 'black' }
    });
  });

  describe('Builder Pattern', () => {
    it('should chain methods correctly', () => {
      const builder = pageBuilder
        .setTitle('Test Page')
        .setTheme('default')
        .setMetadata({ locale: 'en' });

      expect(builder).toBe(pageBuilder);
      expect(pageBuilder.getTitle()).toBe('Test Page');
      expect(pageBuilder.getTheme()).toBe('default');
      expect(pageBuilder.getMetadata().locale).toBe('en');
    });

    it('should set title', () => {
      pageBuilder.setTitle('My Page');
      expect(pageBuilder.getTitle()).toBe('My Page');
    });

    it('should set theme', () => {
      const themeConfig = {
        name: 'custom',
        colors: {
          primary: '#blue',
          secondary: '#gray',
          background: '#white',
          text: '#black'
        },
        typography: {
          fontFamily: 'Arial',
          fontSize: { small: 12, medium: 16, large: 20 }
        },
        spacing: { small: 8, medium: 16, large: 24 },
        breakpoints: { mobile: 768, desktop: 1024 }
      };

      pageBuilder.setTheme(themeConfig);
      expect(pageBuilder.getTheme()).toBe(themeConfig);
    });

    it('should merge metadata', () => {
      pageBuilder.setMetadata({ locale: 'en' });
      pageBuilder.setMetadata({
        seo: { title: 'SEO Title', description: 'SEO Description' }
      });

      expect(pageBuilder.getMetadata()).toEqual({
        locale: 'en',
        seo: { title: 'SEO Title', description: 'SEO Description' }
      });
    });
  });

  describe('Component Management', () => {
    it('should add component with string', () => {
      pageBuilder.addComponent('text1', 'Hello World');

      expect(pageBuilder.hasComponent('text1')).toBe(true);
      expect(pageBuilder.getComponentCount()).toBe(1);
    });

    it('should add component with instance', () => {
      pageBuilder.addComponent('comp1', mockComponent);

      expect(pageBuilder.hasComponent('comp1')).toBe(true);
      expect(pageBuilder.getComponentCount()).toBe(1);
    });

    it('should add component with custom position', () => {
      const position = { zone: 'header', order: 5 };
      pageBuilder.addComponent('comp1', mockComponent, position);

      const components = pageBuilder.getComponents();
      const compData = components.get('comp1');

      expect(compData?.position).toEqual(position);
    });

    it('should throw error for duplicate component IDs', () => {
      pageBuilder.addComponent('comp1', mockComponent);

      expect(() => {
        pageBuilder.addComponent('comp1', mockComponent);
      }).toThrow("Component with id 'comp1' already exists");
    });

    it('should remove component', () => {
      pageBuilder.addComponent('comp1', mockComponent);
      pageBuilder.removeComponent('comp1');

      expect(pageBuilder.hasComponent('comp1')).toBe(false);
      expect(pageBuilder.getComponentCount()).toBe(0);
    });

    it('should throw error when removing non-existent component', () => {
      expect(() => {
        pageBuilder.removeComponent('nonexistent');
      }).toThrow("Component with id 'nonexistent' does not exist");
    });
  });

  describe('Page Building', () => {
    it('should build page with title', () => {
      pageBuilder.setTitle('Test Page');
      const page = pageBuilder.build();

      expect(page.id).toBeDefined();
      expect(page.title).toBe('Test Page');
      expect(page.theme).toBe('default');
    });

    it('should build page with custom ID', () => {
      pageBuilder.setTitle('Test Page');
      const page = pageBuilder.build('custom-page-id');

      expect(page.id).toBe('custom-page-id');
    });

    it('should build page with components', () => {
      pageBuilder
        .setTitle('Test Page')
        .addComponent('text1', 'Hello World')
        .addComponent('comp1', mockComponent);

      const page = pageBuilder.build();

      expect(page.components.size).toBe(3); // text1, comp1, and page-container
      expect(page.components.has('text1')).toBe(true);
      expect(page.components.has('comp1')).toBe(true);
      expect(page.components.has('page-container')).toBe(true);
    });

    it('should generate page ID from title', () => {
      pageBuilder.setTitle('My Awesome Page!');
      const page = pageBuilder.build();

      expect(page.id).toBe('my-awesome-page');
    });

    it('should generate random page ID when title results in empty slug', () => {
      pageBuilder.setTitle('---'); // Title that results in empty slug after cleaning
      const page = pageBuilder.build(); // Build without providing ID

      expect(page.id).toMatch(/^page-[a-z0-9]+$/);
    });

    it('should reset builder after build', () => {
      pageBuilder
        .setTitle('Test Page')
        .setTheme('custom')
        .addComponent('comp1', mockComponent);

      pageBuilder.build();

      expect(pageBuilder.getTitle()).toBe('');
      expect(pageBuilder.getTheme()).toBe('default');
      expect(pageBuilder.getComponentCount()).toBe(0);
    });

    it('should throw error when building without title', () => {
      expect(() => {
        pageBuilder.build();
      }).toThrow('Page title is required');
    });

    it('should create composite component with all added components', () => {
      pageBuilder
        .setTitle('Test Page')
        .addComponent('text1', 'Hello World')
        .addComponent('comp1', mockComponent, { zone: 'header', order: 1 });

      const page = pageBuilder.build();
      const container = page.components.get('page-container');

      expect(container).toBeDefined();

      // Check if container has the children (this would require accessing private method)
      // For now, just ensure the container was created
    });
  });

  describe('Page Rendering', () => {
    let renderContext: RenderContext;

    beforeEach(() => {
      renderContext = {
        services: {},
        request: { url: '/', method: 'GET' },
        response: { headers: {}, statusCode: 200 }
      };
    });

    it('should render page with HTML structure', async () => {
      pageBuilder
        .setTitle('Test Page')
        .addComponent('text1', 'Hello World');

      const page = pageBuilder.build();
      const result = await page.render(renderContext);

      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<title>Test Page</title>');
      expect(result.html).toContain('Hello World');
    });

    it('should render page with CSS', async () => {
      pageBuilder
        .setTitle('Test Page')
        .addComponent('comp1', mockComponent);

      const page = pageBuilder.build();
      const result = await page.render(renderContext);

      expect(result.css).toContain('color: black');
      expect(result.css).toContain('.page-content');
    });

    it('should render page with JavaScript', async () => {
      pageBuilder.setTitle('Test Page');

      const page = pageBuilder.build();
      const result = await page.render(renderContext);

      expect(result.js).toContain('Page loaded:');
      expect(result.js).toContain('document.addEventListener');
    });

    it('should include metadata in render result', async () => {
      pageBuilder
        .setTitle('Test Page')
        .setMetadata({
          locale: 'fr',
          seo: {
            title: 'SEO Title',
            description: 'SEO Description',
            keywords: ['cms', 'test']
          }
        });

      const page = pageBuilder.build();
      const result = await page.render(renderContext);

      expect(result.html).toContain('<html lang="fr">');
      expect(result.html).toContain('<meta name="description" content="SEO Description">');
      expect(result.html).toContain('<meta name="keywords" content="cms, test">');

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.locale).toBe('fr');
      expect(result.metadata?.componentCount).toBe(1); // page-container only
    });

    it('should handle theme configuration', async () => {
      const theme = {
        name: 'test-theme',
        colors: {
          primary: '#ff0000',
          secondary: '#00ff00',
          background: '#ffffff',
          text: '#000000'
        },
        typography: {
          fontFamily: 'Arial',
          fontSize: { normal: 16 }
        },
        spacing: { normal: 16 },
        breakpoints: { mobile: 768 }
      };

      pageBuilder
        .setTitle('Themed Page')
        .setTheme(theme);

      const page = pageBuilder.build();
      const result = await page.render(renderContext);

      expect(result.css).toContain('--color-primary: #ff0000');
      expect(result.css).toContain('--font-family: Arial');
    });

    it('should handle component rendering errors gracefully', async () => {
      class ErrorComponent extends BaseComponent {
        async render(): Promise<any> {
          throw new Error('Component render error');
        }
      }

      const errorComponent = new ErrorComponent({
        name: 'ErrorComponent',
        category: 'test',
        tags: [],
        configuration: {}
      });

      pageBuilder
        .setTitle('Error Page')
        .addComponent('error', errorComponent);

      const page = pageBuilder.build();
      const result = await page.render(renderContext);

      expect(result.html).toContain('<!-- Error rendering component error: Error: Component render error -->');
    });

    it('should render page with zones', async () => {
      pageBuilder
        .setTitle('Zoned Page')
        .addComponent('header', 'Header Content', { zone: 'header', order: 1 })
        .addComponent('main', 'Main Content', { zone: 'main', order: 1 })
        .addComponent('footer', 'Footer Content', { zone: 'footer', order: 1 });

      const page = pageBuilder.build();
      const result = await page.render(renderContext);

      expect(result.html).toContain('Header Content');
      expect(result.html).toContain('Main Content');
      expect(result.html).toContain('Footer Content');
      expect(result.html).toContain('data-zone="header"');
      expect(result.html).toContain('data-zone="main"');
      expect(result.html).toContain('data-zone="footer"');
    });
  });

  describe('Events', () => {
    it('should emit events on property changes', () => {
      const listener = jest.fn();
      pageBuilder.on('title.changed', listener);

      pageBuilder.setTitle('New Title');

      expect(listener).toHaveBeenCalledWith({ title: 'New Title' });
    });

    it('should emit events on component addition', () => {
      const listener = jest.fn();
      pageBuilder.on('component.added', listener);

      pageBuilder.addComponent('comp1', mockComponent);

      expect(listener).toHaveBeenCalledWith({
        id: 'comp1',
        component: mockComponent,
        position: { zone: 'main', order: 0 }
      });
    });

    it('should emit events on component removal', () => {
      const listener = jest.fn();
      pageBuilder.on('component.removed', listener);

      pageBuilder.addComponent('comp1', mockComponent);
      pageBuilder.removeComponent('comp1');

      expect(listener).toHaveBeenCalledWith({ id: 'comp1' });
    });

    it('should emit events on page build', () => {
      const listener = jest.fn();
      pageBuilder.on('page.built', listener);

      pageBuilder.setTitle('Test Page');
      pageBuilder.addComponent('comp1', mockComponent);
      pageBuilder.build();

      expect(listener).toHaveBeenCalledWith({
        id: expect.stringMatching(/^test-page$/),
        title: 'Test Page',
        componentCount: 2 // comp1 + page-container
      });
    });
  });

  describe('State Management', () => {
    it('should maintain builder state correctly', () => {
      pageBuilder.setTitle('Test');
      pageBuilder.addComponent('comp1', mockComponent);

      expect(pageBuilder.getTitle()).toBe('Test');
      expect(pageBuilder.hasComponent('comp1')).toBe(true);
      expect(pageBuilder.getComponentCount()).toBe(1);
    });

    it('should provide read-only access to components', () => {
      pageBuilder.addComponent('comp1', mockComponent);
      const components = pageBuilder.getComponents();

      expect(components.size).toBe(1);
      expect(components.has('comp1')).toBe(true);

      // Verify it's a copy
      components.clear();
      expect(pageBuilder.getComponentCount()).toBe(1);
    });
  });
});