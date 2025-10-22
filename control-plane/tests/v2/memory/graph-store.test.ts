/**
 * Graph Store Unit Tests
 * Tests for in-memory knowledge graph with relationship traversal
 */

import { GraphStore, GraphNode, GraphEdge, GraphPath } from '../../../src/core/memory/graph-store';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('GraphStore', () => {
  let graphStore: GraphStore;

  beforeEach(() => {
    graphStore = new GraphStore();
  });

  describe('Node Operations', () => {
    it('should add a new node', () => {
      const node: GraphNode = {
        id: 'node-1',
        type: 'user',
        properties: { name: 'Test User', role: 'admin' },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      graphStore.addNode(node);
      const retrieved = graphStore.getNode('node-1');

      expect(retrieved).toBeTruthy();
      expect(retrieved?.type).toBe('user');
      expect(retrieved?.properties.name).toBe('Test User');
    });

    it('should update existing node properties', () => {
      const node: GraphNode = {
        id: 'node-update',
        type: 'project',
        properties: { name: 'Project A', status: 'active' },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      graphStore.addNode(node);

      const updatedNode: GraphNode = {
        id: 'node-update',
        type: 'project',
        properties: { status: 'completed', priority: 'high' },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      graphStore.addNode(updatedNode);
      const retrieved = graphStore.getNode('node-update');

      expect(retrieved?.properties.status).toBe('completed');
      expect(retrieved?.properties.priority).toBe('high');
    });

    it('should get node by ID', () => {
      const node: GraphNode = {
        id: 'get-test',
        type: 'task',
        properties: { title: 'Test Task' },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      graphStore.addNode(node);
      const retrieved = graphStore.getNode('get-test');

      expect(retrieved).toEqual(expect.objectContaining({
        id: 'get-test',
        type: 'task'
      }));
    });

    it('should return undefined for non-existent node', () => {
      const result = graphStore.getNode('non-existent');
      expect(result).toBeUndefined();
    });

    it('should query nodes by type', () => {
      graphStore.addNode({
        id: 'user-1',
        type: 'user',
        properties: { name: 'User 1' },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      graphStore.addNode({
        id: 'user-2',
        type: 'user',
        properties: { name: 'User 2' },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      graphStore.addNode({
        id: 'project-1',
        type: 'project',
        properties: { name: 'Project 1' },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const users = graphStore.queryByType('user');
      expect(users).toHaveLength(2);
      expect(users.every(n => n.type === 'user')).toBe(true);
    });

    it('should query nodes by properties', () => {
      graphStore.addNode({
        id: 'task-1',
        type: 'task',
        properties: { status: 'completed', priority: 'high' },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      graphStore.addNode({
        id: 'task-2',
        type: 'task',
        properties: { status: 'pending', priority: 'high' },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      graphStore.addNode({
        id: 'task-3',
        type: 'task',
        properties: { status: 'completed', priority: 'low' },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const highPriorityCompleted = graphStore.queryByProperties({
        status: 'completed',
        priority: 'high'
      });

      expect(highPriorityCompleted).toHaveLength(1);
      expect(highPriorityCompleted[0].id).toBe('task-1');
    });
  });

  describe('Edge Operations', () => {
    beforeEach(() => {
      // Add test nodes
      graphStore.addNode({
        id: 'node-A',
        type: 'user',
        properties: { name: 'Alice' },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      graphStore.addNode({
        id: 'node-B',
        type: 'project',
        properties: { name: 'Project X' },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      graphStore.addNode({
        id: 'node-C',
        type: 'task',
        properties: { title: 'Task 1' },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    it('should add an edge between existing nodes', () => {
      const edge: GraphEdge = {
        from: 'node-A',
        to: 'node-B',
        type: 'created',
        createdAt: new Date()
      };

      graphStore.addEdge(edge);
      const edges = graphStore.getEdges('node-A');

      expect(edges).toHaveLength(1);
      expect(edges[0].type).toBe('created');
    });

    it('should not add edge if source node does not exist', () => {
      const edge: GraphEdge = {
        from: 'non-existent',
        to: 'node-B',
        type: 'created',
        createdAt: new Date()
      };

      graphStore.addEdge(edge);
      const edges = graphStore.getEdges('non-existent');

      expect(edges).toHaveLength(0);
    });

    it('should not add edge if target node does not exist', () => {
      const edge: GraphEdge = {
        from: 'node-A',
        to: 'non-existent',
        type: 'created',
        createdAt: new Date()
      };

      graphStore.addEdge(edge);
      const edges = graphStore.getEdges('node-A');

      expect(edges).toHaveLength(0);
    });

    it('should get outgoing edges', () => {
      graphStore.addEdge({ from: 'node-A', to: 'node-B', type: 'created', createdAt: new Date() });
      graphStore.addEdge({ from: 'node-B', to: 'node-A', type: 'assigned-to', createdAt: new Date() });

      const outgoing = graphStore.getEdges('node-A', 'outgoing');

      expect(outgoing).toHaveLength(1);
      expect(outgoing[0].from).toBe('node-A');
    });

    it('should get incoming edges', () => {
      graphStore.addEdge({ from: 'node-A', to: 'node-B', type: 'created', createdAt: new Date() });
      graphStore.addEdge({ from: 'node-C', to: 'node-B', type: 'depends-on', createdAt: new Date() });

      const incoming = graphStore.getEdges('node-B', 'incoming');

      expect(incoming).toHaveLength(2);
      expect(incoming.every(e => e.to === 'node-B')).toBe(true);
    });

    it('should get both incoming and outgoing edges', () => {
      graphStore.addEdge({ from: 'node-A', to: 'node-B', type: 'created', createdAt: new Date() });
      graphStore.addEdge({ from: 'node-B', to: 'node-C', type: 'depends-on', createdAt: new Date() });

      const allEdges = graphStore.getEdges('node-B', 'both');

      expect(allEdges).toHaveLength(2);
    });
  });

  describe('Relationship Traversal', () => {
    beforeEach(() => {
      // Create a small graph: A -> B -> C -> D
      ['A', 'B', 'C', 'D', 'E'].forEach(id => {
        graphStore.addNode({
          id: `node-${id}`,
          type: 'task',
          properties: { name: `Node ${id}` },
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });

      graphStore.addEdge({ from: 'node-A', to: 'node-B', type: 'depends-on', createdAt: new Date() });
      graphStore.addEdge({ from: 'node-B', to: 'node-C', type: 'depends-on', createdAt: new Date() });
      graphStore.addEdge({ from: 'node-C', to: 'node-D', type: 'depends-on', createdAt: new Date() });
      graphStore.addEdge({ from: 'node-A', to: 'node-E', type: 'related-to', createdAt: new Date() });
    });

    it('should find related nodes at depth 1', () => {
      const related = graphStore.findRelated('node-A', undefined, 1);

      expect(related.length).toBeGreaterThan(0);
      expect(related.some(n => n.id === 'node-B')).toBe(true);
      expect(related.some(n => n.id === 'node-E')).toBe(true);
    });

    it('should find related nodes at depth 2', () => {
      const related = graphStore.findRelated('node-A', undefined, 2);

      expect(related.some(n => n.id === 'node-C')).toBe(true);
    });

    it('should filter related nodes by edge type', () => {
      const related = graphStore.findRelated('node-A', 'depends-on', 2);

      expect(related.every(n => n.id !== 'node-E')).toBe(true); // E is related-to, not depends-on
    });

    it('should not include the starting node in results', () => {
      const related = graphStore.findRelated('node-A', undefined, 3);

      expect(related.every(n => n.id !== 'node-A')).toBe(true);
    });
  });

  describe('Path Finding', () => {
    beforeEach(() => {
      // Create graph: A -> B -> C
      //                |         ^
      //                v         |
      //                D -> E -> F
      ['A', 'B', 'C', 'D', 'E', 'F'].forEach(id => {
        graphStore.addNode({
          id: `node-${id}`,
          type: 'task',
          properties: { name: `Node ${id}` },
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });

      graphStore.addEdge({ from: 'node-A', to: 'node-B', type: 'link', createdAt: new Date() });
      graphStore.addEdge({ from: 'node-B', to: 'node-C', type: 'link', createdAt: new Date() });
      graphStore.addEdge({ from: 'node-A', to: 'node-D', type: 'link', createdAt: new Date() });
      graphStore.addEdge({ from: 'node-D', to: 'node-E', type: 'link', createdAt: new Date() });
      graphStore.addEdge({ from: 'node-E', to: 'node-F', type: 'link', createdAt: new Date() });
      graphStore.addEdge({ from: 'node-F', to: 'node-C', type: 'link', createdAt: new Date() });
    });

    it('should find shortest path between two nodes', () => {
      const path = graphStore.getPath('node-A', 'node-C');

      expect(path).toBeTruthy();
      expect(path?.nodes).toHaveLength(3); // A -> B -> C
      expect(path?.length).toBe(2);
    });

    it('should return path with single node when from === to', () => {
      const path = graphStore.getPath('node-A', 'node-A');

      expect(path).toBeTruthy();
      expect(path?.nodes).toHaveLength(1);
      expect(path?.length).toBe(0);
    });

    it('should return null when no path exists', () => {
      graphStore.addNode({
        id: 'isolated',
        type: 'task',
        properties: {},
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const path = graphStore.getPath('node-A', 'isolated');
      expect(path).toBeNull();
    });

    it('should return null for non-existent nodes', () => {
      const path = graphStore.getPath('node-A', 'non-existent');
      expect(path).toBeNull();
    });

    it('should find all paths up to max depth', () => {
      const paths = graphStore.getAllPaths('node-A', 'node-C', 3);

      expect(paths.length).toBeGreaterThan(0);
      // Should have at least 2 paths: A->B->C and A->D->E->F->C
      expect(paths.length).toBeGreaterThanOrEqual(1);
    });

    it('should respect max depth in getAllPaths', () => {
      const paths = graphStore.getAllPaths('node-A', 'node-C', 1);

      // With maxDepth=1, can't reach C from A
      expect(paths).toHaveLength(0);
    });
  });

  describe('Node and Edge Deletion', () => {
    beforeEach(() => {
      graphStore.addNode({ id: 'del-1', type: 'task', properties: {}, createdAt: new Date(), updatedAt: new Date() });
      graphStore.addNode({ id: 'del-2', type: 'task', properties: {}, createdAt: new Date(), updatedAt: new Date() });
      graphStore.addNode({ id: 'del-3', type: 'task', properties: {}, createdAt: new Date(), updatedAt: new Date() });

      graphStore.addEdge({ from: 'del-1', to: 'del-2', type: 'link', createdAt: new Date() });
      graphStore.addEdge({ from: 'del-2', to: 'del-3', type: 'link', createdAt: new Date() });
    });

    it('should delete a node and its connected edges', () => {
      graphStore.deleteNode('del-2');

      expect(graphStore.getNode('del-2')).toBeUndefined();
      expect(graphStore.getEdges('del-1')).toHaveLength(0);
    });

    it('should delete a specific edge', () => {
      graphStore.deleteEdge('del-1', 'del-2', 'link');

      const edges = graphStore.getEdges('del-1');
      expect(edges).toHaveLength(0);
    });

    it('should only delete specified edge type', () => {
      graphStore.addEdge({ from: 'del-1', to: 'del-2', type: 'other', createdAt: new Date() });
      graphStore.deleteEdge('del-1', 'del-2', 'link');

      const edges = graphStore.getEdges('del-1');
      expect(edges).toHaveLength(1);
      expect(edges[0].type).toBe('other');
    });
  });

  describe('Graph Statistics', () => {
    it('should get accurate graph stats', () => {
      graphStore.addNode({ id: '1', type: 'user', properties: {}, createdAt: new Date(), updatedAt: new Date() });
      graphStore.addNode({ id: '2', type: 'project', properties: {}, createdAt: new Date(), updatedAt: new Date() });
      graphStore.addNode({ id: '3', type: 'task', properties: {}, createdAt: new Date(), updatedAt: new Date() });

      graphStore.addEdge({ from: '1', to: '2', type: 'created', createdAt: new Date() });
      graphStore.addEdge({ from: '2', to: '3', type: 'contains', createdAt: new Date() });

      const stats = graphStore.getStats();

      expect(stats.nodes).toBe(3);
      expect(stats.edges).toBe(2);
      expect(stats.nodeTypes).toEqual({ user: 1, project: 1, task: 1 });
      expect(stats.edgeTypes).toEqual({ created: 1, contains: 1 });
      expect(stats.avgDegree).toBeGreaterThan(0);
    });

    it('should handle empty graph', () => {
      const stats = graphStore.getStats();

      expect(stats.nodes).toBe(0);
      expect(stats.edges).toBe(0);
      expect(stats.avgDegree).toBe(0);
    });
  });

  describe('Import/Export', () => {
    it('should export graph data', () => {
      graphStore.addNode({ id: 'exp-1', type: 'user', properties: {}, createdAt: new Date(), updatedAt: new Date() });
      graphStore.addNode({ id: 'exp-2', type: 'task', properties: {}, createdAt: new Date(), updatedAt: new Date() });
      graphStore.addEdge({ from: 'exp-1', to: 'exp-2', type: 'created', createdAt: new Date() });

      const exported = graphStore.export();

      expect(exported.nodes).toHaveLength(2);
      expect(exported.edges).toHaveLength(1);
    });

    it('should import graph data', () => {
      const data = {
        nodes: [
          { id: 'imp-1', type: 'user' as const, properties: { name: 'Test' }, createdAt: new Date(), updatedAt: new Date() }
        ],
        edges: [
          { from: 'imp-1', to: 'imp-1', type: 'self-link', createdAt: new Date() }
        ]
      };

      graphStore.import(data);

      expect(graphStore.getNode('imp-1')).toBeTruthy();
    });

    it('should clear existing data when importing', () => {
      graphStore.addNode({ id: 'old', type: 'task', properties: {}, createdAt: new Date(), updatedAt: new Date() });

      const data = {
        nodes: [{ id: 'new', type: 'user' as const, properties: {}, createdAt: new Date(), updatedAt: new Date() }],
        edges: []
      };

      graphStore.import(data);

      expect(graphStore.getNode('old')).toBeUndefined();
      expect(graphStore.getNode('new')).toBeTruthy();
    });
  });

  describe('Clear Operation', () => {
    it('should clear all graph data', () => {
      graphStore.addNode({ id: 'clear-1', type: 'task', properties: {}, createdAt: new Date(), updatedAt: new Date() });
      graphStore.addEdge({ from: 'clear-1', to: 'clear-1', type: 'link', createdAt: new Date() });

      graphStore.clear();

      const stats = graphStore.getStats();
      expect(stats.nodes).toBe(0);
      expect(stats.edges).toBe(0);
    });
  });

  describe('Subgraph Extraction', () => {
    beforeEach(() => {
      // Create star topology: Center connected to 4 nodes, each connected to 2 more
      graphStore.addNode({ id: 'center', type: 'task', properties: {}, createdAt: new Date(), updatedAt: new Date() });

      for (let i = 1; i <= 4; i++) {
        graphStore.addNode({ id: `l1-${i}`, type: 'task', properties: {}, createdAt: new Date(), updatedAt: new Date() });
        graphStore.addEdge({ from: 'center', to: `l1-${i}`, type: 'link', createdAt: new Date() });

        for (let j = 1; j <= 2; j++) {
          graphStore.addNode({ id: `l2-${i}-${j}`, type: 'task', properties: {}, createdAt: new Date(), updatedAt: new Date() });
          graphStore.addEdge({ from: `l1-${i}`, to: `l2-${i}-${j}`, type: 'link', createdAt: new Date() });
        }
      }
    });

    it('should extract subgraph with radius 1', () => {
      const subgraph = graphStore.getSubgraph('center', 1);

      expect(subgraph.nodes).toHaveLength(5); // center + 4 level-1 nodes
      expect(subgraph.nodes.some(n => n.id === 'center')).toBe(true);
    });

    it('should extract subgraph with radius 2', () => {
      const subgraph = graphStore.getSubgraph('center', 2);

      expect(subgraph.nodes.length).toBeGreaterThan(5); // Should include level-2 nodes
      expect(subgraph.nodes.some(n => n.id.startsWith('l2-'))).toBe(true);
    });

    it('should include only edges between subgraph nodes', () => {
      const subgraph = graphStore.getSubgraph('center', 1);

      expect(subgraph.edges.every(e =>
        subgraph.nodes.some(n => n.id === e.from) &&
        subgraph.nodes.some(n => n.id === e.to)
      )).toBe(true);
    });
  });
});
