export interface ServiceRequest {
  id: string;
  service: string;
  method: string;
  data?: any;
  timestamp: number;
}

export interface ServiceResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
}

export interface ComponentInfo {
  name: string;
  category: string;
  tags: string[];
  configuration: Record<string, any>;
  dependencies?: string[];
}

export interface PageInfo {
  id: string;
  title: string;
  theme: string | ThemeConfig;
  components: ComponentInfo[];
  metadata: PageMetadata;
}

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
}

export interface PageMetadata {
  locale?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  [key: string]: any;
}

export interface PluginInfo {
  name: string;
  version: string;
  description: string;
  dependencies: string[];
  isActive: boolean;
}