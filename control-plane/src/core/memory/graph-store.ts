import { logger } from '../../utils/logger.js';

export interface GraphNode {
  id: string;
  type: 'user' | 'project' | 'session' | 'agent' | 'task' | 'decision' | 'conversation' | 'module';
  properties: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: string;  // 'created', 'executed', 'depends-on', 'related-to', 'caused-by', 'triggered-by'
  properties?: Record<string, any>;
  createdAt: Date;
}

export interface GraphPath {
  nodes: GraphNode[];
  edges: GraphEdge[];
  length: number;
}

export class GraphStore {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: GraphEdge[] = [];
  private edgeIndex: Map<string, GraphEdge[]> = new Map();  // nodeId -> edges

  /**
   * Add a node to the graph
   */
  addNode(node: GraphNode): void {
    const existing = this.nodes.get(node.id);

    if (existing) {
      // Update existing node
      existing.properties = { ...existing.properties, ...node.properties };
      existing.updatedAt = new Date();
      logger.debug(`[GraphStore] Updated node: ${node.id} (${node.type})`);
    } else {
      this.nodes.set(node.id, {
        ...node,
        createdAt: node.createdAt || new Date(),
        updatedAt: node.updatedAt || new Date()
      });
      logger.debug(`[GraphStore] Added node: ${node.id} (${node.type})`);
    }
  }

  /**
   * Add an edge between nodes
   */
  addEdge(edge: GraphEdge): void {
    // Validate that both nodes exist
    if (!this.nodes.has(edge.from)) {
      logger.warn(`[GraphStore] Source node not found: ${edge.from}`);
      return;
    }
    if (!this.nodes.has(edge.to)) {
      logger.warn(`[GraphStore] Target node not found: ${edge.to}`);
      return;
    }

    const edgeWithDate = {
      ...edge,
      createdAt: edge.createdAt || new Date()
    };

    this.edges.push(edgeWithDate);

    // Update index for both directions
    if (!this.edgeIndex.has(edge.from)) {
      this.edgeIndex.set(edge.from, []);
    }
    if (!this.edgeIndex.has(edge.to)) {
      this.edgeIndex.set(edge.to, []);
    }

    this.edgeIndex.get(edge.from)!.push(edgeWithDate);
    this.edgeIndex.get(edge.to)!.push(edgeWithDate);

    logger.debug(`[GraphStore] Added edge: ${edge.from} --[${edge.type}]--> ${edge.to}`);
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get all nodes of a specific type
   */
  queryByType(type: GraphNode['type']): GraphNode[] {
    return Array.from(this.nodes.values()).filter(node => node.type === type);
  }

  /**
   * Query nodes by properties
   */
  queryByProperties(filter: Record<string, any>): GraphNode[] {
    return Array.from(this.nodes.values()).filter(node => {
      return Object.entries(filter).every(([key, value]) => {
        return node.properties[key] === value;
      });
    });
  }

  /**
   * Find related nodes
   */
  findRelated(nodeId: string, edgeType?: string, maxDepth: number = 1): GraphNode[] {
    const visited = new Set<string>();
    const results: GraphNode[] = [];

    const traverse = (currentId: string, depth: number) => {
      if (depth > maxDepth || visited.has(currentId)) return;
      visited.add(currentId);

      const nodeEdges = this.edgeIndex.get(currentId) || [];

      for (const edge of nodeEdges) {
        if (edgeType && edge.type !== edgeType) continue;

        const relatedId = edge.from === currentId ? edge.to : edge.from;
        const relatedNode = this.nodes.get(relatedId);

        if (relatedNode && !visited.has(relatedId)) {
          results.push(relatedNode);
          traverse(relatedId, depth + 1);
        }
      }
    };

    traverse(nodeId, 0);
    return results;
  }

  /**
   * Get all edges connected to a node
   */
  getEdges(nodeId: string, direction?: 'outgoing' | 'incoming' | 'both'): GraphEdge[] {
    const edges = this.edgeIndex.get(nodeId) || [];

    if (!direction || direction === 'both') {
      return edges;
    }

    return edges.filter(edge => {
      if (direction === 'outgoing') {
        return edge.from === nodeId;
      } else {
        return edge.to === nodeId;
      }
    });
  }

  /**
   * Find shortest path between two nodes (BFS)
   */
  getPath(fromId: string, toId: string): GraphPath | null {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
      return null;
    }

    if (fromId === toId) {
      return {
        nodes: [this.nodes.get(fromId)!],
        edges: [],
        length: 0
      };
    }

    const queue: { nodeId: string; path: string[]; edges: GraphEdge[] }[] = [
      { nodeId: fromId, path: [fromId], edges: [] }
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { nodeId, path, edges: pathEdges } = queue.shift()!;

      if (nodeId === toId) {
        return {
          nodes: path.map(id => this.nodes.get(id)!).filter(n => n !== undefined),
          edges: pathEdges,
          length: path.length - 1
        };
      }

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const connectedEdges = this.edgeIndex.get(nodeId) || [];
      for (const edge of connectedEdges) {
        const nextId = edge.from === nodeId ? edge.to : edge.from;
        if (!visited.has(nextId)) {
          queue.push({
            nodeId: nextId,
            path: [...path, nextId],
            edges: [...pathEdges, edge]
          });
        }
      }
    }

    return null;  // No path found
  }

  /**
   * Get all paths between two nodes up to max depth
   */
  getAllPaths(fromId: string, toId: string, maxDepth: number = 3): GraphPath[] {
    const paths: GraphPath[] = [];
    const visited = new Set<string>();

    const dfs = (currentId: string, targetId: string, path: string[], edges: GraphEdge[], depth: number) => {
      if (depth > maxDepth) return;

      if (currentId === targetId) {
        paths.push({
          nodes: path.map(id => this.nodes.get(id)!),
          edges: [...edges],
          length: path.length - 1
        });
        return;
      }

      visited.add(currentId);

      const connectedEdges = this.edgeIndex.get(currentId) || [];
      for (const edge of connectedEdges) {
        const nextId = edge.from === currentId ? edge.to : edge.from;
        if (!visited.has(nextId)) {
          dfs(nextId, targetId, [...path, nextId], [...edges, edge], depth + 1);
        }
      }

      visited.delete(currentId);
    };

    dfs(fromId, toId, [fromId], [], 0);
    return paths;
  }

  /**
   * Delete a node and all connected edges
   */
  deleteNode(nodeId: string): void {
    // Remove node
    this.nodes.delete(nodeId);

    // Remove edges
    const connectedEdges = this.edgeIndex.get(nodeId) || [];
    for (const edge of connectedEdges) {
      this.edges = this.edges.filter(e =>
        !(e.from === edge.from && e.to === edge.to && e.type === edge.type)
      );
    }

    // Clean up edge index
    this.edgeIndex.delete(nodeId);

    // Remove references in other nodes' indices
    for (const [id, edges] of this.edgeIndex.entries()) {
      this.edgeIndex.set(
        id,
        edges.filter(e => e.from !== nodeId && e.to !== nodeId)
      );
    }

    logger.debug(`[GraphStore] Deleted node: ${nodeId}`);
  }

  /**
   * Delete an edge
   */
  deleteEdge(from: string, to: string, type: string): void {
    this.edges = this.edges.filter(e =>
      !(e.from === from && e.to === to && e.type === type)
    );

    // Update indices
    for (const [id, edges] of this.edgeIndex.entries()) {
      this.edgeIndex.set(
        id,
        edges.filter(e => !(e.from === from && e.to === to && e.type === type))
      );
    }

    logger.debug(`[GraphStore] Deleted edge: ${from} --[${type}]--> ${to}`);
  }

  /**
   * Get graph statistics
   */
  getStats(): {
    nodes: number;
    edges: number;
    nodeTypes: Record<string, number>;
    edgeTypes: Record<string, number>;
    avgDegree: number;
  } {
    return {
      nodes: this.nodes.size,
      edges: this.edges.length,
      nodeTypes: this.getNodeTypeBreakdown(),
      edgeTypes: this.getEdgeTypeBreakdown(),
      avgDegree: this.calculateAverageDegree()
    };
  }

  private getNodeTypeBreakdown(): Record<string, number> {
    const breakdown: Record<string, number> = {};
    for (const node of this.nodes.values()) {
      breakdown[node.type] = (breakdown[node.type] || 0) + 1;
    }
    return breakdown;
  }

  private getEdgeTypeBreakdown(): Record<string, number> {
    const breakdown: Record<string, number> = {};
    for (const edge of this.edges) {
      breakdown[edge.type] = (breakdown[edge.type] || 0) + 1;
    }
    return breakdown;
  }

  private calculateAverageDegree(): number {
    if (this.nodes.size === 0) return 0;

    let totalDegree = 0;
    for (const [nodeId] of this.nodes) {
      const edges = this.edgeIndex.get(nodeId) || [];
      totalDegree += edges.length;
    }

    return totalDegree / this.nodes.size;
  }

  /**
   * Export graph to JSON
   */
  export(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges
    };
  }

  /**
   * Import graph from JSON
   */
  import(data: { nodes: GraphNode[]; edges: GraphEdge[] }): void {
    this.clear();

    for (const node of data.nodes) {
      this.addNode(node);
    }

    for (const edge of data.edges) {
      this.addEdge(edge);
    }

    logger.info(`[GraphStore] Imported ${data.nodes.length} nodes and ${data.edges.length} edges`);
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.nodes.clear();
    this.edges = [];
    this.edgeIndex.clear();
    logger.info('[GraphStore] Cleared all data');
  }

  /**
   * Get subgraph around a node
   */
  getSubgraph(nodeId: string, radius: number = 2): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const subgraphNodes = new Set<string>([nodeId]);
    const subgraphEdges: GraphEdge[] = [];

    // BFS to find nodes within radius
    const queue: { id: string; distance: number }[] = [{ id: nodeId, distance: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id, distance } = queue.shift()!;

      if (visited.has(id) || distance > radius) continue;
      visited.add(id);

      const edges = this.edgeIndex.get(id) || [];
      for (const edge of edges) {
        const neighborId = edge.from === id ? edge.to : edge.from;

        if (distance < radius) {
          subgraphNodes.add(neighborId);
          queue.push({ id: neighborId, distance: distance + 1 });
        }

        // Add edge if both nodes are in subgraph
        if (subgraphNodes.has(edge.from) && subgraphNodes.has(edge.to)) {
          subgraphEdges.push(edge);
        }
      }
    }

    return {
      nodes: Array.from(subgraphNodes).map(id => this.nodes.get(id)!).filter(n => n !== undefined),
      edges: subgraphEdges
    };
  }
}

export const graphStore = new GraphStore();
