import { Component } from "@wrst/core";
import {
  View,
  Text,
  ScrollView,
  VerticalView,
  useState,
  callNativeModule,
} from "@wrst/core";
import { StyledButton } from "./components/StyledButton.tsx";

// Demonstrates the native-module extension hook. The host's thin native shell
// registers a module named "hello" (see Android MainActivity / iOS
// AppleWatchApp); pressing the button calls into it, the native side prints
// "hello from native module", and the returned string is shown here.
export const NativeModule: Component = () => {
  const [message, setMessage] = useState("(not called yet)");

  return (
    <ScrollView
      style={{ width: "fill", height: "fill", backgroundColor: "#000" }}
    >
      <VerticalView
        style={{ width: "fill", padding: 8, horizontalAlignment: "center" }}
      >
        <Text style={{ color: "#F00" }}>native module</Text>
        <View style={{ height: 8 }} />
        <Text>{message}</Text>
        <View style={{ height: 8 }} />
        <StyledButton
          width={120}
          height={36}
          label="Call native"
          onPress={() => {
            const result = callNativeModule<string>("hello");
            setMessage(result ?? "(no native module)");
          }}
        />
      </VerticalView>
    </ScrollView>
  );
};
