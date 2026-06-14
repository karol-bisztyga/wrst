import { Component } from "wrst";
import {
  Progress,
  Text,
  View,
  VerticalView,
  ScalingScrollView,
  useState,
} from "wrst";
import { StyledButton } from "./components/StyledButton.tsx";

// Progress component demo: an indeterminate spinner and a determinate ring
// driven by state. Maps to Wear CircularProgressIndicator / SwiftUI ProgressView.
export const ProgressScreen: Component = () => {
  const [value, setValue] = useState(0.25);
  const [animated, setAnimated] = useState(true);

  return (
    <ScalingScrollView
      style={{ width: "fill", height: "fill", backgroundColor: "#000" }}
    >
      <VerticalView
        style={{ width: "fill", padding: 8, horizontalAlignment: "center" }}
      >
        <Text style={{ color: "#F00" }}>progress</Text>
        <View style={{ height: 8 }} />

        <Text>indeterminate</Text>
        <Progress size={40} color="#0a84ff" />
        <View style={{ height: 10 }} />

        <Text>determinate</Text>
        <Progress value={value} size={40} color="#30d158" animated={animated} />
        <View style={{ height: 10 }} />

        <StyledButton
          width={120}
          height={36}
          label={value.toString()}
          onPress={() => setValue((prev) => (prev >= 1 ? 0 : prev + 0.25))}
        />

        <View style={{ height: 10 }} />

        <StyledButton
          width={120}
          height={36}
          label={animated ? "animated" : "static"}
          onPress={() => setAnimated((prev) => !prev)}
        />
      </VerticalView>
    </ScalingScrollView>
  );
};
