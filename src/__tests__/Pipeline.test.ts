import { Pipeline, RequestLoggerMiddleware, CorsMiddleware, ErrorHandlingMiddleware } from '../pipeline/Pipeline';
import { IPipelineMiddleware, PipelineContext } from '../interfaces';

// Mock middleware for testing
class TestMiddleware implements IPipelineMiddleware {
  name: string;
  private shouldError: boolean;
  private action: (context: PipelineContext) => void;

  constructor(name: string, options: { shouldError?: boolean; action?: (context: PipelineContext) => void } = {}) {
    this.name = name;
    this.shouldError = options.shouldError || false;
    this.action = options.action || (() => {});
  }

  async execute(context: PipelineContext, next: () => Promise<void>): Promise<void> {
    this.action(context);

    if (this.shouldError) {
      throw new Error(`${this.name} error`);
    }

    await next();
  }
}

describe('Pipeline', () => {
  let pipeline: Pipeline;
  let mockContext: PipelineContext;

  beforeEach(() => {
    pipeline = new Pipeline();
    mockContext = {
      request: {
        url: '/test',
        method: 'GET',
        headers: { 'content-type': 'application/json' }
      },
      response: {
        headers: {},
        statusCode: 200,
        data: null
      },
      services: {}
    };
  });

  describe('Middleware Management', () => {
    it('should add middleware', () => {
      const middleware = new TestMiddleware('test');
      pipeline.use(middleware);

      expect(pipeline.hasMiddleware('test')).toBe(true);
      expect(pipeline.getMiddleware('test')).toBe(middleware);
      expect(pipeline.length).toBe(1);
    });

    it('should throw error for duplicate middleware names', () => {
      const middleware1 = new TestMiddleware('test');
      const middleware2 = new TestMiddleware('test');

      pipeline.use(middleware1);

      expect(() => {
        pipeline.use(middleware2);
      }).toThrow("Middleware 'test' is already registered");
    });

    it('should remove middleware', () => {
      const middleware = new TestMiddleware('test');
      pipeline.use(middleware);

      const removed = pipeline.remove('test');

      expect(removed).toBe(true);
      expect(pipeline.hasMiddleware('test')).toBe(false);
      expect(pipeline.length).toBe(0);
    });

    it('should return false when removing non-existent middleware', () => {
      const removed = pipeline.remove('nonexistent');
      expect(removed).toBe(false);
    });

    it('should get all middleware names', () => {
      pipeline.use(new TestMiddleware('first'));
      pipeline.use(new TestMiddleware('second'));

      const names = pipeline.getMiddlewareNames();

      expect(names).toEqual(['first', 'second']);
    });

    it('should clear all middleware', () => {
      pipeline.use(new TestMiddleware('first'));
      pipeline.use(new TestMiddleware('second'));

      pipeline.clear();

      expect(pipeline.length).toBe(0);
      expect(pipeline.getMiddlewareNames()).toEqual([]);
    });
  });

  describe('Pipeline Execution', () => {
    it('should execute middleware in order', async () => {
      const executionOrder: string[] = [];

      pipeline.use(new TestMiddleware('first', {
        action: (context) => {
          executionOrder.push('first');
          (context as any).firstExecuted = true;
        }
      }));

      pipeline.use(new TestMiddleware('second', {
        action: (context) => {
          executionOrder.push('second');
          (context as any).secondExecuted = true;
        }
      }));

      await pipeline.execute(mockContext);

      expect(executionOrder).toEqual(['first', 'second']);
      expect((mockContext as any).firstExecuted).toBe(true);
      expect((mockContext as any).secondExecuted).toBe(true);
    });

    it('should handle empty pipeline', async () => {
      const listener = jest.fn();
      pipeline.on('pipeline.completed', listener);

      await pipeline.execute(mockContext);

      expect(listener).toHaveBeenCalledWith({
        context: mockContext,
        duration: expect.any(Number)
      });
    });

    it('should pass context and next function to middleware', async () => {
      let contextPassed: PipelineContext | undefined;
      let nextCalled = false;

      pipeline.use(new TestMiddleware('test', {
        action: (context) => {
          contextPassed = context;
        }
      }));

      pipeline.use({
        name: 'next-checker',
        async execute(context: PipelineContext, next: () => Promise<void>) {
          nextCalled = true;
          await next();
        }
      });

      await pipeline.execute(mockContext);

      expect(contextPassed).toBe(mockContext);
      expect(nextCalled).toBe(true);
    });

    it('should stop execution on middleware error', async () => {
      const executionOrder: string[] = [];

      pipeline.use(new TestMiddleware('first', {
        action: () => executionOrder.push('first')
      }));

      pipeline.use(new TestMiddleware('error', {
        shouldError: true,
        action: () => executionOrder.push('error')
      }));

      pipeline.use(new TestMiddleware('second', {
        action: () => executionOrder.push('second')
      }));

      await expect(pipeline.execute(mockContext)).rejects.toThrow('error error');

      expect(executionOrder).toEqual(['first', 'error']);
      expect(executionOrder).not.toContain('second');
    });
  });

  describe('Event Emission', () => {
    it('should emit pipeline lifecycle events', async () => {
      const startedListener = jest.fn();
      const completedListener = jest.fn();

      pipeline.on('pipeline.started', startedListener);
      pipeline.on('pipeline.completed', completedListener);

      await pipeline.execute(mockContext);

      expect(startedListener).toHaveBeenCalledWith({ context: mockContext });
      expect(completedListener).toHaveBeenCalledWith({
        context: mockContext,
        duration: expect.any(Number)
      });
    });

    it('should emit middleware lifecycle events', async () => {
      const middlewareStartedListener = jest.fn();
      const middlewareCompletedListener = jest.fn();

      pipeline.on('middleware.started', middlewareStartedListener);
      pipeline.on('middleware.completed', middlewareCompletedListener);

      const middleware = new TestMiddleware('test');
      pipeline.use(middleware);

      await pipeline.execute(mockContext);

      expect(middlewareStartedListener).toHaveBeenCalledWith({
        middleware,
        context: mockContext
      });
      expect(middlewareCompletedListener).toHaveBeenCalledWith({
        middleware,
        context: mockContext,
        duration: expect.any(Number)
      });
    });

    it('should emit error events on pipeline failure', async () => {
      const errorListener = jest.fn();
      pipeline.on('pipeline.error', errorListener);

      pipeline.use(new TestMiddleware('test', { shouldError: true }));

      await expect(pipeline.execute(mockContext)).rejects.toThrow();

      expect(errorListener).toHaveBeenCalledWith({
        context: mockContext,
        error: expect.any(Error),
        duration: expect.any(Number)
      });
    });

    it('should emit error events on middleware failure', async () => {
      const errorListener = jest.fn();
      pipeline.on('middleware.error', errorListener);

      const middleware = new TestMiddleware('test', { shouldError: true });
      pipeline.use(middleware);

      await expect(pipeline.execute(mockContext)).rejects.toThrow();

      expect(errorListener).toHaveBeenCalledWith({
        middleware,
        context: mockContext,
        error: expect.any(Error),
        duration: expect.any(Number)
      });
    });
  });

  describe('Error Handling', () => {
    it('should execute error handlers on pipeline error', async () => {
      const errorHandler = jest.fn();
      pipeline.onError(errorHandler);

      pipeline.use(new TestMiddleware('test', { shouldError: true }));

      await expect(pipeline.execute(mockContext)).rejects.toThrow();

      expect(errorHandler).toHaveBeenCalledWith(
        expect.any(Error),
        mockContext
      );
    });

    it('should continue trying error handlers even if one fails', async () => {
      const workingHandler = jest.fn();
      const failingHandler = jest.fn().mockRejectedValue(new Error('Handler failed'));

      pipeline.onError(failingHandler);
      pipeline.onError(workingHandler);

      pipeline.use(new TestMiddleware('test', { shouldError: true }));

      await expect(pipeline.execute(mockContext)).rejects.toThrow();

      expect(failingHandler).toHaveBeenCalled();
      expect(workingHandler).toHaveBeenCalled();
    });
  });

  describe('Built-in Middleware', () => {
    describe('RequestLoggerMiddleware', () => {
      it('should log request and response', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const middleware = new RequestLoggerMiddleware();
        pipeline.use(middleware);

        await pipeline.execute(mockContext);

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('GET /test')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Response 200')
        );

        consoleSpy.mockRestore();
      });
    });

    describe('CorsMiddleware', () => {
      it('should set default CORS headers', async () => {
        const middleware = new CorsMiddleware();
        pipeline.use(middleware);

        await pipeline.execute(mockContext);

        expect(mockContext.response.headers['Access-Control-Allow-Origin']).toBe('*');
        expect(mockContext.response.headers['Access-Control-Allow-Methods']).toContain('GET');
        expect(mockContext.response.headers['Access-Control-Allow-Headers']).toContain('Content-Type');
      });

      it('should handle preflight OPTIONS requests', async () => {
        mockContext.request.method = 'OPTIONS';
        const middleware = new CorsMiddleware();
        pipeline.use(middleware);

        await pipeline.execute(mockContext);

        expect(mockContext.response.statusCode).toBe(204);
      });

      it('should respect custom CORS options', async () => {
        const middleware = new CorsMiddleware({
          origins: ['https://example.com'],
          methods: ['POST'],
          credentials: true
        });

        mockContext.request.headers = { origin: 'https://example.com' };
        pipeline.use(middleware);

        await pipeline.execute(mockContext);

        expect(mockContext.response.headers['Access-Control-Allow-Origin']).toBe('https://example.com');
        expect(mockContext.response.headers['Access-Control-Allow-Methods']).toBe('POST');
        expect(mockContext.response.headers['Access-Control-Allow-Credentials']).toBe('true');
      });
    });

    describe('ErrorHandlingMiddleware', () => {
      it('should set error response on middleware error', async () => {
        const middleware = new ErrorHandlingMiddleware();
        pipeline.use(middleware);
        pipeline.use(new TestMiddleware('test', { shouldError: true }));

        await pipeline.execute(mockContext);

        expect(mockContext.response.statusCode).toBe(500);
        expect((mockContext.response.data as any).error).toBe(true);
        expect((mockContext.response.data as any).message).toBe('test error');
      });

      it('should include stack trace in development', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const middleware = new ErrorHandlingMiddleware();
        pipeline.use(middleware);
        pipeline.use(new TestMiddleware('test', { shouldError: true }));

        await pipeline.execute(mockContext);

        expect((mockContext.response.data as any).stack).toBeDefined();

        process.env.NODE_ENV = originalEnv;
      });

      it('should not expose stack trace in production', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const middleware = new ErrorHandlingMiddleware();
        pipeline.use(middleware);
        pipeline.use(new TestMiddleware('test', { shouldError: true }));

        await pipeline.execute(mockContext);

        expect((mockContext.response.data as any).stack).toBeUndefined();

        process.env.NODE_ENV = originalEnv;
      });
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle complex middleware chains', async () => {
      const results: string[] = [];

      pipeline.use(new TestMiddleware('auth', {
        action: (context) => {
          (context as any).user = { id: 123 };
          results.push('auth');
        }
      }));

      pipeline.use(new TestMiddleware('validation', {
        action: (context) => {
          if (!(context as any).user) {
            throw new Error('Unauthorized');
          }
          results.push('validation');
        }
      }));

      pipeline.use(new TestMiddleware('business-logic', {
        action: (context) => {
          (context.response.data as any) = { message: 'Success' };
          results.push('business-logic');
        }
      }));

      await pipeline.execute(mockContext);

      expect(results).toEqual(['auth', 'validation', 'business-logic']);
      expect((mockContext as any).user).toEqual({ id: 123 });
      expect(mockContext.response.data).toEqual({ message: 'Success' });
    });

    it('should handle async middleware operations', async () => {
      pipeline.use({
        name: 'async-middleware',
        async execute(context: PipelineContext, next: () => Promise<void>) {
          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 10));
          (context as any).asyncData = 'async-result';
          await next();
        }
      });

      pipeline.use({
        name: 'check-async',
        async execute(context: PipelineContext, next: () => Promise<void>) {
          expect((context as any).asyncData).toBe('async-result');
          await next();
        }
      });

      await pipeline.execute(mockContext);

      expect((mockContext as any).asyncData).toBe('async-result');
    });
  });
});