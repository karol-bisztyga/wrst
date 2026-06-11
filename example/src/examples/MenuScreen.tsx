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
        <View style={{ height: 8 }} />
      </VerticalView>
    </ScrollView>
  );
};
