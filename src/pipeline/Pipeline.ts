import { EventEmitter } from 'eventemitter3';
import {
  IPipeline,
  IPipelineMiddleware,
  PipelineContext
} from '../interfaces';

export class Pipeline extends EventEmitter implements IPipeline {
  private middlewares: IPipelineMiddleware[] = [];
  private errorHandlers: Array<(error: Error, context: PipelineContext) => Promise<void>> = [];

  /**
   * Add middleware to the pipeline
   */
  use(middleware: IPipelineMiddleware): void {
    if (this.middlewares.some(m => m.name === middleware.name)) {
      throw new Error(`Middleware '${middleware.name}' is already registered`);
    }

    this.middlewares.push(middleware);
    this.emit('middleware.added', { middleware });
  }

  /**
   * Remove middleware from the pipeline
   */
  remove(middlewareName: string): boolean {
    const index = this.middlewares.findIndex(m => m.name === middlewareName);
    if (index === -1) {
      return false;
    }

    const removed = this.middlewares.splice(index, 1)[0];
    this.emit('middleware.removed', { middleware: removed });
    return true;
  }

  /**
   * Execute the pipeline with context
   */
  async execute(context: PipelineContext): Promise<void> {
    let index = 0;
    const startTime = Date.now();

    this.emit('pipeline.started', { context });

    try {
      const next = async (): Promise<void> => {
        if (index >= this.middlewares.length) {
          this.emit('pipeline.completed', { context, duration: Date.now() - startTime });
          return;
        }

        const middleware = this.middlewares[index++];
        const middlewareStart = Date.now();

        this.emit('middleware.started', { middleware, context });

        try {
          await middleware.execute(context, next);
          this.emit('middleware.completed', {
            middleware,
            context,
            duration: Date.now() - middlewareStart
          });
        } catch (error) {
          this.emit('middleware.error', {
            middleware,
            context,
            error,
            duration: Date.now() - middlewareStart
          });
          throw error;
        }
      };

      await next();

    } catch (error) {
      this.emit('pipeline.error', {
        context,
        error,
        duration: Date.now() - startTime
      });

      // Try error handlers
      for (const handler of this.errorHandlers) {
        try {
          await handler(error as Error, context);
        } catch (handlerError) {
          console.error('Error in error handler:', handlerError);
        }
      }

      throw error;
    }
  }

  /**
   * Add error handler
   */
  onError(handler: (error: Error, context: PipelineContext) => Promise<void>): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Get all middleware names
   */
  getMiddlewareNames(): string[] {
    return this.middlewares.map(m => m.name);
  }

  /**
   * Check if middleware exists
   */
  hasMiddleware(name: string): boolean {
    return this.middlewares.some(m => m.name === name);
  }

  /**
   * Get middleware by name
   */
  getMiddleware(name: string): IPipelineMiddleware | undefined {
    return this.middlewares.find(m => m.name === name);
  }

  /**
   * Clear all middleware
   */
  clear(): void {
    const removedMiddlewares = [...this.middlewares];
    this.middlewares = [];
    this.errorHandlers = [];
    this.emit('pipeline.cleared', { removedMiddlewares });
  }

  /**
   * Get pipeline length
   */
  get length(): number {
    return this.middlewares.length;
  }
}

/**
 * Built-in middleware components
 */

export class RequestLoggerMiddleware implements IPipelineMiddleware {
  name = 'request-logger';

  async execute(context: PipelineContext, next: () => Promise<void>): Promise<void> {
    const start = Date.now();
    console.log(`[${new Date().toISOString()}] ${context.request.method} ${context.request.url}`);

    await next();

    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] Response ${context.response.statusCode} - ${duration}ms`);
  }
}

export class CorsMiddleware implements IPipelineMiddleware {
  name = 'cors';
  private options: {
    origins?: string[];
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
  };

  constructor(options: {
    origins?: string[];
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
  } = {}) {
    this.options = {
      origins: ['*'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization'],
      credentials: false,
      ...options
    };
  }

  async execute(context: PipelineContext, next: () => Promise<void>): Promise<void> {
    const origin = context.request.headers?.origin;

    // Set CORS headers
    if (!origin || this.options.origins?.includes('*') || this.options.origins?.includes(origin)) {
      context.response.headers['Access-Control-Allow-Origin'] = origin || '*';
    }

    context.response.headers['Access-Control-Allow-Methods'] = this.options.methods?.join(', ') || '';
    context.response.headers['Access-Control-Allow-Headers'] = this.options.headers?.join(', ') || '';

    if (this.options.credentials) {
      context.response.headers['Access-Control-Allow-Credentials'] = 'true';
    }

    // Handle preflight requests
    if (context.request.method === 'OPTIONS') {
      context.response.statusCode = 204;
      return;
    }

    await next();
  }
}

export class JsonBodyParserMiddleware implements IPipelineMiddleware {
  name = 'json-body-parser';
  private maxSize: number;

  constructor(maxSize: number = 1024 * 1024) { // 1MB default
    this.maxSize = maxSize;
  }

  async execute(context: PipelineContext, next: () => Promise<void>): Promise<void> {
    const contentType = context.request.headers?.['content-type'] || '';

    if (contentType.includes('application/json') && context.request.body) {
      try {
        if (typeof context.request.body === 'string') {
          // Check size limit
          if (context.request.body.length > this.maxSize) {
            context.response.statusCode = 413;
            context.response.data = { error: 'Request entity too large' };
            return;
          }

          context.request.body = JSON.parse(context.request.body);
        }
      } catch (error) {
        context.response.statusCode = 400;
        context.response.data = { error: 'Invalid JSON' };
        return;
      }
    }

    await next();
  }
}

export class SecurityHeadersMiddleware implements IPipelineMiddleware {
  name = 'security-headers';
  private options: {
    frameOptions?: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
    contentTypeOptions?: boolean;
    referrerPolicy?: string;
    contentSecurityPolicy?: string;
  };

  constructor(options: any = {}) {
    this.options = {
      frameOptions: 'DENY',
      contentTypeOptions: true,
      referrerPolicy: 'strict-origin-when-cross-origin',
      ...options
    };
  }

  async execute(context: PipelineContext, next: () => Promise<void>): Promise<void> {
    // X-Frame-Options
    if (this.options.frameOptions) {
      context.response.headers['X-Frame-Options'] = this.options.frameOptions;
    }

    // X-Content-Type-Options
    if (this.options.contentTypeOptions) {
      context.response.headers['X-Content-Type-Options'] = 'nosniff';
    }

    // Referrer Policy
    if (this.options.referrerPolicy) {
      context.response.headers['Referrer-Policy'] = this.options.referrerPolicy;
    }

    // Content Security Policy
    if (this.options.contentSecurityPolicy) {
      context.response.headers['Content-Security-Policy'] = this.options.contentSecurityPolicy;
    }

    await next();
  }
}

export class ErrorHandlingMiddleware implements IPipelineMiddleware {
  name = 'error-handling';

  async execute(context: PipelineContext, next: () => Promise<void>): Promise<void> {
    try {
      await next();
    } catch (error) {
      console.error('Pipeline error:', error);

      // Set error response
      if (!context.response.statusCode || context.response.statusCode < 400) {
        context.response.statusCode = 500;
      }

      context.response.data = {
        error: true,
        message: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      };

      // Don't expose stack trace in production
      if (process.env.NODE_ENV !== 'production' && error instanceof Error) {
        (context.response.data as any).stack = error.stack;
      }
    }
  }
}

export class ResponseTimeMiddleware implements IPipelineMiddleware {
  name = 'response-time';

  async execute(context: PipelineContext, next: () => Promise<void>): Promise<void> {
    const start = Date.now();

    await next();

    const duration = Date.now() - start;
    context.response.headers['X-Response-Time'] = `${duration}ms`;
    context.response.headers['X-Response-Time-Ms'] = duration.toString();
  }
}