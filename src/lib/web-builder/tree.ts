import type { Node } from "./dsl";

export type NodePath = {
  node: Node;
  parent: Node | null;
  index: number;
};

export function findNode(root: Node, id: string): Node | null {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

export function findNodePath(root: Node, id: string): NodePath | null {
  if (root.id === id) {
    return { node: root, parent: null, index: -1 };
  }
  for (const child of root.children ?? []) {
    if (child.id === id) {
      return { node: child, parent: root, index: root.children!.indexOf(child) };
    }
    const deep = findNodePath(child, id);
    if (deep) return deep;
  }
  return null;
}

export function updateNode(
  root: Node,
  id: string,
  updater: (node: Node) => Node
): Node {
  if (root.id === id) return updater(root);
  if (!root.children) return root;
  return {
    ...root,
    children: root.children.map((child) => updateNode(child, id, updater)),
  };
}

export function insertChild(root: Node, parentId: string, child: Node): Node {
  if (root.id === parentId) {
    const children = root.children ? [...root.children, child] : [child];
    return { ...root, children };
  }
  if (!root.children) return root;
  return {
    ...root,
    children: root.children.map((node) => insertChild(node, parentId, child)),
  };
}

export function removeNode(root: Node, id: string): Node {
  if (!root.children) return root;
  const nextChildren = root.children
    .filter((child) => child.id !== id)
    .map((child) => removeNode(child, id));
  return { ...root, children: nextChildren };
}

export function moveNode(root: Node, id: string, delta: number): Node {
  if (!root.children) return root;
  const index = root.children.findIndex((child) => child.id === id);
  if (index !== -1) {
    const nextIndex = Math.max(
      0,
      Math.min(root.children.length - 1, index + delta)
    );
    if (index === nextIndex) return root;
    const nextChildren = [...root.children];
    const [item] = nextChildren.splice(index, 1);
    nextChildren.splice(nextIndex, 0, item);
    return { ...root, children: nextChildren };
  }
  return {
    ...root,
    children: root.children.map((child) => moveNode(child, id, delta)),
  };
}
