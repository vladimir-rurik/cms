/**
 * Basic CMS Usage Example
 * Demonstrates fundamental CMS functionality
 */

import {
  IoCContainer,
  ServiceLifetime,
  BaseComponent,
  ComponentMetadata,
  RenderContext,
  RenderResult,
  PageBuilder
} from '../../src';

// Example Service
class ConfigService {
  private config: Record<string, any> = {
    siteName: 'My CMS Site',
    theme: 'modern',
    author: 'CMS Team'
  };

  get(key: string): any {
    return this.config[key];
  }

  set(key: string, value: any): void {
    this.config[key] = value;
  }
}

// Example Component
class HeaderComponent extends BaseComponent {
  async render(context: RenderContext): Promise<RenderResult> {
    const siteName = context.services.getConfig ? context.services.getConfig('siteName', 'Default Site') : 'Default Site';

    return {
      html: `
        <header class="site-header">
          <h1>${siteName}</h1>
          <nav>
            <a href="/">Home</a>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
          </nav>
        </header>
      `,
      css: `
        .site-header {
          background: #2c3e50;
          color: white;
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .site-header h1 {
          margin: 0;
          font-size: 1.5rem;
        }
        .site-header nav a {
          color: white;
          text-decoration: none;
          margin-left: 1rem;
        }
        .site-header nav a:hover {
          text-decoration: underline;
        }
      `
    };
  }
}

// Content Component
class ContentComponent extends BaseComponent {
  async render(context: RenderContext): Promise<RenderResult> {
    const content = this.getConfig('content', 'Default content goes here...');

    return {
      html: `
        <main class="site-content">
          <div class="content-wrapper">
            ${content}
          </div>
        </main>
      `,
      css: `
        .site-content {
          max-width: 1200px;
          margin: 2rem auto;
          padding: 0 1rem;
        }
        .content-wrapper {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
      `
    };
  }
}

// Footer Component
class FooterComponent extends BaseComponent {
  async render(context: RenderContext): Promise<RenderResult> {
    const author = context.services.getConfig ? context.services.getConfig('author', 'CMS Author') : 'CMS Author';

    return {
      html: `
        <footer class="site-footer">
          <p>&copy; 2024 ${author}. All rights reserved.</p>
          <div class="footer-links">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </div>
        </footer>
      `,
      css: `
        .site-footer {
          background: #34495e;
          color: white;
          text-align: center;
          padding: 2rem 1rem;
          margin-top: 2rem;
        }
        .footer-links {
          margin-top: 1rem;
        }
        .footer-links a {
          color: white;
          text-decoration: none;
          margin: 0 1rem;
        }
        .footer-links a:hover {
          text-decoration: underline;
        }
      `
    };
  }
}

// Blog Post Component Example
class BlogPostComponent extends BaseComponent {
  protected getRequiredConfigKeys(): string[] {
    return ['title', 'content', 'author'];
  }

  async render(context: RenderContext): Promise<RenderResult> {
    const title = this.getConfig('title', 'Untitled Post');
    const content = this.getConfig('content', '');
    const author = this.getConfig('author', 'Anonymous');
    const publishDate = this.getConfig('publishDate', new Date());

    const formattedDate = new Date(publishDate).toLocaleDateString();

    return {
      html: `
        <article class="blog-post">
          <header class="blog-post-header">
            <h1>${title}</h1>
            <div class="blog-meta">
              <span class="author">By ${author}</span>
              <time datetime="${new Date(publishDate).toISOString()}">${formattedDate}</time>
            </div>
          </header>
          <div class="blog-content">
            ${content}
          </div>
          <footer class="blog-footer">
            <div class="tags">
              ${this.getConfig('tags', []).map((tag: string) => `<span class="tag">${tag}</span>`).join('')}
            </div>
          </footer>
        </article>
      `,
      css: `
        .blog-post {
          margin: 2rem 0;
          padding: 1.5rem;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
        }
        .blog-post-header h1 {
          margin: 0 0 1rem 0;
          color: #333;
        }
        .blog-meta {
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
        }
        .blog-content {
          line-height: 1.6;
        }
        .blog-footer {
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }
        .tag {
          display: inline-block;
          background: #f0f0f0;
          padding: 0.25rem 0.5rem;
          margin: 0.25rem;
          border-radius: 4px;
          font-size: 0.8rem;
          color: #666;
        }
      `
    };
  }
}

// Dynamic Gallery Component
class GalleryComponent extends BaseComponent {
  async render(context: RenderContext): Promise<RenderResult> {
    const images = this.getConfig('images', []);
    const columns = this.getConfig('columns', 3);

    return {
      html: `
        <div class="gallery-component">
          <h2>${this.getConfig('title', 'Gallery')}</h2>
          <div class="gallery-grid" style="grid-template-columns: repeat(${columns}, 1fr);">
            ${images.map((img: any) => `
              <div class="gallery-item">
                <img src="${img.src}" alt="${img.alt}" />
                ${img.caption ? `<p class="caption">${img.caption}</p>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `,
      css: `
        .gallery-component {
          margin: 2rem 0;
        }
        .gallery-grid {
          display: grid;
          gap: 1rem;
          margin-top: 1rem;
        }
        .gallery-item {
          position: relative;
        }
        .gallery-item img {
          width: 100%;
          height: auto;
          border-radius: 8px;
        }
        .caption {
          margin-top: 0.5rem;
          font-size: 0.9rem;
          color: #666;
        }
      `
    };
  }
}

// Main function to demonstrate CMS usage
async function runCMSExample(): Promise<void> {
  console.log('Starting CMS Example...\n');

  // 1. Initialize IoC Container
  const container = new IoCContainer();
  console.log('IoC Container initialized');

  // 2. Register services
  container.register('ConfigService', ConfigService, ServiceLifetime.Singleton);
  const configService = container.resolve<ConfigService>('ConfigService');
  console.log('ConfigService registered and resolved');

  // 3. Create page builder
  const pageBuilder = new PageBuilder();
  console.log('PageBuilder created');

  // 4. Build a simple page
  const simplePage = pageBuilder
    .setTitle('Welcome to Universal CMS')
    .setMetadata({
      locale: 'en-US',
      seo: {
        description: 'A demonstration of the Universal Content Management System framework',
        keywords: ['cms', 'typescript', 'framework']
      }
    })
    .addComponent('header', HeaderComponent)
    .addComponent('content', ContentComponent, {
      content: `
        <h2>Welcome to Universal CMS</h2>
        <p>This is a demonstration of the Universal Content Management System framework.</p>
        <ul>
          <li>Modular component architecture</li>
          <li>Dependency injection container</li>
          <li>TypeScript support</li>
          <li>Extensible plugin system</li>
        </ul>
      `
    })
    .addComponent('footer', FooterComponent)
    .build('welcome-page');

  console.log('Simple page built with components');

  // 5. Create a blog page
  const blogPage = new PageBuilder()
    .setTitle('My Blog - Latest Posts')
    .setMetadata({
      locale: 'en-US',
      seo: {
        description: 'Read the latest blog posts',
        keywords: ['blog', 'articles', 'posts']
      }
    })
    .addComponent('header', HeaderComponent)
    .addComponent('blog-post', new BlogPostComponent({
      name: 'BlogPost',
      category: 'content',
      tags: ['blog', 'post'],
      configuration: {
        title: 'Getting Started with Universal CMS',
        content: `
          <p>Welcome to our first blog post! Universal CMS is a powerful framework for building content management systems.</p>
          <p>In this post, we'll explore the basic concepts and show you how to get started.</p>
          <h3>Key Features</h3>
          <ul>
            <li><strong>Modular Architecture:</strong> Build applications with reusable components</li>
            <li><strong>TypeScript Support:</strong> Full type safety and IntelliSense</li>
            <li><strong>Plugin System:</strong> Extend functionality with plugins</li>
            <li><strong>Dependency Injection:</strong> Manage services and dependencies</li>
          </ul>
        `,
        author: 'CMS Team',
        publishDate: new Date().toISOString(),
        tags: ['cms', 'tutorial', 'getting-started']
      }
    }))
    .addComponent('footer', FooterComponent)
    .build('blog-page');

  console.log('Blog page created with BlogPost component');

  // 6. Create a gallery page
  const galleryPage = new PageBuilder()
    .setTitle('Photo Gallery')
    .addComponent('header', HeaderComponent)
    .addComponent('gallery', new GalleryComponent({
      name: 'Gallery',
      category: 'media',
      tags: ['gallery', 'images'],
      configuration: {
        title: 'Recent Photos',
        columns: 3,
        images: [
          {
            src: 'https://picsum.photos/400/300?random=1',
            alt: 'Random photo 1',
            caption: 'Beautiful landscape'
          },
          {
            src: 'https://picsum.photos/400/300?random=2',
            alt: 'Random photo 2',
            caption: 'City architecture'
          },
          {
            src: 'https://picsum.photos/400/300?random=3',
            alt: 'Random photo 3',
            caption: 'Nature photography'
          }
        ]
      }
    }))
    .addComponent('footer', FooterComponent)
    .build('gallery-page');

  console.log('Gallery page created with Gallery component');

  // 7. Render the pages
  const renderContext = {
    services: configService,
    request: { url: '/', method: 'GET' },
    response: { headers: {}, statusCode: 200 }
  };

  console.log('\nRendering pages...');

  const simpleResult = await simplePage.render(renderContext);
  console.log('Simple page rendered successfully');

  const blogResult = await blogPage.render(renderContext);
  console.log('Blog page rendered successfully');

  const galleryResult = await galleryPage.render(renderContext);
  console.log('Gallery page rendered successfully');

  // 8. Display results
  console.log('\nGenerated HTML length:');
  console.log('─'.repeat(40));
  console.log(`Simple page: ${simpleResult.html.length} characters`);
  console.log(`Blog page: ${blogResult.html.length} characters`);
  console.log(`Gallery page: ${galleryResult.html.length} characters`);

  console.log('\nGenerated CSS length:');
  console.log('─'.repeat(40));
  console.log(`Simple page: ${simpleResult.css?.length || 0} characters`);
  console.log(`Blog page: ${blogResult.css?.length || 0} characters`);
  console.log(`Gallery page: ${galleryResult.css?.length || 0} characters`);

  console.log('\nGenerated JavaScript length:');
  console.log('─'.repeat(40));
  console.log(`Simple page: ${simpleResult.js?.length || 0} characters`);
  console.log(`Blog page: ${blogResult.js?.length || 0} characters`);
  console.log(`Gallery page: ${galleryResult.js?.length || 0} characters`);

  // 9. Show metadata
  console.log('\nPage Metadata:');
  console.log('─'.repeat(40));
  console.log('Simple page:', simpleResult.metadata);
  console.log('Blog page:', blogResult.metadata);
  console.log('Gallery page:', galleryResult.metadata);

  // 10. Cleanup
  container.dispose();
  console.log('\nCleanup completed');
}

// Run the example if this file is executed directly
if (require.main === module) {
  runCMSExample()
    .then(() => {
      console.log('\nCMS Example completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nError running CMS Example:', error);
      process.exit(1);
    });
}

export {
  ConfigService,
  HeaderComponent,
  ContentComponent,
  FooterComponent,
  BlogPostComponent,
  GalleryComponent,
  runCMSExample
};