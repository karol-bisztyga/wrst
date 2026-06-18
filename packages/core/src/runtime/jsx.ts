import { Component, Node, Props } from "./types.ts";

export function jsx(
  component: Component,
  props: Props,
  ...children: Node[]
): Node {
  // console.log("jsx call", { component, props, children });

  const result = component({
    ...(props || {}),
    children,
  });
  return result;
}

// function normalizeChildren(children: Node[]): Node[] {
//   if (!children) return [];
//   return Array.isArray(children) ? children : [children];
// }
