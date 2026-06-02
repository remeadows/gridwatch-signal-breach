export type BfsOptions<TNode> = Readonly<{
  start: TNode;
  isGoal: (node: TNode) => boolean;
  getNeighbors: (node: TNode) => readonly TNode[];
  toKey: (node: TNode) => string;
}>;

export function bfs<TNode>(options: BfsOptions<TNode>): TNode[] | null {
  const queue: TNode[] = [options.start];
  const startKey = options.toKey(options.start);
  const cameFrom = new Map<string, string | null>([[startKey, null]]);
  const nodesByKey = new Map<string, TNode>([[startKey, options.start]]);

  for (let readIndex = 0; readIndex < queue.length; readIndex += 1) {
    const current = queue[readIndex];
    const currentKey = options.toKey(current);

    if (options.isGoal(current)) {
      return reconstructPath(currentKey, cameFrom, nodesByKey);
    }

    for (const neighbor of options.getNeighbors(current)) {
      const neighborKey = options.toKey(neighbor);

      if (cameFrom.has(neighborKey)) {
        continue;
      }

      cameFrom.set(neighborKey, currentKey);
      nodesByKey.set(neighborKey, neighbor);
      queue.push(neighbor);
    }
  }

  return null;
}

function reconstructPath<TNode>(
  goalKey: string,
  cameFrom: ReadonlyMap<string, string | null>,
  nodesByKey: ReadonlyMap<string, TNode>,
): TNode[] {
  const reversedPath: TNode[] = [];
  let currentKey: string | null = goalKey;

  while (currentKey !== null) {
    const node = nodesByKey.get(currentKey);

    if (!node) {
      throw new Error(`BFS path reconstruction lost node ${currentKey}.`);
    }

    reversedPath.push(node);
    currentKey = cameFrom.get(currentKey) ?? null;
  }

  return reversedPath.reverse();
}
