"use strict";
(() => {
  // src/components/Text.ts
  var Text = (props) => {
    const { children, ...rest } = props || {};
    console.log("Text children", typeof children, children);
    return {
      type: "Text",
      props: rest,
      children: Array.isArray(children) ? children : [children || ""]
    };
  };

  // src/components/View.ts
  var View = ({ children, ...props }) => {
    return {
      type: "View",
      props,
      children: children || []
    };
  };

  // src/registry/functions.ts
  var registry = /* @__PURE__ */ new Map();
  function call(id, ...args) {
    const fn = registry.get(id);
    if (fn) fn(...args);
  }

  // src/runtime/jsx.ts
  function jsx2(component, props, ...children) {
    console.log("jsx call", { component, props, children });
    const result = component({
      ...props || {},
      children
      //: normalized,
    });
    return result;
  }

  // src/examples/App.tsx
  var App = () => {
    return /* @__PURE__ */ jsx2(View, null, /* @__PURE__ */ jsx2(View, null), /* @__PURE__ */ jsx2(View, null), /* @__PURE__ */ jsx2(Text, { backgroundColor: "#FF0000" }, "Hello! This is JSX speaking! :)"));
  };
  var App_default = App;

  // src/entry.ts
  globalThis.jsx = jsx2;
  globalThis.render = () => {
    return App_default();
  };
  globalThis.call = (id) => {
    return call(id);
  };
  var __logs = [];
  globalThis.console = {
    log: (...args) => {
      native.log(
        args.map((a) => typeof a === "object" ? JSON.stringify(a) : String(a))
      );
    }
  };
  globalThis.getLogs = () => __logs;
})();
