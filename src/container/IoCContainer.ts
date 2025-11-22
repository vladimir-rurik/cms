import { EventEmitter } from 'eventemitter3';
import {
  IIoCContainer,
  ServiceFactory,
  ServiceLifetime
} from '../interfaces';

// Service registration info
interface ServiceRegistration {
  factory: ServiceFactory;
  lifetime: ServiceLifetime;
  instance?: any;
  dependencies?: string[];
}

// Circular dependency detection
interface DependencyNode {
  name: string;
  dependencies: string[];
  visited: boolean;
  inStack: boolean;
}

export class IoCContainer extends EventEmitter implements IIoCContainer {
  private services = new Map<string, ServiceRegistration>();
  private scopedInstances = new Map<string, any>();
  private dependencyGraph = new Map<string, DependencyNode>();
  private resolutionStack = new Set<string>();

  /**
   * Register a service with the container
   */
  register<T>(name: string, factory: ServiceFactory<T>, lifetime: ServiceLifetime = ServiceLifetime.Transient): void {
    if (this.services.has(name)) {
      throw new Error(`Service '${name}' is already registered`);
    }

    // Extract dependencies from factory parameters
    const dependencies = this.extractDependencies(factory);

    this.services.set(name, {
      factory,
      lifetime,
      dependencies
    });

    // Update dependency graph
    this.updateDependencyGraph(name, dependencies);

    this.emit('service.registered', { name, lifetime });
  }

  /**
   * Register a singleton service
   */
  registerSingleton<T>(name: string, factory: ServiceFactory<T>): void {
    this.register(name, factory, ServiceLifetime.Singleton);
  }

  /**
   * Register a scoped service
   */
  registerScoped<T>(name: string, factory: ServiceFactory<T>): void {
    this.register(name, factory, ServiceLifetime.Scoped);
  }

  /**
   * Register a transient service
   */
  registerTransient<T>(name: string, factory: ServiceFactory<T>): void {
    this.register(name, factory, ServiceLifetime.Transient);
  }

  /**
   * Resolve a service from the container
   */
  resolve<T>(name: string): T {
    if (!this.services.has(name)) {
      throw new Error(`Service '${name}' is not registered`);
    }

    // Check for circular dependencies using resolution stack
    if (this.resolutionStack.has(name)) {
      const cycle = Array.from(this.resolutionStack).concat(name).join(' -> ');
      throw new Error(`Circular dependency detected: ${cycle}`);
    }

    const registration = this.services.get(name)!;

    switch (registration.lifetime) {
      case ServiceLifetime.Singleton:
        if (!registration.instance) {
          this.resolutionStack.add(name);
          registration.instance = this.createInstance(name, registration);
          this.resolutionStack.delete(name);
        }
        return registration.instance;

      case ServiceLifetime.Scoped:
        if (!this.scopedInstances.has(name)) {
          this.resolutionStack.add(name);
          this.scopedInstances.set(name, this.createInstance(name, registration));
          this.resolutionStack.delete(name);
        }
        return this.scopedInstances.get(name);

      case ServiceLifetime.Transient: {
        this.resolutionStack.add(name);
        const instance = this.createInstance(name, registration);
        this.resolutionStack.delete(name);
        return instance;
      }

      default:
        throw new Error(`Unknown service lifetime: ${registration.lifetime}`);
    }
  }

  /**
   * Check if a service is registered
   */
  isRegistered(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Dispose of the container and all services
   */
  dispose(): void {
    // Dispose singleton instances
    for (const [_name, registration] of this.services) {
      if (registration.instance && typeof registration.instance.dispose === 'function') {
        registration.instance.dispose();
      }
    }

    // Dispose scoped instances
    for (const [_name, instance] of this.scopedInstances) {
      if (typeof instance.dispose === 'function') {
        instance.dispose();
      }
    }

    this.services.clear();
    this.scopedInstances.clear();
    this.dependencyGraph.clear();
    this.removeAllListeners();
  }

  /**
   * Clear scoped instances (useful for web requests)
   */
  clearScope(): void {
    for (const [_name, instance] of this.scopedInstances) {
      if (typeof instance.dispose === 'function') {
        instance.dispose();
      }
    }
    this.scopedInstances.clear();
  }

  /**
   * Get all registered service names
   */
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Get service registration info
   */
  getServiceInfo(name: string): { lifetime: ServiceLifetime; dependencies?: string[] } | null {
    const registration = this.services.get(name);
    if (!registration) {
      return null;
    }

    return {
      lifetime: registration.lifetime,
      dependencies: registration.dependencies
    };
  }

  /**
   * Create an instance of a service
   */
  private createInstance(name: string, registration: ServiceRegistration): any {
    try {
      return registration.factory(this);
    } catch (error) {
      throw new Error(`Failed to create instance of service '${name}': ${error}`);
    }
  }

  /**
   * Extract dependencies from factory function
   */
  private extractDependencies(__factory: ServiceFactory): string[] {
    return []; // Simplified dependency extraction
  }

  /**
   * Update dependency graph
   */
  private updateDependencyGraph(name: string, dependencies: string[]): void {
    this.dependencyGraph.set(name, {
      name,
      dependencies,
      visited: false,
      inStack: false
    });
  }

  /**
   * Clear resolution stack (used for error recovery)
   */
  private clearResolutionStack(): void {
    this.resolutionStack.clear();
  }
}