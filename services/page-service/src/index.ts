import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PageBuilder } from './PageBuilder';
import { ServiceRequest, ServiceResponse, PageInfo, ThemeConfig } from '../shared/types';

const app = express();
const port = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Page Builder
const pageBuilder = new PageBuilder();

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
app.post('/create', handleServiceRequest(async (req) => {
  const pageInfo: PageInfo = req.data;
  const page = await pageBuilder.createPage(pageInfo);

  return {
    page: {
      id: page.id,
      title: page.title,
      theme: page.theme,
      metadata: page.metadata,
      componentCount: page.components.size,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt
    }
  };
}));

app.post('/get', handleServiceRequest(async (req) => {
  const { pageId } = req.data;
  const page = pageBuilder.getPage(pageId);

  if (!page) {
    throw new Error(`Page ${pageId} not found`);
  }

  return {
    page: {
      id: page.id,
      title: page.title,
      theme: page.theme,
      metadata: page.metadata,
      components: Array.from(page.components.values()),
      createdAt: page.createdAt,
      updatedAt: page.updatedAt
    }
  };
}));

app.post('/list', handleServiceRequest(async (req) => {
  const pages = pageBuilder.getAllPages();

  return {
    pages: Array.from(pages.entries()).map(([id, page]) => ({
      id: page.id,
      title: page.title,
      theme: page.theme,
      componentCount: page.components.size,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt
    }))
  };
}));

app.post('/render', handleServiceRequest(async (req) => {
  const { pageId, context } = req.data;
  const result = await pageBuilder.renderPage(pageId, context);

  return result;
}));

app.post('/update', handleServiceRequest(async (req) => {
  const { pageId, updates } = req.data;
  const page = pageBuilder.updatePage(pageId, updates);

  return {
    page: {
      id: page.id,
      title: page.title,
      theme: page.theme,
      metadata: page.metadata,
      componentCount: page.components.size,
      updatedAt: page.updatedAt
    }
  };
}));

app.post('/delete', handleServiceRequest(async (req) => {
  const { pageId } = req.data;
  const deleted = pageBuilder.deletePage(pageId);

  return { success: deleted };
}));

app.post('/add-component', handleServiceRequest(async (req) => {
  const { pageId, component } = req.data;
  await pageBuilder.addComponent(pageId, component);

  return { success: true };
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'page-service',
    timestamp: new Date().toISOString(),
    pages: pageBuilder.getAllPages().size
  });
});

app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`🚀 Page Service running on port ${port}`);
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