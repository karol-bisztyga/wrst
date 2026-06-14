import { Component, useState } from "wrst";
import {
  View,
  Text,
  VerticalView,
  ScalingScrollView,
  createTheme,
  type GradientDirection,
  type GradientType,
} from "wrst";
import { StyledButton } from "./components/StyledButton";

// Showcases the Tier-1 "soul" styling: theme tokens + gradients + shadow +
// rounded corners. Works identically on Wear OS and Apple Watch.
const theme = createTheme({
  colors: { primary: "#5e5ce6", accent: "#ff375f" },
});

export const Styling: Component = () => {
  const [gradientDirection, setGradientDirection] =
    useState<GradientDirection>("diagonal");
  const [gradientType, setGradientType] = useState<GradientType>("linear");

  const changeGradientType = () => {
    if (gradientType === "linear") {
      setGradientType("radial");
    } else {
      setGradientType("linear");
    }
  };

  const changeGradientDirection = () => {
    if (gradientDirection === "vertical") {
      setGradientDirection("horizontal");
    } else if (gradientDirection === "horizontal") {
      setGradientDirection("diagonal");
    } else {
      setGradientDirection("vertical");
    }
  };

  return (
    <ScalingScrollView
      style={{
        width: "fill",
        height: "fill",
        backgroundColor: theme.colors.background,
      }}
    >
      <VerticalView
        style={{
          width: "fill",
          padding: theme.spacing.md,
          horizontalAlignment: "center",
        }}
      >
        <Text style={{ color: theme.colors.text }}>styling</Text>
        <View style={{ height: theme.spacing.md }} />

        {/* linear gradient + shadow + rounded corners */}
        <VerticalView
          style={{
            width: 150,
            horizontalAlignment: "center",
            gradient: {
              type: gradientType,
              colors: [theme.colors.primary, theme.colors.accent],
              direction: gradientDirection,
            },
            borderRadius: theme.radius.lg,
            shadow: { color: "#000000", radius: 8, y: 3 },
          }}
        >
          <View style={{ height: theme.spacing.md }} />
          <Text style={{ color: theme.colors.onPrimary }}>gradient</Text>
          <Text style={{ color: theme.colors.onPrimary }}>{gradientType}</Text>
          <Text style={{ color: theme.colors.onPrimary }}>
            {gradientDirection}
          </Text>
          <View style={{ height: theme.spacing.md }} />
        </VerticalView>

        {/* buttons */}
        <View style={{ height: theme.spacing.md }} />

        <StyledButton
          label="Change gradient type"
          onPress={changeGradientType}
        />
        <View style={{ height: theme.spacing.md }} />

        <StyledButton
          label="Change gradient direction"
          onPress={changeGradientDirection}
        />

        <View style={{ height: theme.spacing.md }} />

        {/* radial gradient, circular */}
        <View
          style={{
            size: 80,
            gradient: {
              type: gradientType,
              colors: ["#ffffff", theme.colors.primary],
            },
            borderRadius: theme.radius.pill,
          }}
        />

        {/* themed surface card */}
        <View
          style={{
            width: 150,
            padding: theme.spacing.md,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            horizontalAlignment: "center",
          }}
        >
          <Text style={{ color: theme.colors.muted }}>themed surface</Text>
        </View>
      </VerticalView>
    </ScalingScrollView>
  );
};
