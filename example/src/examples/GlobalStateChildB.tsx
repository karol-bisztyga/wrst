import { getAppState, setAppState } from "wrst";
import { VerticalView } from "wrst";
import { Text, View } from "wrst";
import { Component } from "wrst";
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
