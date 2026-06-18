# wrst

Build smartwatch apps with TypeScript + JSX - one codebase for **Wear OS** and
**Apple Watch**.

```sh
npx @wrst/core init my-app
cd my-app && npm install
npm start
```

This package is the framework you import (components, hooks, the runtime). It also
ships the native runtimes (a prebuilt Android **AAR** and an iOS **Swift package**)
so scaffolded `apple-watch/`/`wear-os/` shells reference them from `node_modules`.

```tsx
import {
  Text,
  Button,
  useState,
  VerticalView,
  Component,
  HorizontalView,
} from "@wrst/core";

// Your app's root component. Components are plain functions returning a tree;
// state is reactive (useState), and the same code renders on Wear OS & Apple Watch.
const App: Component = () => {
  const [count, setCount] = useState(0);

  return (
    <HorizontalView
      style={{ verticalAlignment: "center", width: "fill", height: "fill" }}
    >
      <VerticalView style={{ horizontalAlignment: "center", width: "fill" }}>
        <Text style={{ color: "#ffffff" }}>{`Count: ${count}`}</Text>
        <Button onPress={() => setCount(count + 1)}>
          <Text style={{ color: "#FFF" }}>Increment</Text>
        </Button>
        <Button onPress={() => setCount(0)}>
          <Text style={{ color: "#F00" }}>Reset</Text>
        </Button>
      </VerticalView>
    </HorizontalView>
  );
};

export default App;
```

See the project's repository README for the full quickstart, commands, and
architecture.
