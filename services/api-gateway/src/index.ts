import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { ServiceClient } from '../shared/ServiceClient';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Service client
const serviceClient = new ServiceClient();

// Request ID middleware
app.use((req, res, next) => {
  req.requestId = Math.random().toString(36).substr(2, 9);
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// CORS headers for API Gateway
app.use((req, res, next) => {
  res.setHeader('X-Service-Gateway', 'Universal-CMS');
  res.setHeader('X-API-Version', 'v1.0');
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check all services
    const componentHealth = await checkService('component-service', '/health');
    const pageHealth = await checkService('page-service', '/health');

    const services = [
      { name: 'api-gateway', status: 'healthy' },
      { name: 'component-service', status: componentHealth ? 'healthy' : 'unhealthy' },
      { name: 'page-service', status: pageHealth ? 'healthy' : 'unhealthy' }
    ];

    const overallStatus = services.every(s => s.status === 'healthy') ? 'healthy' : 'degraded';

    res.json({
      status: overallStatus,
      services,
      timestamp: new Date().toISOString(),
      gateway: 'Universal CMS API Gateway v1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Service status endpoint
app.get('/services', async (req, res) => {
  try {
    const services = await Promise.allSettled([
      checkService('component-service', '/health'),
      checkService('page-service', '/health'),
      checkService('plugin-service', '/health'),
      checkService('config-service', '/health')
    ]);

    const serviceStatus = [
      { name: 'component-service', available: services[0].status === 'fulfilled' },
      { name: 'page-service', available: services[1].status === 'fulfilled' },
      { name: 'plugin-service', available: services[2].status === 'fulfilled' },
      { name: 'config-service', available: services[3].status === 'fulfilled' }
    ];

    res.json({
      services: serviceStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Component Service Routes
app.post('/api/components/register', async (req, res) => {
  try {
    const result = await serviceClient.call('component-service', 'register', req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/components/list', async (req, res) => {
  try {
    const result = await serviceClient.call('component-service', 'list', {});
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/components/create', async (req, res) => {
  try {
    const result = await serviceClient.call('component-service', 'create', req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/components/render', async (req, res) => {
  try {
    const result = await serviceClient.call('component-service', 'render', req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Page Service Routes
app.post('/api/pages/create', async (req, res) => {
  try {
    const result = await serviceClient.call('page-service', 'create', req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pages', async (req, res) => {
  try {
    const result = await serviceClient.call('page-service', 'list', {});
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pages/:id', async (req, res) => {
  try {
    const result = await serviceClient.call('page-service', 'get', { pageId: req.params.id });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pages/render/:id', async (req, res) => {
  try {
    const result = await serviceClient.call('page-service', 'render', {
      pageId: req.params.id,
      context: req.body
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/pages/:id', async (req, res) => {
  try {
    const result = await serviceClient.call('page-service', 'update', {
      pageId: req.params.id,
      updates: req.body
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/pages/:id', async (req, res) => {
  try {
    const result = await serviceClient.call('page-service', 'delete', { pageId: req.params.id });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unified CMS endpoint for page creation and rendering
app.post('/api/cms/render', async (req, res) => {
  try {
    const { title, theme, components, context } = req.body;

    // Create page
    const pageResult = await serviceClient.call('page-service', 'create', {
      title,
      theme,
      components,
      metadata: {}
    });

    // Render page
    const renderResult = await serviceClient.call('page-service', 'render', {
      pageId: pageResult.page.id,
      context: context || {}
    });

    res.json({
      success: true,
      page: pageResult.page,
      render: renderResult
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Gateway Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
    requestId: req.requestId
  });
});

async function checkService(serviceName: string, endpoint: string): Promise<boolean> {
  try {
    const serviceUrl = process.env[`${serviceName.toUpperCase().replace('-', '_')}_URL`] || `http://localhost:${getServicePort(serviceName)}`;
    const response = await fetch(`${serviceUrl}${endpoint}`, {
      method: 'GET',
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

function getServicePort(serviceName: string): number {
  const ports: Record<string, number> = {
    'component-service': 3001,
    'page-service': 3002,
    'plugin-service': 3003,
    'config-service': 3004
  };
  return ports[serviceName] || 3000;
}

// Start server
app.listen(port, () => {
  console.log(`🚀 Universal CMS API Gateway running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🔗 Service status: http://localhost:${port}/services`);
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

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});