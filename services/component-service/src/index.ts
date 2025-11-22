import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ComponentRegistry } from './ComponentRegistry';
import { ServiceRequest, ServiceResponse, ComponentInfo } from '../shared/types';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Component Registry
const componentRegistry = new ComponentRegistry();

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
  const { name, componentCode, metadata } = req.data;

  // Dynamic component evaluation (in production, this should use a sandbox)
  const ComponentClass = eval(`(${componentCode})`);
  componentRegistry.registerComponent(name, ComponentClass, metadata);

  return { success: true, message: `Component ${name} registered successfully` };
}));

app.post('/list', handleServiceRequest(async (req) => {
  const components = componentRegistry.getAllComponents();
  const componentList: ComponentInfo[] = [];

  for (const [name, component] of components) {
    componentList.push({
      name: component.metadata.name,
      category: component.metadata.category,
      tags: component.metadata.tags,
      configuration: component.metadata.configuration,
      dependencies: component.metadata.dependencies
    });
  }

  return componentList;
}));

app.post('/create', handleServiceRequest(async (req) => {
  const { name, configuration } = req.data;

  const instance = componentRegistry.createComponent(name, configuration || {});
  const instanceId = `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    instanceId,
    component: {
      metadata: instance.metadata,
      name: instance.metadata.name
    }
  };
}));

app.post('/render', handleServiceRequest(async (req) => {
  const { instanceId, context } = req.data;

  const instance = componentRegistry.getInstance(instanceId);
  if (!instance) {
    throw new Error(`Instance ${instanceId} not found`);
  }

  const result = await instance.render(context);
  return result;
}));

app.post('/validate', handleServiceRequest(async (req) => {
  const { instanceId } = req.data;

  const instance = componentRegistry.getInstance(instanceId);
  if (!instance) {
    throw new Error(`Instance ${instanceId} not found`);
  }

  const result = instance.validate();
  return result;
}));

app.post('/dispose', handleServiceRequest(async (req) => {
  const { instanceId } = req.data;

  componentRegistry.disposeInstance(instanceId);
  return { success: true, message: `Instance ${instanceId} disposed` };
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'component-service',
    timestamp: new Date().toISOString(),
    components: componentRegistry.getComponentNames().length
  });
});

app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`🚀 Component Service running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  componentRegistry.dispose();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  componentRegistry.dispose();
  process.exit(0);
});