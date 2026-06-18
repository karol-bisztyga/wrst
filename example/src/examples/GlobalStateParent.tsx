import { navigate } from "@wrst/core";
import { VerticalView } from "@wrst/core";
import { Text, View } from "@wrst/core";
import { Component } from "@wrst/core";
import { StyledButton } from "./components/StyledButton.tsx";

export const GlobalStateParent: Component = () => {
  return (
    <VerticalView
      style={{
        width: "fill",
        height: "fill",
        backgroundColor: "#000",
        horizontalAlignment: "center",
      }}
    >
      <View style={{ height: 16 }} />
      <Text style={{ color: "#F00" }}>global state parent</Text>
      <View style={{ height: 8 }} />
      <StyledButton label="Child A" onPress={() => navigate("globalChildA")} />
      <View style={{ height: 4 }} />
      <StyledButton label="Child B" onPress={() => navigate("globalChildB")} />
    </VerticalView>
  );
};
