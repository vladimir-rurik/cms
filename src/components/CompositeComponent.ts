import { BaseComponent } from './BaseComponent';
import {
  IComponent,
  ComponentMetadata,
  RenderContext,
  RenderResult,
  ValidationResult,
  ComponentPosition
} from '../interfaces';

interface ChildComponent {
  component: IComponent;
  position: ComponentPosition;
  id: string;
}

export class CompositeComponent extends BaseComponent {
  private children = new Map<string, ChildComponent>();
  private zones = new Map<string, ChildComponent[]>();

  constructor(metadata: ComponentMetadata) {
    super(metadata);
  }

  /**
   * Add a child component
   */
  addChild(
    id: string,
    component: IComponent,
    position: ComponentPosition = { zone: 'default', order: 0 }
  ): void {
    if (this.children.has(id)) {
      throw new Error(`Child component with id '${id}' already exists`);
    }

    const childComponent: ChildComponent = {
      component,
      position,
      id
    };

    this.children.set(id, childComponent);

    // Add to zone
    if (!this.zones.has(position.zone)) {
      this.zones.set(position.zone, []);
    }
    this.zones.get(position.zone)!.push(childComponent);

    // Sort zone by order
    this.zones.get(position.zone)!.sort((a, b) => a.position.order - b.position.order);

    this.emit('child.added', { id, component, position });
  }

  /**
   * Remove a child component
   */
  removeChild(id: string): boolean {
    const child = this.children.get(id);
    if (!child) {
      return false;
    }

    // Remove from zone
    const zoneChildren = this.zones.get(child.position.zone);
    if (zoneChildren) {
      const index = zoneChildren.findIndex(c => c.id === id);
      if (index !== -1) {
        zoneChildren.splice(index, 1);
      }

      // Clean up empty zones
      if (zoneChildren.length === 0) {
        this.zones.delete(child.position.zone);
      }
    }

    // Remove from children
    this.children.delete(id);

    this.emit('child.removed', { id, component: child.component });
    return true;
  }

  /**
   * Get a child component
   */
  getChild(id: string): IComponent | undefined {
    const child = this.children.get(id);
    return child?.component;
  }

  /**
   * Get all child components
   */
  getChildren(): Map<string, IComponent> {
    const result = new Map<string, IComponent>();
    for (const [id, child] of this.children) {
      result.set(id, child.component);
    }
    return result;
  }

  /**
   * Get children in a specific zone
   */
  getChildrenInZone(zone: string): IComponent[] {
    const zoneChildren = this.zones.get(zone);
    return zoneChildren ? zoneChildren.map(child => child.component) : [];
  }

  /**
   * Get all zones
   */
  getZones(): string[] {
    return Array.from(this.zones.keys());
  }

  /**
   * Get zone information
   */
  getZoneInfo(): Record<string, { count: number; components: string[] }> {
    const info: Record<string, { count: number; components: string[] }> = {};

    for (const [zoneName, children] of this.zones) {
      info[zoneName] = {
        count: children.length,
        components: children.map(child => child.id)
      };
    }

    return info;
  }

  /**
   * Reorder a child component
   */
  reorderChild(id: string, newOrder: number): boolean {
    const child = this.children.get(id);
    if (!child) {
      return false;
    }

    const oldOrder = child.position.order;
    child.position.order = newOrder;

    // Re-sort the zone
    const zoneChildren = this.zones.get(child.position.zone);
    if (zoneChildren) {
      zoneChildren.sort((a, b) => a.position.order - b.position.order);
    }

    this.emit('child.reordered', { id, oldOrder, newOrder });
    return true;
  }

  /**
   * Move a child to a different zone
   */
  moveChildToZone(id: string, newZone: string, newOrder?: number): boolean {
    const child = this.children.get(id);
    if (!child) {
      return false;
    }

    const oldZone = child.position.zone;
    const oldOrder = child.position.order;

    // Remove from old zone
    const oldZoneChildren = this.zones.get(oldZone);
    if (oldZoneChildren) {
      const index = oldZoneChildren.findIndex(c => c.id === id);
      if (index !== -1) {
        oldZoneChildren.splice(index, 1);
      }

      // Clean up empty zones
      if (oldZoneChildren.length === 0) {
        this.zones.delete(oldZone);
      }
    }

    // Update child position
    child.position.zone = newZone;
    if (newOrder !== undefined) {
      child.position.order = newOrder;
    }

    // Add to new zone
    if (!this.zones.has(newZone)) {
      this.zones.set(newZone, []);
    }
    this.zones.get(newZone)!.push(child);

    // Sort new zone by order
    this.zones.get(newZone)!.sort((a, b) => a.position.order - b.position.order);

    this.emit('child.moved', { id, oldZone, newZone, oldOrder, newOrder: child.position.order });
    return true;
  }

  /**
   * Clear all children
   */
  clearChildren(): void {
    const childIds = Array.from(this.children.keys());
    for (const id of childIds) {
      this.removeChild(id);
    }
    this.emit('children.cleared', {});
  }

  /**
   * Validate composite component
   */
  override validate(): ValidationResult {
    const result = super.validate();
    const errors = [...result.errors];
    const warnings = [...result.warnings];

    // Validate all children
    for (const [id, child] of this.children) {
      const childValidation = child.component.validate();
      if (!childValidation.isValid) {
        errors.push(`Child component '${id}' is invalid: ${childValidation.errors.join(', ')}`);
      }
      warnings.push(...childValidation.warnings);
    }

    // Check for empty zones that might indicate configuration issues
    for (const [zoneName, children] of this.zones) {
      if (children.length === 0) {
        warnings.push(`Zone '${zoneName}' is empty`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Render all child components
   */
  async render(context: RenderContext): Promise<RenderResult> {
    const zoneResults: Record<string, string> = {};
    const allCSS: string[] = [];
    const allJS: string[] = [];

    // Render each zone in order
    for (const [zoneName, children] of this.zones) {
      const zoneHTML: string[] = [];

      for (const child of children) {
        try {
          const childResult = await child.component.render(context);
          zoneHTML.push(childResult.html);

          if (childResult.css) {
            allCSS.push(childResult.css);
          }
          if (childResult.js) {
            allJS.push(childResult.js);
          }
        } catch (error) {
          console.error(`Error rendering child component '${child.id}':`, error);
          zoneHTML.push(`<!-- Error rendering component ${child.id}: ${error} -->`);
        }
      }

      zoneResults[zoneName] = zoneHTML.join('\n');
    }

    // Generate composite HTML
    const html = this.generateCompositeHTML(zoneResults);

    return {
      html,
      css: allCSS.join('\n'),
      js: allJS.join('\n'),
      metadata: {
        zoneCount: this.zones.size,
        childCount: this.children.size,
        zones: this.getZoneInfo()
      }
    };
  }

  /**
   * Generate composite HTML - can be overridden
   */
  protected generateCompositeHTML(zoneResults: Record<string, string>): string {
    let html = `<div class="${this.generateClassName('composite')}" data-component="${this._metadata.name}">`;

    // Render zones in a predictable order
    const zoneNames = Array.from(this.zones.keys()).sort();
    for (const zoneName of zoneNames) {
      html += `\n  <div class="zone-${zoneName}" data-zone="${zoneName}">`;
      html += `\n${zoneResults[zoneName]}`;
      html += '\n  </div>';
    }

    html += '\n</div>';
    return html;
  }

  /**
   * Dispose of composite component and all children
   */
  override dispose(): void {
    // Dispose all children
    for (const [, child] of this.children) {
      if (typeof child.component.dispose === 'function') {
        child.component.dispose();
      }
    }

    this.children.clear();
    this.zones.clear();
    super.dispose();
  }
}