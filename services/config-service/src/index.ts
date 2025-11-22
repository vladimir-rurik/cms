import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ServiceRequest, ServiceResponse, ThemeConfig } from '../shared/types';

const app = express();
const port = process.env.PORT || 3004;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory configuration storage (in production, this would use a database or config server)
const configurations = new Map<string, any>();
const themes = new Map<string, ThemeConfig>();

// Initialize default theme
const defaultTheme: ThemeConfig = {
  name: 'default',
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    background: '#ffffff',
    text: '#212529'
  },
  typography: {
    fontFamily: 'Arial, sans-serif',
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 24,
      xxl: 32
    }
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  },
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1200,
    wide: 1440
  }
};

themes.set('default', defaultTheme);

// Error handling middleware
const errorHandler = (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({
    id: req.body?.id || '',
    success: false,
    error: err.message,
    timestamp: Date.now()
  });
};

// Service request handler
const handleServiceRequest = (handler: (req: ServiceRequest) => Promise<any>) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const serviceRequest: ServiceRequest = req.body;
      const result = await handler(serviceRequest);

      const response: ServiceResponse = {
        id: serviceRequest.id,
        success: true,
        data: result,
        timestamp: Date.now()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };
};

// API Routes
app.post('/theme/create', handleServiceRequest(async (req) => {
  const { name, themeConfig } = req.data;

  if (themes.has(name)) {
    throw new Error(`Theme ${name} already exists`);
  }

  const theme: ThemeConfig = {
    name,
    colors: themeConfig.colors || defaultTheme.colors,
    typography: themeConfig.typography || defaultTheme.typography,
    spacing: themeConfig.spacing || defaultTheme.spacing,
    breakpoints: themeConfig.breakpoints || defaultTheme.breakpoints
  };

  themes.set(name, theme);

  return { success: true, theme };
}));

app.post('/theme/get', handleServiceRequest(async (req) => {
  const { name } = req.data;
  const theme = themes.get(name);

  if (!theme) {
    throw new Error(`Theme ${name} not found`);
  }

  return theme;
}));

app.post('/theme/list', handleServiceRequest(async (req) => {
  const themeList = Array.from(themes.entries()).map(([name, theme]) => ({
    name,
    colors: theme.colors,
    typography: theme.typography,
    hasCustomSpacing: JSON.stringify(theme.spacing) !== JSON.stringify(defaultTheme.spacing),
    hasCustomBreakpoints: JSON.stringify(theme.breakpoints) !== JSON.stringify(defaultTheme.breakpoints)
  }));

  return themeList;
}));

app.post('/theme/update', handleServiceRequest(async (req) => {
  const { name, updates } = req.data;
  const theme = themes.get(name);

  if (!theme) {
    throw new Error(`Theme ${name} not found`);
  }

  Object.assign(theme, updates);
  themes.set(name, theme);

  return { success: true, theme };
}));

app.post('/theme/delete', handleServiceRequest(async (req) => {
  const { name } = req.data;

  if (name === 'default') {
    throw new Error('Cannot delete default theme');
  }

  const deleted = themes.delete(name);

  if (!deleted) {
    throw new Error(`Theme ${name} not found`);
  }

  return { success: true };
}));

app.post('/config/set', handleServiceRequest(async (req) => {
  const { key, value } = req.data;
  configurations.set(key, {
    value,
    updatedAt: new Date()
  });

  return { success: true };
}));

app.post('/config/get', handleServiceRequest(async (req) => {
  const { key } = req.data;
  const config = configurations.get(key);

  if (config === undefined) {
    throw new Error(`Configuration ${key} not found`);
  }

  return config;
}));

app.post('/config/list', handleServiceRequest(async (req) => {
  const configList = Array.from(configurations.entries()).map(([key, data]) => ({
    key,
    value: data.value,
    updatedAt: data.updatedAt
  }));

  return configList;
}));

app.post('/config/delete', handleServiceRequest(async (req) => {
  const { key } = req.data;
  const deleted = configurations.delete(key);

  if (!deleted) {
    throw new Error(`Configuration ${key} not found`);
  }

  return { success: true };
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'config-service',
    timestamp: new Date().toISOString(),
    configurations: configurations.size,
    themes: themes.size
  });
});

app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`🚀 Configuration Service running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});