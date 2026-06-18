import { Component } from "@wrst/core";
import { View, Text, VerticalView, ScalingScrollView, useState } from "@wrst/core";
import { StyledButton } from "./components/StyledButton.tsx";

// Implicit animations demo: a View with `animate` eases its style changes
// (size / color / opacity / offset) instead of snapping. Native-driven - no JS
// frame loop. Toggling the button flips between two style sets.
export const Animations: Component = () => {
  const [on, setOn] = useState(false);

  return (
    <ScalingScrollView
      style={{ width: "fill", height: "fill", backgroundColor: "#000" }}
    >
      <VerticalView
        style={{ width: "fill", padding: 8, horizontalAlignment: "center" }}
      >
        <Text style={{ color: "#F00" }}>animations</Text>
        <View style={{ height: 10 }} />

        <View
          style={{
            width: 120,
            height: 70,
            backgroundColor: "#222",
            padding: `0 ${on ? 0 : 10}`,
          }}
        >
          <View
            animate
            style={{
              width: on ? 120 : 100,
              height: on ? 30 : 70,
              backgroundColor: on ? "#30d158" : "#0a84ff",
              opacity: on ? 1 : 0.4,
              borderRadius: on ? 30 : 8,
            }}
          />
        </View>

        <View style={{ height: 14 }} />
        <StyledButton
          width={120}
          height={36}
          label={on ? "expanded" : "collapsed"}
          onPress={() => setOn((prev) => !prev)}
        />
      </VerticalView>
    </ScalingScrollView>
  );
};
