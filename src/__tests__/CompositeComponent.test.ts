import { CompositeComponent } from '../components/CompositeComponent';
import { BaseComponent } from '../components/BaseComponent';
import { ComponentMetadata, RenderContext } from '../interfaces';

// Mock component for testing
class MockComponent extends BaseComponent {
  constructor(private content: string) {
    super({
      name: 'MockComponent',
      category: 'test',
      tags: ['test'],
      configuration: { content }
    });
  }

  async render(context: RenderContext): Promise<any> {
    return {
      html: `<div class="mock">${this.content}</div>`,
      css: `.mock { color: red; }`,
      js: `console.log('mock rendered');`
    };
  }
}

describe('CompositeComponent', () => {
  let composite: CompositeComponent;
  let mockComponent1: MockComponent;
  let mockComponent2: MockComponent;

  beforeEach(() => {
    composite = new CompositeComponent({
      name: 'TestComposite',
      category: 'test',
      tags: ['composite'],
      configuration: {}
    });
    mockComponent1 = new MockComponent('Content 1');
    mockComponent2 = new MockComponent('Content 2');
  });

  describe('Child Management', () => {
    it('should add child components', () => {
      composite.addChild('child1', mockComponent1, { zone: 'main', order: 1 });

      expect(composite.getChild('child1')).toBe(mockComponent1);
      expect(composite.getChildren().size).toBe(1);
      expect(composite.getZones()).toContain('main');
    });

    it('should add child components with default position', () => {
      composite.addChild('child1', mockComponent1);

      expect(composite.getChild('child1')).toBe(mockComponent1);
      expect(composite.getChildrenInZone('default')).toHaveLength(1);
    });

    it('should throw error when adding duplicate child', () => {
      composite.addChild('child1', mockComponent1);

      expect(() => {
        composite.addChild('child1', mockComponent2);
      }).toThrow("Child component with id 'child1' already exists");
    });

    it('should remove child components', () => {
      composite.addChild('child1', mockComponent1, { zone: 'main', order: 1 });
      const removed = composite.removeChild('child1');

      expect(removed).toBe(true);
      expect(composite.getChild('child1')).toBeUndefined();
      expect(composite.getChildren().size).toBe(0);
      expect(composite.getZones()).not.toContain('main');
    });

    it('should return false when removing non-existent child', () => {
      const removed = composite.removeChild('nonexistent');
      expect(removed).toBe(false);
    });

    it('should clean up empty zones when removing last child', () => {
      composite.addChild('child1', mockComponent1, { zone: 'main', order: 1 });
      composite.removeChild('child1');

      expect(composite.getZones()).not.toContain('main');
      expect(composite.getChildrenInZone('main')).toHaveLength(0);
    });

    it('should get all children as map', () => {
      composite.addChild('child1', mockComponent1);
      composite.addChild('child2', mockComponent2);

      const children = composite.getChildren();
      expect(children.size).toBe(2);
      expect(children.get('child1')).toBe(mockComponent1);
      expect(children.get('child2')).toBe(mockComponent2);
    });

    it('should get children in specific zone', () => {
      composite.addChild('child1', mockComponent1, { zone: 'header', order: 1 });
      composite.addChild('child2', mockComponent2, { zone: 'main', order: 1 });

      const headerChildren = composite.getChildrenInZone('header');
      const mainChildren = composite.getChildrenInZone('main');

      expect(headerChildren).toHaveLength(1);
      expect(mainChildren).toHaveLength(1);
      expect(headerChildren[0]).toBe(mockComponent1);
      expect(mainChildren[0]).toBe(mockComponent2);
    });

    it('should return empty array for non-existent zone', () => {
      const children = composite.getChildrenInZone('nonexistent');
      expect(children).toHaveLength(0);
    });
  });

  describe('Zone Management', () => {
    it('should get all zones', () => {
      composite.addChild('child1', mockComponent1, { zone: 'header', order: 1 });
      composite.addChild('child2', mockComponent2, { zone: 'main', order: 1 });

      const zones = composite.getZones();
      expect(zones).toContain('header');
      expect(zones).toContain('main');
      expect(zones).toHaveLength(2);
    });

    it('should provide zone information', () => {
      composite.addChild('child1', mockComponent1, { zone: 'header', order: 1 });
      composite.addChild('child2', mockComponent2, { zone: 'header', order: 2 });
      composite.addChild('child3', new MockComponent('Content 3'), { zone: 'main', order: 1 });

      const zoneInfo = composite.getZoneInfo();

      expect(zoneInfo.header).toEqual({
        count: 2,
        components: ['child1', 'child2']
      });
      expect(zoneInfo.main).toEqual({
        count: 1,
        components: ['child3']
      });
    });
  });

  describe('Child Reordering', () => {
    it('should reorder child components', () => {
      composite.addChild('child1', mockComponent1, { zone: 'main', order: 1 });
      composite.addChild('child2', mockComponent2, { zone: 'main', order: 2 });

      const reordered = composite.reorderChild('child1', 3);

      expect(reordered).toBe(true);

      const children = composite.getChildrenInZone('main');
      expect(children[0]).toBe(mockComponent2); // Should now be first
      expect(children[1]).toBe(mockComponent1); // Should now be second
    });

    it('should return false when reordering non-existent child', () => {
      const reordered = composite.reorderChild('nonexistent', 1);
      expect(reordered).toBe(false);
    });
  });

  describe('Zone Moving', () => {
    it('should move child to different zone', () => {
      composite.addChild('child1', mockComponent1, { zone: 'header', order: 1 });

      const moved = composite.moveChildToZone('child1', 'main', 2);

      expect(moved).toBe(true);
      expect(composite.getChildrenInZone('header')).toHaveLength(0);
      expect(composite.getChildrenInZone('main')).toHaveLength(1);
      expect(composite.getZones()).toContain('main');
    });

    it('should move child to different zone with default order', () => {
      composite.addChild('child1', mockComponent1, { zone: 'header', order: 1 });

      const moved = composite.moveChildToZone('child1', 'main');

      expect(moved).toBe(true);
      expect(composite.getChildrenInZone('header')).toHaveLength(0);
      expect(composite.getChildrenInZone('main')).toHaveLength(1);
    });

    it('should return false when moving non-existent child', () => {
      const moved = composite.moveChildToZone('nonexistent', 'main');
      expect(moved).toBe(false);
    });

    it('should clean up old zone when moving last child', () => {
      composite.addChild('child1', mockComponent1, { zone: 'header', order: 1 });
      composite.moveChildToZone('child1', 'main');

      expect(composite.getZones()).not.toContain('header');
    });
  });

  describe('Clear Children', () => {
    it('should clear all children', () => {
      composite.addChild('child1', mockComponent1, { zone: 'main', order: 1 });
      composite.addChild('child2', mockComponent2, { zone: 'header', order: 1 });

      composite.clearChildren();

      expect(composite.getChildren().size).toBe(0);
      expect(composite.getZones()).toHaveLength(0);
      expect(composite.getChild('child1')).toBeUndefined();
      expect(composite.getChild('child2')).toBeUndefined();
    });
  });

  describe('Validation', () => {
    it('should validate composite with valid children', () => {
      composite.addChild('child1', mockComponent1);

      const result = composite.validate();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect validation errors from children', () => {
      class InvalidComponent extends BaseComponent {
        async render(): Promise<any> {
          return { html: '' };
        }

        public override validate(): any {
          return {
            isValid: false,
            errors: ['Child validation error'],
            warnings: []
          };
        }
      }

      const invalidComponent = new InvalidComponent({
        name: 'InvalidComponent',
        category: 'test',
        tags: [],
        configuration: {}
      });

      composite.addChild('invalid', invalidComponent);

      const result = composite.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Child component 'invalid' is invalid: Child validation error");
    });

    it('should warn about empty zones', () => {
      // Create a situation where a zone might be empty
      composite.addChild('child1', mockComponent1, { zone: 'main', order: 1 });

      // Manually create empty zone by accessing private method for testing
      (composite as any).zones.set('empty', []);

      const result = composite.validate();

      expect(result.warnings).toContain("Zone 'empty' is empty");
    });
  });

  describe('Rendering', () => {
    let renderContext: RenderContext;

    beforeEach(() => {
      renderContext = {
        services: {},
        request: { url: '/', method: 'GET' },
        response: { headers: {}, statusCode: 200 }
      };
    });

    it('should render composite with children', async () => {
      composite.addChild('child1', mockComponent1, { zone: 'main', order: 1 });
      composite.addChild('child2', mockComponent2, { zone: 'header', order: 1 });

      const result = await composite.render(renderContext);

      expect(result.html).toContain('<div class="testcomposite-');
      expect(result.html).toContain('data-zone="main"');
      expect(result.html).toContain('data-zone="header"');
      expect(result.html).toContain('Content 1');
      expect(result.html).toContain('Content 2');
      expect(result.css).toContain('.mock { color: red; }');
      expect(result.js).toContain('console.log');
      expect(result.metadata?.zoneCount).toBe(2);
      expect(result.metadata?.childCount).toBe(2);
    });

    it('should render children in correct order', async () => {
      composite.addChild('child1', mockComponent1, { zone: 'main', order: 2 });
      composite.addChild('child2', mockComponent2, { zone: 'main', order: 1 });

      const result = await composite.render(renderContext);

      // child2 should come before child1 due to order
      const htmlLines = result.html.split('\n');
      const content2Index = htmlLines.findIndex(line => line.includes('Content 2'));
      const content1Index = htmlLines.findIndex(line => line.includes('Content 1'));

      expect(content2Index).toBeLessThan(content1Index);
    });

    it('should handle rendering errors gracefully', async () => {
      class ErrorComponent extends BaseComponent {
        async render(): Promise<any> {
          throw new Error('Render error');
        }
      }

      const errorComponent = new ErrorComponent({
        name: 'ErrorComponent',
        category: 'test',
        tags: [],
        configuration: {}
      });

      composite.addChild('error', errorComponent);

      const result = await composite.render(renderContext);

      expect(result.html).toContain('<!-- Error rendering component error: Error: Render error -->');
    });

    it('should generate composite HTML with zones', async () => {
      composite.addChild('child1', mockComponent1, { zone: 'main', order: 1 });

      const result = await composite.render(renderContext);

      expect(result.html).toContain('class="testcomposite-');
      expect(result.html).toContain('data-component="TestComposite"');
      expect(result.html).toContain('class="zone-main"');
      expect(result.html).toContain('data-zone="main"');
    });
  });

  describe('Events', () => {
    it('should emit events when adding children', () => {
      const listener = jest.fn();
      composite.on('child.added', listener);

      composite.addChild('child1', mockComponent1, { zone: 'main', order: 1 });

      expect(listener).toHaveBeenCalledWith({
        id: 'child1',
        component: mockComponent1,
        position: { zone: 'main', order: 1 }
      });
    });

    it('should emit events when removing children', () => {
      const listener = jest.fn();
      composite.on('child.removed', listener);

      composite.addChild('child1', mockComponent1);
      composite.removeChild('child1');

      expect(listener).toHaveBeenCalledWith({
        id: 'child1',
        component: mockComponent1
      });
    });

    it('should emit events when reordering children', () => {
      const listener = jest.fn();
      composite.on('child.reordered', listener);

      composite.addChild('child1', mockComponent1, { zone: 'main', order: 1 });
      composite.reorderChild('child1', 2);

      expect(listener).toHaveBeenCalledWith({
        id: 'child1',
        oldOrder: 1,
        newOrder: 2
      });
    });

    it('should emit events when moving children', () => {
      const listener = jest.fn();
      composite.on('child.moved', listener);

      composite.addChild('child1', mockComponent1, { zone: 'header', order: 1 });
      composite.moveChildToZone('child1', 'main', 2);

      expect(listener).toHaveBeenCalledWith({
        id: 'child1',
        oldZone: 'header',
        newZone: 'main',
        oldOrder: 1,
        newOrder: 2
      });
    });

    it('should emit events when clearing children', () => {
      const listener = jest.fn();
      composite.on('children.cleared', listener);

      composite.addChild('child1', mockComponent1);
      composite.clearChildren();

      expect(listener).toHaveBeenCalledWith({});
    });
  });

  describe('Disposal', () => {
    it('should dispose children that have dispose method', () => {
      const disposableComponent = new MockComponent('test');
      const disposeSpy = jest.spyOn(disposableComponent, 'dispose');

      composite.addChild('child1', disposableComponent);
      composite.dispose();

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should not error when disposing children without dispose method', () => {
      class ComponentWithoutDispose extends BaseComponent {
        async render(): Promise<any> {
          return { html: 'test' };
        }
      }

      const component = new ComponentWithoutDispose({
        name: 'NoDispose',
        category: 'test',
        tags: [],
        configuration: {}
      });

      expect(() => {
        composite.addChild('child1', component);
        composite.dispose();
      }).not.toThrow();
    });

    it('should clean up internal state on disposal', () => {
      composite.addChild('child1', mockComponent1);
      composite.addChild('child2', mockComponent2);

      composite.dispose();

      expect(composite.getChildren().size).toBe(0);
      expect(composite.getZones()).toHaveLength(0);
      expect(composite.getChild('child1')).toBeUndefined();
    });
  });
});