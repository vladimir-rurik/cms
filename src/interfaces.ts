/**
 * Core CMS interfaces and types
 */

// Service lifetime options
export enum ServiceLifetime {
  Singleton = 'singleton',
  Scoped = 'scoped',
  Transient = 'transient'
}

// Service factory type
export type ServiceFactory<T = any> = (...args: any[]) => T;

// IoC Container interface
export interface IIoCContainer {
  register<T>(name: string, factory: ServiceFactory<T>, lifetime?: ServiceLifetime): void;
  registerSingleton<T>(name: string, factory: ServiceFactory<T>): void;
  registerScoped<T>(name: string, factory: ServiceFactory<T>): void;
  registerTransient<T>(name: string, factory: ServiceFactory<T>): void;
  resolve<T>(name: string): T;
  isRegistered(name: string): boolean;
  dispose(): void;
}

// Component metadata
export interface ComponentMetadata {
  name: string;
  category: string;
  tags: string[];
  configuration: Record<string, any>;
  dependencies?: string[];
  lifecycle?: {
    initialize?: boolean;
    dispose?: boolean;
  };
}

// Render context
export interface RenderContext {
  services: any;
  request: {
    url: string;
    method: string;
    headers?: Record<string, string>;
  };
  response: {
    headers: Record<string, string>;
    statusCode: number;
  };
  user?: any;
  page?: {
    id: string;
    title: string;
    theme: ThemeConfig | string;
    metadata: PageMetadata;
    components: Map<string, IComponent>;
    render(context: RenderContext): Promise<RenderResult>;
  };
}

// Render result
export interface RenderResult {
  html: string;
  css?: string;
  js?: string;
  metadata?: Record<string, any>;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Base component interface
export interface IComponent {
  metadata: ComponentMetadata;
  validate(): ValidationResult;
  getConfig<T>(key: string, defaultValue?: T): T;
  setConfig(key: string, value: any): void;
  render(context: RenderContext): Promise<RenderResult>;
  dispose?(): void;
}

// Component position
export interface ComponentPosition {
  zone: string;
  order: number;
  attributes?: Record<string, any>;
}

// Page metadata
export interface PageMetadata {
  locale?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  custom?: Record<string, any>;
}

// Theme configuration
export interface ThemeConfig {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  typography: {
    fontFamily: string;
    fontSize: Record<string, number>;
  };
  spacing: Record<string, number>;
  breakpoints: Record<string, number>;
  fonts?: string[];
}

// Page interface
export interface IPage {
  id: string;
  title: string;
  theme: ThemeConfig | string;
  metadata: PageMetadata;
  components: Map<string, IComponent>;
  render(context: RenderContext): Promise<RenderResult>;
}

// Page builder interface
export interface IPageBuilder {
  setTitle(title: string): IPageBuilder;
  setTheme(theme: string | ThemeConfig): IPageBuilder;
  setMetadata(metadata: PageMetadata): IPageBuilder;
  addComponent(id: string, component: string | IComponent, position?: ComponentPosition): IPageBuilder;
  removeComponent(id: string): IPageBuilder;
  build(): IPage;
}

// Plugin interface
export interface ICMSPlugin {
  name: string;
  version: string;
  initialize(context: PluginContext): Promise<void>;
  dispose(): Promise<void>;
}

// Plugin context
export interface PluginContext {
  container: IIoCContainer;
  pipeline: IPipeline;
}

// Pipeline middleware interface
export interface IPipelineMiddleware {
  name: string;
  execute(context: PipelineContext, next: () => Promise<void>): Promise<void>;
}

// Pipeline context
export interface PipelineContext {
  request: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: any;
  };
  response: {
    headers: Record<string, string>;
    statusCode: number;
    data?: any;
    meta?: any;
  };
  page?: IPage;
  services: any;
}

// Pipeline interface
export interface IPipeline {
  use(middleware: IPipelineMiddleware): void;
  execute(context: PipelineContext): Promise<void>;
}

// Component registry interface
export interface IComponentRegistry {
  registerComponent(name: string, componentClass: new (metadata: ComponentMetadata) => IComponent, metadata?: ComponentMetadata): void;
  registerPlugin(plugin: ICMSPlugin): void;
  getComponent(name: string): (new (metadata: ComponentMetadata) => IComponent) | undefined;
  getComponents(): Map<string, (new (metadata: ComponentMetadata) => IComponent)>;
  getPlugins(): ICMSPlugin[];
  initializePlugins(context: PluginContext): Promise<void>;
}

// Component configuration
export interface ComponentConfiguration {
  id: string;
  type: string;
  position: ComponentPosition;
  configuration?: Record<string, any>;
}

// Page configuration
export interface PageConfiguration {
  id: string;
  title: string;
  theme: string | ThemeConfig;
  metadata?: PageMetadata;
  components: ComponentConfiguration[];
}

// CMS configuration
export interface CMSConfiguration {
  defaultTheme: string;
  themes: Record<string, ThemeConfig>;
  plugins: string[];
  components: Record<string, ComponentConfiguration>;
  pages: Record<string, PageConfiguration>;
}

// Event types
export type CMSEventType = 'component.registered' | 'plugin.loaded' | 'page.rendered' | 'error' | 'component.validated' | 'config.changed' | 'config.reset';

// Event data
export interface CMSEvent {
  type: CMSEventType;
  data: any;
  timestamp: Date;
}

// Event listener
export type CMSEventListener = (event: CMSEvent) => void;

// Event emitter interface
export interface ICMSEventEmitter {
  on(event: CMSEventType, listener: CMSEventListener): void;
  off(event: CMSEventType, listener: CMSEventListener): void;
  emit(event: CMSEventType, data: any): void;
}

// CMS core interface
export interface ICMS {
  container: IIoCContainer;
  registry: IComponentRegistry;
  pipeline: IPipeline;
  events: ICMSEventEmitter;
  createPageBuilder(): IPageBuilder;
  renderPage(pageId: string, context: RenderContext): Promise<RenderResult>;
  loadConfiguration(config: CMSConfiguration): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
}