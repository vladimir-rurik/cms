import { EventEmitter } from 'eventemitter3';
import {
  IPageBuilder,
  IPage,
  IComponent,
  ComponentPosition,
  PageMetadata,
  ThemeConfig,
  RenderContext,
  RenderResult
} from '../interfaces';
import { BaseComponent } from '../components/BaseComponent';
import { CompositeComponent } from '../components/CompositeComponent';

export class Page implements IPage {
  private _id: string;
  private _title: string;
  private _theme: ThemeConfig | string;
  private _metadata: PageMetadata;
  private _components = new Map<string, IComponent>();

  constructor(
    id: string,
    title: string,
    theme: ThemeConfig | string,
    metadata: PageMetadata = {},
    components: Map<string, IComponent> = new Map()
  ) {
    this._id = id;
    this._title = title;
    this._theme = theme;
    this._metadata = { ...metadata };
    this._components = new Map(components);
  }

  get id(): string {
    return this._id;
  }

  get title(): string {
    return this._title;
  }

  get theme(): ThemeConfig | string {
    return this._theme;
  }

  get metadata(): PageMetadata {
    return { ...this._metadata };
  }

  get components(): Map<string, IComponent> {
    return new Map(this._components);
  }

  async render(context: RenderContext): Promise<RenderResult> {
    const allCSS: string[] = [];
    const allJS: string[] = [];
    const componentResults: string[] = [];

    // Render all components
    for (const [id, component] of this._components) {
      try {
        const result = await component.render({
          ...context,
          page: {
            id: this._id,
            title: this._title,
            theme: this._theme,
            metadata: this._metadata,
            components: this._components,
            render: context.page?.render || (() => Promise.resolve({ html: '', css: '', js: '' }))
          }
        });

        componentResults.push(`<!-- Component: ${id} -->`);
        componentResults.push(result.html);

        if (result.css) {
          allCSS.push(`/* Component: ${id} */`);
          allCSS.push(result.css);
        }

        if (result.js) {
          allJS.push(`/* Component: ${id} */`);
          allJS.push(result.js);
        }
      } catch (error) {
        console.error(`Error rendering component ${id}:`, error);
        componentResults.push(`<!-- Error rendering component ${id}: ${error} -->`);
      }
    }

    // Generate page HTML
    const html = this.generatePageHTML(componentResults.join('\n'));

    // Generate page CSS
    const css = this.generatePageCSS(allCSS.join('\n'));

    // Generate page JS
    const js = this.generatePageJS(allJS.join('\n'));

    return {
      html,
      css,
      js,
      metadata: {
        ...this._metadata,
        componentCount: this._components.size,
        renderedAt: new Date().toISOString()
      }
    };
  }

  private generatePageHTML(content: string): string {
    const pageTitle = this._metadata.seo?.title || this._title;
    const pageDescription = this._metadata.seo?.description || '';

    return `<!DOCTYPE html>
<html lang="${this._metadata.locale || 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(pageTitle)}</title>
    ${pageDescription ? `<meta name="description" content="${this.escapeHtml(pageDescription)}">` : ''}
    ${this._metadata.seo?.keywords ? `<meta name="keywords" content="${this._metadata.seo.keywords.join(', ')}">` : ''}
    <meta name="generator" content="Universal CMS Core v1.0.0">
</head>
<body data-page-id="${this.escapeHtml(this._id)}" data-page-theme="${this.escapeHtml(String(this._theme))}">
    <main class="page-content">
${content}
    </main>
</body>
</html>`;
  }

  private generatePageCSS(componentCSS: string): string {
    const themeStyles = this.generateThemeCSS();

    return `/* Universal CMS Core - Page Styles */
/* Page: ${this._id} */

${themeStyles}

/* Component Styles */
${componentCSS}

/* Layout Styles */
.page-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

@media (max-width: 768px) {
    .page-content {
        padding: 10px;
    }
}`;
  }

  private generateThemeCSS(): string {
    if (typeof this._theme === 'string') {
      return `/* Theme: ${this._theme} */`;
    }

    const theme = this._theme;
    return `/* Theme: ${theme.name} */

:root {
    --color-primary: ${theme.colors.primary};
    --color-secondary: ${theme.colors.secondary};
    --color-background: ${theme.colors.background};
    --color-text: ${theme.colors.text};
    --font-family: ${theme.typography.fontFamily};
}

body {
    font-family: var(--font-family);
    background-color: var(--color-background);
    color: var(--color-text);
}`;
  }

  private generatePageJS(componentJS: string): string {
    return `// Universal CMS Core - Page Scripts
// Page: ${this._id}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded:', '${this._id}');

    // Initialize page functionality
    const pageElement = document.body;
    pageElement.classList.add('page-loaded');
});

${componentJS}`;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export class PageBuilder extends EventEmitter implements IPageBuilder {
  private _title = '';
  private _theme: ThemeConfig | string = 'default';
  private _metadata: PageMetadata = {};
  private _components = new Map<string, { component: IComponent | string; position?: ComponentPosition }>();

  setTitle(title: string): IPageBuilder {
    this._title = title;
    this.emit('title.changed', { title });
    return this;
  }

  setTheme(theme: string | ThemeConfig): IPageBuilder {
    this._theme = theme;
    this.emit('theme.changed', { theme });
    return this;
  }

  setMetadata(metadata: PageMetadata): IPageBuilder {
    this._metadata = { ...this._metadata, ...metadata };
    this.emit('metadata.changed', { metadata: this._metadata });
    return this;
  }

  addComponent(
    id: string,
    component: string | IComponent,
    position: ComponentPosition = { zone: 'main', order: 0 }
  ): IPageBuilder {
    if (this._components.has(id)) {
      throw new Error(`Component with id '${id}' already exists`);
    }

    this._components.set(id, { component, position });
    this.emit('component.added', { id, component, position });
    return this;
  }

  removeComponent(id: string): IPageBuilder {
    if (!this._components.has(id)) {
      throw new Error(`Component with id '${id}' does not exist`);
    }

    this._components.delete(id);
    this.emit('component.removed', { id });
    return this;
  }

  build(id: string = this.generatePageId()): IPage {
    if (!this._title) {
      throw new Error('Page title is required');
    }

    const components = new Map<string, IComponent>();
    const composite = new CompositeComponent({
      name: 'page-container',
      category: 'layout',
      tags: ['page', 'container'],
      configuration: {}
    });

    // Add all components to the composite
    for (const [compId, compData] of this._components) {
      let component: IComponent;

      if (typeof compData.component === 'string') {
        // Create a simple text component for string inputs
        component = this.createTextComponent(compData.component, compId);
      } else {
        component = compData.component;
      }

      components.set(compId, component);

      // Add to composite with position
      composite.addChild(compId, component, compData.position || { zone: 'main', order: 0 });
    }

    // Add composite as main component
    components.set('page-container', composite);

    const page = new Page(id, this._title, this._theme, this._metadata, components);

    this.emit('page.built', { id, title: this._title, componentCount: components.size });

    // Reset builder state
    this.reset();

    return page;
  }

  private createTextComponent(text: string, id: string): IComponent {
    // Create a simple text component
    class TextComponent extends BaseComponent {
      async render(__context: RenderContext): Promise<RenderResult> {
        return {
          html: `<div class="text-component" data-component-id="${id}">${text}</div>`,
          css: '.text-component { margin: 10px 0; padding: 10px; }'
        };
      }
    }

    return new TextComponent({
      name: 'text',
      category: 'content',
      tags: ['text', 'simple'],
      configuration: { text }
    });
  }

  private generatePageId(): string {
    return this._title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      || 'page-' + Math.random().toString(36).substr(2, 9);
  }

  private reset(): void {
    this._title = '';
    this._theme = 'default';
    this._metadata = {};
    this._components.clear();
  }

  // Builder state methods
  getTitle(): string {
    return this._title;
  }

  getTheme(): ThemeConfig | string {
    return this._theme;
  }

  getMetadata(): PageMetadata {
    return { ...this._metadata };
  }

  getComponents(): Map<string, { component: IComponent | string; position?: ComponentPosition }> {
    return new Map(this._components);
  }

  hasComponent(id: string): boolean {
    return this._components.has(id);
  }

  getComponentCount(): number {
    return this._components.size;
  }
}