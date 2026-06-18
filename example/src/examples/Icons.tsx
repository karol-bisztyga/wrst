import { Component } from "@wrst/core";
import {
  Icon,
  Text,
  View,
  VerticalView,
  HorizontalView,
  ScalingScrollView,
} from "@wrst/core";

// Icon component demo: cross-platform names mapped to SF Symbols (Apple Watch)
// and Material icons (Wear OS), tinted + sized. No images bundled.
export const Icons: Component = () => {
  const gap = <View style={{ width: 14 }} />;
  return (
    <ScalingScrollView
      style={{ width: "fill", height: "fill", backgroundColor: "#000" }}
    >
      <VerticalView
        style={{ width: "fill", padding: 8, horizontalAlignment: "center" }}
      >
        <Text style={{ color: "#F00" }}>icons</Text>
        <View style={{ height: 8 }} />

        <HorizontalView style={{ verticalAlignment: "center" }}>
          <Icon name="home" size={30} color="#0a84ff" />
          {gap}
          <Icon name="heart" size={30} color="#ff375f" />
          {gap}
          <Icon name="star" size={30} color="#ffd60a" />
        </HorizontalView>
        <View style={{ height: 10 }} />

        <HorizontalView style={{ verticalAlignment: "center" }}>
          <Icon name="person" size={30} color="#30d158" />
          {gap}
          <Icon name="settings" size={30} color="#ffffff" />
          {gap}
          <Icon name="search" size={30} color="#5e5ce6" />
        </HorizontalView>
        <View style={{ height: 10 }} />

        <HorizontalView style={{ verticalAlignment: "center" }}>
          <Icon name="play" size={30} color="#ffffff" />
          {gap}
          <Icon name="share" size={30} color="#0a84ff" />
          {gap}
          <Icon name="notifications" size={30} color="#ff9f0a" />
        </HorizontalView>
      </VerticalView>
    </ScalingScrollView>
  );
};
