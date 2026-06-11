import {
  Text,
  Button,
  useState,
  VerticalView,
  Component,
  HorizontalView,
} from "wrst";

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
