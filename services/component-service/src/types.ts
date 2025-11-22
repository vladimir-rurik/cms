export interface ComponentMetadata {
  name: string;
  category: string;
  tags: string[];
  configuration: Record<string, any>;
  dependencies?: string[];
}

export interface RenderContext {
  services: Record<string, any>;
  request: any;
  response: any;
}

export interface RenderResult {
  html: string;
  css?: string;
  js?: string;
  metadata?: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface IComponent {
  metadata: ComponentMetadata;
  validate(): ValidationResult;
  render(context: RenderContext): Promise<RenderResult>;
  dispose?(): void;
}