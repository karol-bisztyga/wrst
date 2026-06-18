import { Component } from "./types";

export function render(component: Component) {
  const tree = component();
  console.log("Rendering tree:", JSON.stringify(tree, null, 2));

  // later: send to native
}
