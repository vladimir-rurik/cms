# Universal CMS Core

[![Coverage: 92.81% Statements](https://img.shields.io/badge/coverage-92.8%25-brightgreen.svg)](https://github.com/universal-cms/core)

A modular CMS framework built with TypeScript. Think of it as LEGOs for building content management systems.

## Features

### Core Architecture
- **Modular Design**: Plug-and-play components
- **Dependency Injection**: IoC Container for service management
- **Component System**: Base components with inheritance
- **Plugin Architecture**: Extensible plugin system
- **Theme Support**: Configurable theming
- **Builder Pattern**: Fluent API for page construction

### Advanced Features
- **Performance Optimized**: Efficient rendering and caching
- **Type Safe**: Full TypeScript support
- **Event System**: Reactive event-driven architecture
- **Validation**: Built-in validation system
- **Environment Agnostic**: Works in Node.js and browser
- **Developer Friendly**: Comprehensive APIs

## Quick Start

```typescript
import { IoCContainer, ServiceLifetime, PageBuilder } from './src';

// Initialize container
const container = new IoCContainer();
container.register('ConfigService', () => new ConfigService(), ServiceLifetime.Singleton);

// Build a page
const page = new PageBuilder()
  .setTitle('My Page')
  .setTheme('modern')
  .addComponent('header', 'Header Content')
  .addComponent('content', 'Main Content')
  .build();

// Render
const result = await page.render({
  services: {},
  request: { url: '/', method: 'GET' },
  response: { headers: {}, statusCode: 200 }
});
console.log(result.html);
```

## Architecture

### Component System

```typescript
class MyComponent extends BaseComponent {
  async render(context: RenderContext): Promise<RenderResult> {
    return {
      html: `<div class="my-component">${this.props.content}</div>`,
      css: `.my-component { color: blue; }`
    };
  }
}
```

### Dependency Injection

```typescript
const container = new IoCContainer();
container.register('DatabaseService', () => new DatabaseService(), ServiceLifetime.Singleton);
const db = container.resolve('DatabaseService');
```

## API Documentation

### Core Classes

#### IoCContainer
Dependency injection container for managing services.

```typescript
class IoCContainer {
  register(name: string, factory: ServiceFactory, lifetime?: ServiceLifetime): void;
  resolve(name: string): T;
  isRegistered(name: string): boolean;
  dispose(): void;
}
```

#### BaseComponent
Foundation class for all CMS components.

```typescript
abstract class BaseComponent {
  abstract render(context: RenderContext): Promise<RenderResult>;
  validate(): ValidationResult;
  getConfig<T>(key: string, defaultValue?: T): T;
}
```

#### PageBuilder
Fluent interface for building pages.

```typescript
class PageBuilder {
  setTitle(title: string): PageBuilder;
  setTheme(theme: string | ThemeConfig): PageBuilder;
  addComponent(id: string, component: string | IComponent): PageBuilder;
  build(): Page;
}
```

## Test Coverage

Our comprehensive test suite ensures robust functionality across all modules:

### Overall Coverage
- **Statements**: 92.81% (555/598)
- **Branches**: 80.54% (149/185)
- **Functions**: 92.20% (130/141)
- **Lines**: 92.81% (542/584)
- **Total Tests**: 170 passing tests

### Module Coverage Breakdown

| Module | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| **Builder** | 96.03% | 88.63% | 93.33% | 96.03% |
| **Components** | 99.5% | 95.55% | 97.5% | 100% |
| **Container** | 93.75% | 87.5% | 86.66% | 93.75% |
| **Pipeline** | 72.88% | 59.01% | 79.31% | 71.42% |
| **Plugins** | 98.13% | 88.23% | 100% | 98.11% |
| **Interfaces** | 100% | 100% | 100% | 100% |

### Testing Framework
- **Jest** for unit and integration testing
- **jsdom** for DOM testing environment
- **Coverage thresholds** enforced at 50% minimum
- **Continuous testing** on Node.js 20.x

## Development

### Prerequisites
- Node.js 20+
- TypeScript 5.2+

### Setup

```bash
git clone https://github.com/universal-cms/core.git
cd core
npm install
npm run build
npm test
```

### Commands
- `npm run build` - Build the project
- `npm test` - Run all 137 tests
- `npm run test:coverage` - Run tests with coverage (targets 50%+)
- `npm run lint` - Check code style
- `npm run type-check` - Verify TypeScript types

### Local Development
For local development, import directly from source:

```typescript
import { IoCContainer, PageBuilder } from './src';
```

The project is not published to NPM - use the source directly.

## Examples

### Creating a Custom Component

```typescript
class FeaturedLinkComponent extends BaseComponent {
  async render(context: RenderContext): Promise<RenderResult> {
    return {
      html: `
        <div class="featured-link">
          <a href="${this.getConfig('url')}" class="link-card">
            <h3>${this.getConfig('title')}</h3>
            <p>${this.getConfig('description')}</p>
            <span class="arrow">→</span>
          </a>
        </div>
      `,
      css: `
        .featured-link { margin: 1rem 0; }
        .link-card {
          display: block;
          padding: 1.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .link-card:hover {
          border-color: #3b82f6;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .link-card h3 { margin: 0 0 0.5rem 0; color: #1f2937; }
        .link-card p { margin: 0 0 1rem 0; color: #6b7280; }
        .arrow { color: #3b82f6; font-weight: bold; }
      `
    };
  }
}
```

### Plugin Development

```typescript
class SeoPlugin implements ICMSPlugin {
  async initialize(context: PluginContext): Promise<void> {
    context.container.registerSingleton('SeoService', SeoService);
  }
}
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see the [LICENSE](LICENSE) file for details.