import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ServiceRequest, ServiceResponse } from '../shared/types';

const app = express();
const port = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory plugin registry (in production, this would use a database)
const plugins = new Map<string, any>();

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
app.post('/register', handleServiceRequest(async (req) => {
  const { name, version, description, pluginCode } = req.data;

  if (plugins.has(name)) {
    throw new Error(`Plugin ${name} is already registered`);
  }

  // Dynamic plugin registration (in production, use a sandbox)
  const PluginClass = eval(`(${pluginCode})`);
  const plugin = new PluginClass();

  const pluginInfo = {
    name,
    version,
    description,
    dependencies: plugin.dependencies || [],
    isActive: true,
    registeredAt: new Date()
  };

  plugins.set(name, {
    plugin,
    info: pluginInfo
  });

  // Initialize plugin if it has initialize method
  if (typeof plugin.initialize === 'function') {
    await plugin.initialize();
  }

  return { success: true, plugin: pluginInfo };
}));

app.post('/list', handleServiceRequest(async (req) => {
  const pluginList = Array.from(plugins.entries()).map(([name, data]) => data.info);
  return pluginList;
}));

app.post('/get', handleServiceRequest(async (req) => {
  const { name } = req.data;
  const pluginData = plugins.get(name);

  if (!pluginData) {
    throw new Error(`Plugin ${name} not found`);
  }

  return { plugin: pluginData.info };
}));

app.post('/activate', handleServiceRequest(async (req) => {
  const { name } = req.data;
  const pluginData = plugins.get(name);

  if (!pluginData) {
    throw new Error(`Plugin ${name} not found`);
  }

  pluginData.info.isActive = true;

  if (typeof pluginData.plugin.activate === 'function') {
    await pluginData.plugin.activate();
  }

  return { success: true, plugin: pluginData.info };
}));

app.post('/deactivate', handleServiceRequest(async (req) => {
  const { name } = req.data;
  const pluginData = plugins.get(name);

  if (!pluginData) {
    throw new Error(`Plugin ${name} not found`);
  }

  pluginData.info.isActive = false;

  if (typeof pluginData.plugin.deactivate === 'function') {
    await pluginData.plugin.deactivate();
  }

  return { success: true, plugin: pluginData.info };
}));

app.post('/unregister', handleServiceRequest(async (req) => {
  const { name } = req.data;
  const pluginData = plugins.get(name);

  if (!pluginData) {
    throw new Error(`Plugin ${name} not found`);
  }

  // Dispose plugin if it has dispose method
  if (typeof pluginData.plugin.dispose === 'function') {
    await pluginData.plugin.dispose();
  }

  plugins.delete(name);

  return { success: true, message: `Plugin ${name} unregistered` };
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'plugin-service',
    timestamp: new Date().toISOString(),
    plugins: plugins.size,
    activePlugins: Array.from(plugins.values()).filter(p => p.info.isActive).length
  });
});

app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`🚀 Plugin Service running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');

  // Dispose all plugins
  for (const [name, pluginData] of plugins) {
    if (typeof pluginData.plugin.dispose === 'function') {
      pluginData.plugin.dispose();
    }
  }

  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');

  // Dispose all plugins
  for (const [name, pluginData] of plugins) {
    if (typeof pluginData.plugin.dispose === 'function') {
      pluginData.plugin.dispose();
    }
  }

  process.exit(0);
});