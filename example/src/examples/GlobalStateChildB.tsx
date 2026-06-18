import { getAppState, setAppState } from "@wrst/core";
import { VerticalView } from "@wrst/core";
import { Text, View } from "@wrst/core";
import { Component } from "@wrst/core";
import { StyledButton } from "./components/StyledButton.tsx";

const rnd = () => Math.floor(Math.random() * 100) + 1;

export const GlobalStateChildB: Component = () => {
  return (
    <VerticalView
      style={{
        width: "fill",
        height: "fill",
        backgroundColor: "#000",
        horizontalAlignment: "center",
      }}
    >
      <View style={{ height: 8 }} />
      <Text style={{ color: "#F00" }}>child B</Text>
      <View style={{ height: 8 }} />
      <Text>value = {getAppState("value")}</Text>
      <View style={{ height: 8 }} />
      <StyledButton
        label="randomize"
        onPress={() => setAppState("value", rnd())}
      />
    </VerticalView>
  );
};
