import { navigate } from "wrst";
import { VerticalView } from "wrst";
import { Text, ScrollView, View } from "wrst";
import { Component } from "wrst";
import { StyledButton } from "./components/StyledButton.tsx";

export const MenuScreen: Component = () => {
  return (
    <ScrollView
      style={{ width: "fill", height: "fill", backgroundColor: "#000" }}
    >
      <VerticalView
        style={{ width: "fill", padding: 8, horizontalAlignment: "center" }}
      >
        <Text style={{ color: "#F00" }}>test screens</Text>
        <View style={{ height: 8 }} />
        <StyledButton
          width={120}
          height={36}
          onPress={() => navigate("state")}
          label="State"
        />
        <View style={{ height: 4 }} />
        <StyledButton
          width={120}
          height={36}
          onPress={() => navigate("effect")}
          label="Effect"
        />
        <View style={{ height: 4 }} />
        <StyledButton
          width={120}
          height={36}
          onPress={() => navigate("timeouts")}
          label="Timeouts"
        />
        <View style={{ height: 4 }} />
        <StyledButton
          width={120}
          height={36}
          onPress={() => navigate("fetch")}
          label="Fetch"
        />
        <View style={{ height: 4 }} />
        <StyledButton
          width={120}
          height={36}
          onPress={() => navigate("localStorage")}
          label="Local Storage"
        />
        <View style={{ height: 4 }} />
        <StyledButton
          width={120}
          height={36}
          onPress={() => navigate("globalState")}
          label="Global State"
        />
        <View style={{ height: 4 }} />
        <StyledButton
          width={120}
          height={36}
          onPress={() => navigate("deviceInfo")}
          label="Device Info"
        />
        <View style={{ height: 4 }} />
        <StyledButton
          width={120}
          height={36}
          onPress={() => navigate("nativeModule")}
          label="Native Module"
        />
        <View style={{ height: 4 }} />
        <StyledButton
          width={120}
          height={36}
          onPress={() => navigate("sensors")}
          label="Sensors"
        />
        <View style={{ height: 4 }} />
        <StyledButton
          width={120}
          height={36}
          onPress={() => navigate("moduleSensors")}
          label="Module Sensors"
        />
        <View style={{ height: 4 }} />
        <StyledButton
          width={120}
          height={36}
          onPress={() => navigate("styling")}
          label="Styling"
        />
        <View style={{ height: 4 }} />
        <StyledButton
          width={120}
          height={36}
          onPress={() => navigate("icons")}
          label="Icons"
        />
        <View style={{ height: 4 }} />
        <StyledButton
          width={120}
          height={36}
          onPress={() => navigate("progress")}
          label="Progress"
        />
        <View style={{ height: 4 }} />
        <StyledButton
          width={120}
          height={36}
          onPress={() => navigate("animations")}
          label="Animations"
        />
        <View style={{ height: 4 }} />
        <StyledButton
          width={120}
          height={36}
          onPress={() => navigate("images")}
          label="Images"
        />
        <View style={{ height: 4 }} />
        <StyledButton
          width={120}
          height={36}
          onPress={() => navigate("inputs")}
          label="Inputs"
        />
        <View style={{ height: 4 }} />
        <StyledButton
          width={120}
          height={36}
          onPress={() => navigate("companion")}
          label="Companion"
        />
        <View style={{ height: 8 }} />
      </VerticalView>
    </ScrollView>
  );
};
