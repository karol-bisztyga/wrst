import { HorizontalView } from "@wrst/core";
import { VerticalView } from "@wrst/core";
import { View, Text, ScrollView, useState } from "@wrst/core";
import { Component } from "@wrst/core";
import { StyledButton } from "./components/StyledButton.tsx";

export const LocalStorage: Component = () => {
  // performance.now test
  const [number, setNumber] = useState(0);

  const styles = {
    button: {
      width: 60,
      height: 30,
    },
    buttonLabel: {
      textAlign: "center",
    },
    section: {
      borderColor: "#FFF",
      borderWidth: 1,
      padding: 5,
      width: "fill",
      horizontalAlignment: "center",
    },
  };

  const getRandomNumber = () => {
    let newNumber = Math.floor(Math.random() * 100);
    while (newNumber === number) {
      newNumber = Math.floor(Math.random() * 100);
    }
    setNumber(newNumber);
  };

  const storeNumber = () => {
    localStorage.setItem("myNumber", number.toString());
  };

  const restoreNumber = () => {
    const stored = localStorage.getItem("myNumber");
    if (stored !== null) {
      setNumber(parseInt(stored));
    }
  };

  return (
    <VerticalView
      style={{
        width: "fill",
        height: "fill",
        backgroundColor: "#F00",
        horizontalAlignment: "center",
      }}
    >
      {/* ─────────────────── BUTTONS ─────────────────── */}
      <View style={{ height: 8 }} />
      <VerticalView style={{ horizontalAlignment: "center" }}>
        <StyledButton onPress={getRandomNumber} label="new" />
        <View style={{ height: 4 }} />
        <HorizontalView
          style={{
            verticalAlignment: "center",
          }}
        >
          <StyledButton onPress={storeNumber} label="store" />
          <View style={{ width: 4 }} />
          <StyledButton onPress={restoreNumber} label="restore" />
        </HorizontalView>
      </VerticalView>
      <View style={{ height: 2 }} />

      {/* ─────────────────── TESTS ─────────────────── */}
      <ScrollView style={{ width: "fill", backgroundColor: "#000" }}>
        {/* ─────────────────── number ─────────────────── */}
        <VerticalView style={styles.section}>
          <Text style={{ color: "#F00" }}>number</Text>
          <Text>[value] ({number})</Text>
        </VerticalView>
        {/* ─────────────────── END ─────────────────── */}
        <View style={{ height: 4 }} />
      </ScrollView>
    </VerticalView>
  );
};
