import { PageInfo, ThemeConfig, PageMetadata } from '../../shared/types';

export interface ComponentPosition {
  zone: string;
  order: number;
}

export interface ComponentData {
  id: string;
  type: string;
  configuration: Record<string, any>;
  position: ComponentPosition;
}

export interface Page {
  id: string;
  title: string;
  theme: ThemeConfig | string;
  metadata: PageMetadata;
  components: Map<string, ComponentData>;
  createdAt: Date;
  updatedAt: Date;
}

export class PageBuilder {
  private pages = new Map<string, Page>();
  private componentServiceUrl: string;

  constructor(componentServiceUrl?: string) {
    this.componentServiceUrl = componentServiceUrl || process.env.COMPONENT_SERVICE_URL || 'http://localhost:3001';
  }

  async createPage(pageInfo: Partial<PageInfo>): Promise<Page> {
    const id = pageInfo.id || this.generateId();

    const page: Page = {
      id,
      title: pageInfo.title || '',
      theme: pageInfo.theme || 'default',
      metadata: pageInfo.metadata || {},
      components: new Map(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add components if provided
    if (pageInfo.components) {
      for (const component of pageInfo.components) {
        await this.addComponent(id, component);
      }
    }

    this.pages.set(id, page);
    return page;
  }

  async addComponent(pageId: string, componentData: ComponentData): Promise<void> {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page ${pageId} not found`);
    }

    // Create component instance via component service
    const response = await fetch(`${this.componentServiceUrl}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: `req_${Date.now()}`,
        service: 'page-service',
        method: 'create',
        data: {
          name: componentData.type,
          configuration: componentData.configuration
        }
      }),
    });

    const result = await response.json();

    page.components.set(componentData.id, {
      ...componentData,
      instanceId: result.data.instanceId
    });

    page.updatedAt = new Date();
  }

  async renderPage(pageId: string, context?: any): Promise<any> {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page ${pageId} not found`);
    }

    const renderContext = {
      services: {
        pageService: this,
        componentService: this.componentServiceUrl
      },
      request: context?.request || {},
      response: context?.response || {},
      page: {
        id: page.id,
        title: page.title,
        theme: page.theme,
        metadata: page.metadata
      }
    };

    const componentResults = [];
    const allCSS: string[] = [];
    const allJS: string[] = [];

    // Group components by zone
    const zones = new Map<string, ComponentData[]>();
    for (const component of page.components.values()) {
      const zone = component.position.zone || 'default';
      if (!zones.has(zone)) {
        zones.set(zone, []);
      }
      zones.get(zone)!.push(component);
    }

    // Sort components within each zone by order
    for (const [zone, components] of zones) {
      components.sort((a, b) => a.position.order - b.position.order);

      const zoneHTML: string[] = [];

      for (const componentData of components) {
        try {
          const componentResponse = await fetch(`${this.componentServiceUrl}/render`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: `req_${Date.now()}`,
              service: 'page-service',
              method: 'render',
              data: {
                instanceId: (componentData as any).instanceId,
                context: renderContext
              }
            }),
          });

          const result = await componentResponse.json();

          if (result.success && result.data) {
            zoneHTML.push(result.data.html);

            if (result.data.css) {
              allCSS.push(result.data.css);
            }

            if (result.data.js) {
              allJS.push(result.data.js);
            }
          }
        } catch (error) {
          console.error(`Error rendering component ${componentData.id}:`, error);
          zoneHTML.push(`<!-- Error rendering component ${componentData.id}: ${error} -->`);
        }
      }

      componentResults.push(`
        <div class="zone-${zone}" data-zone="${zone}">
          ${zoneHTML.join('\n')}
        </div>
      `);
    }

    // Generate final HTML
    const html = this.generatePageHTML(page, componentResults.join('\n'));
    const css = this.generatePageCSS(page, allCSS.join('\n'));
    const js = this.generatePageJS(page, allJS.join('\n'));

    return {
      html,
      css,
      js,
      metadata: {
        pageId: page.id,
        title: page.title,
        componentCount: page.components.size,
        zoneCount: zones.size,
        renderedAt: new Date().toISOString()
      }
    };
  }

  getPage(pageId: string): Page | undefined {
    return this.pages.get(pageId);
  }

  getAllPages(): Map<string, Page> {
    return new Map(this.pages);
  }

  updatePage(pageId: string, updates: Partial<PageInfo>): Page {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page ${pageId} not found`);
    }

    Object.assign(page, updates);
    page.updatedAt = new Date();

    return page;
  }

  deletePage(pageId: string): boolean {
    return this.pages.delete(pageId);
  }

  private generatePageHTML(page: Page, content: string): string {
    const pageTitle = page.metadata.seo?.title || page.title;
    const pageDescription = page.metadata.seo?.description || '';

    return `<!DOCTYPE html>
<html lang="${page.metadata.locale || 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(pageTitle)}</title>
    ${pageDescription ? `<meta name="description" content="${this.escapeHtml(pageDescription)}">` : ''}
    ${page.metadata.seo?.keywords ? `<meta name="keywords" content="${this.escapeHtml(page.metadata.seo.keywords.join(', '))}">` : ''}
    <meta name="generator" content="Universal CMS Core - Page Service v1.0.0">
</head>
<body data-page-id="${this.escapeHtml(page.id)}" data-page-theme="${this.escapeHtml(String(page.theme))}">
    <main class="page-content">
${content}
    </main>
</body>
</html>`;
  }

  private generatePageCSS(page: Page, componentCSS: string): string {
    const themeStyles = this.generateThemeCSS(page.theme);

    return `/* Universal CMS Core - Page Service Styles */
/* Page: ${page.id} */

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

  private generateThemeCSS(theme: ThemeConfig | string): string {
    if (typeof theme === 'string') {
      return `/* Theme: ${theme} */`;
    }

    const themeConfig = theme as ThemeConfig;
    return `/* Theme: ${themeConfig.name} */

:root {
    --color-primary: ${themeConfig.colors.primary};
    --color-secondary: ${themeConfig.colors.secondary};
    --color-background: ${themeConfig.colors.background};
    --color-text: ${themeConfig.colors.text};
    --font-family: ${themeConfig.typography.fontFamily};
}

body {
    font-family: var(--font-family);
    background-color: var(--color-background);
    color: var(--color-text);
}`;
  }

  private generatePageJS(page: Page, componentJS: string): string {
    return `// Universal CMS Core - Page Service Scripts
// Page: ${page.id}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded from page service:', '${page.id}');

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

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}