import { IoCContainer } from '../container/IoCContainer';
import { ServiceLifetime } from '../interfaces';

// Test services
class TestService {
  constructor(public name: string = 'test') {}
}

class ServiceWithDependency {
  constructor(private container: IoCContainer) {}

  getDependency(): TestService {
    return this.container.resolve<TestService>('TestService');
  }
}

describe('IoCContainer', () => {
  let container: IoCContainer;

  beforeEach(() => {
    container = new IoCContainer();
  });

  afterEach(() => {
    container.dispose();
  });

  describe('Service Registration', () => {
    it('should register a transient service', () => {
      container.register('TestService', () => new TestService());
      expect(container.isRegistered('TestService')).toBe(true);
    });

    it('should register a singleton service', () => {
      container.registerSingleton('TestService', () => new TestService());
      expect(container.isRegistered('TestService')).toBe(true);
    });

    it('should register a scoped service', () => {
      container.registerScoped('TestService', () => new TestService());
      expect(container.isRegistered('TestService')).toBe(true);
    });

    it('should throw error when registering duplicate service', () => {
      container.register('TestService', () => new TestService());
      expect(() => {
        container.register('TestService', () => new TestService());
      }).toThrow("Service 'TestService' is already registered");
    });
  });

  describe('Service Resolution', () => {
    it('should resolve transient service - always new instance', () => {
      container.register('TestService', () => new TestService('transient'));

      const instance1 = container.resolve<TestService>('TestService');
      const instance2 = container.resolve<TestService>('TestService');

      expect(instance1).not.toBe(instance2);
      expect(instance1.name).toBe('transient');
      expect(instance2.name).toBe('transient');
    });

    it('should resolve singleton service - same instance', () => {
      container.registerSingleton('TestService', () => new TestService('singleton'));

      const instance1 = container.resolve<TestService>('TestService');
      const instance2 = container.resolve<TestService>('TestService');

      expect(instance1).toBe(instance2);
      expect(instance1.name).toBe('singleton');
    });

    it('should resolve scoped service - same instance within scope', () => {
      container.registerScoped('TestService', () => new TestService('scoped'));

      const instance1 = container.resolve<TestService>('TestService');
      const instance2 = container.resolve<TestService>('TestService');

      expect(instance1).toBe(instance2);
      expect(instance1.name).toBe('scoped');

      // Clear scope and get new instance
      container.clearScope();
      const instance3 = container.resolve<TestService>('TestService');

      expect(instance1).not.toBe(instance3);
    });

    it('should throw error when resolving unregistered service', () => {
      expect(() => {
        container.resolve('NonExistentService');
      }).toThrow("Service 'NonExistentService' is not registered");
    });

    it('should resolve service with dependency injection', () => {
      container.register('TestService', () => new TestService('dependency'));
      container.register('ServiceWithDependency', (c) => new ServiceWithDependency(c));

      const service = container.resolve<ServiceWithDependency>('ServiceWithDependency');
      const dependency = service.getDependency();

      expect(dependency).toBeInstanceOf(TestService);
      expect(dependency.name).toBe('dependency');
    });
  });

  describe('Dependency Injection', () => {
    it('should inject container into factory function', () => {
      container.register('TestService', (c) => {
        expect(c).toBe(container);
        return new TestService();
      });

      const instance = container.resolve<TestService>('TestService');
      expect(instance).toBeInstanceOf(TestService);
    });

    it('should handle nested dependencies', () => {
      interface DeepService {
        value: string;
      }

      container.register('DeepService', () => ({ value: 'deep' }));
      container.register('MiddleService', (c) => ({
        deep: (c.resolve('DeepService') as DeepService),
        value: 'middle'
      }));
      container.register('TopService', (c) => ({
        middle: (c.resolve('MiddleService') as any),
        value: 'top'
      }));

      const topService = container.resolve<any>('TopService');
      expect(topService.middle.deep.value).toBe('deep');
      expect(topService.middle.value).toBe('middle');
      expect(topService.value).toBe('top');
    });
  });

  describe('Circular Dependency Detection', () => {
    it('should detect simple circular dependency', () => {
      container.register('ServiceA', (c) => {
        c.resolve('ServiceB'); // Creates circular dependency
        return { name: 'A' };
      });
      container.register('ServiceB', (c) => {
        c.resolve('ServiceA'); // Creates circular dependency
        return { name: 'B' };
      });

      expect(() => {
        container.resolve('ServiceA');
      }).toThrow(/Circular dependency detected/);
    });

    it('should detect complex circular dependency', () => {
      container.register('ServiceA', (c) => {
        c.resolve('ServiceB');
        return { name: 'A' };
      });
      container.register('ServiceB', (c) => {
        c.resolve('ServiceC');
        return { name: 'B' };
      });
      container.register('ServiceC', (c) => {
        c.resolve('ServiceA'); // Completes the circle
        return { name: 'C' };
      });

      expect(() => {
        container.resolve('ServiceA');
      }).toThrow(/Circular dependency detected/);
    });

    it('should allow valid dependency chains', () => {
      container.register('ServiceA', (c) => {
        c.resolve('ServiceB');
        return { name: 'A' };
      });
      container.register('ServiceB', (c) => {
        c.resolve('ServiceC');
        return { name: 'B' };
      });
      container.register('ServiceC', () => {
        return { name: 'C' };
      });

      expect(() => {
        const serviceA = container.resolve('ServiceA') as any;
        expect(serviceA.name).toBe('A');
      }).not.toThrow();
    });
  });

  describe('Service Lifecycle', () => {
    it('should dispose singleton instances', () => {
      let disposeCalled = false;

      class DisposableService {
        dispose() {
          disposeCalled = true;
        }
      }

      container.registerSingleton('DisposableService', () => new DisposableService());
      const instance = container.resolve<DisposableService>('DisposableService');

      container.dispose();

      expect(disposeCalled).toBe(true);
    });

    it('should dispose scoped instances', () => {
      let disposeCalled = false;

      class DisposableService {
        dispose() {
          disposeCalled = true;
        }
      }

      container.registerScoped('DisposableService', () => new DisposableService());
      const instance = container.resolve<DisposableService>('DisposableService');

      container.clearScope();

      expect(disposeCalled).toBe(true);
    });

    it('should not call dispose on non-disposable services', () => {
      container.registerSingleton('TestService', () => new TestService());
      container.resolve<TestService>('TestService');

      expect(() => {
        container.dispose();
      }).not.toThrow();
    });
  });

  describe('Container Management', () => {
    it('should provide registered service names', () => {
      container.register('ServiceA', () => ({ name: 'A' }));
      container.register('ServiceB', () => ({ name: 'B' }));

      const services = container.getRegisteredServices();
      expect(services).toContain('ServiceA');
      expect(services).toContain('ServiceB');
      expect(services).toHaveLength(2);
    });

    it('should provide service information', () => {
      container.registerSingleton('TestService', () => new TestService());

      const info = container.getServiceInfo('TestService');
      expect(info).toEqual({
        lifetime: ServiceLifetime.Singleton,
        dependencies: []
      });
    });

    it('should return null for unregistered service info', () => {
      const info = container.getServiceInfo('NonExistent');
      expect(info).toBeNull();
    });
  });

  describe('Events', () => {
    it('should emit service.registered event', () => {
      const listener = jest.fn();
      container.on('service.registered', listener);

      container.register('TestService', () => new TestService());

      expect(listener).toHaveBeenCalledWith({
        name: 'TestService',
        lifetime: ServiceLifetime.Transient
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle factory function errors', () => {
      container.register('ErrorService', () => {
        throw new Error('Factory error');
      });

      expect(() => {
        container.resolve('ErrorService');
      }).toThrow("Failed to create instance of service 'ErrorService': Error: Factory error");
    });

    it('should handle async factory function errors', async () => {
      container.register('AsyncErrorService', () => {
        throw new Error('Async factory error');
      });

      expect(() => {
        container.resolve('AsyncErrorService');
      }).toThrow();
    });
  });
});