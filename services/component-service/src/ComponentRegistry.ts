import { EventEmitter } from 'eventemitter3';
import { ComponentMetadata, IComponent } from './types';

export class ComponentRegistry extends EventEmitter {
  private components = new Map<string, IComponent>();
  private componentClasses = new Map<string, new (metadata: ComponentMetadata) => IComponent>();
  private instances = new Map<string, IComponent>();

  registerComponent(
    name: string,
    componentClass: new (metadata: ComponentMetadata) => IComponent,
    metadata?: ComponentMetadata
  ): void {
    if (this.components.has(name)) {
      throw new Error(`Component '${name}' is already registered`);
    }

    this.componentClasses.set(name, componentClass);

    if (metadata) {
      const instance = new componentClass(metadata);
      this.components.set(name, instance);

      this.emit('component.registered', { name, componentClass, metadata });
    }
  }

  createComponent(name: string, configuration: Record<string, any>): IComponent {
    const componentClass = this.componentClasses.get(name);
    if (!componentClass) {
      throw new Error(`Component '${name}' not found`);
    }

    const metadata: ComponentMetadata = {
      name,
      category: 'custom',
      tags: [],
      configuration,
    };

    const instance = new componentClass(metadata);
    const instanceId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.instances.set(instanceId, instance);

    return instance;
  }

  getComponent(name: string): IComponent | undefined {
    return this.components.get(name);
  }

  getComponentClass(name: string): (new (metadata: ComponentMetadata) => IComponent) | undefined {
    return this.componentClasses.get(name);
  }

  getAllComponents(): Map<string, IComponent> {
    return new Map(this.components);
  }

  getComponentNames(): string[] {
    return Array.from(this.components.keys());
  }

  getInstance(instanceId: string): IComponent | undefined {
    return this.instances.get(instanceId);
  }

  disposeInstance(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (instance && typeof instance.dispose === 'function') {
      instance.dispose();
    }
    this.instances.delete(instanceId);
  }

  dispose(): void {
    // Dispose all instances
    for (const [instanceId, instance] of this.instances) {
      if (typeof instance.dispose === 'function') {
        instance.dispose();
      }
    }
    this.instances.clear();
    this.components.clear();
    this.componentClasses.clear();
    this.removeAllListeners();
  }
}