import { navigate } from "wrst";
import { VerticalView } from "wrst";
import { Text, View } from "wrst";
import { Component } from "wrst";
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
