import { HorizontalView } from "wrst";
import { VerticalView } from "wrst";
import { View, Text, ScrollView, useState, Button } from "wrst";
import { Component } from "wrst";
import { StyledButton } from "./components/StyledButton.tsx";

const BUTTON_DIMENSIONS = { width: 80, height: 30 };

export const Timeouts: Component = () => {
  // performance.now test
  const [currentTime, setCurrentTime] = useState(0);

  // setTimeout test
  const [timeoutStatus, setTimeoutStatus] = useState("idle");

  // clearTimeout test
  const [clearStatus, setClearStatus] = useState("idle");
  const [clearTimeoutId, setClearTimeoutId] = useState("");

  // setInterval test
  const [intervalTicks, setIntervalTicks] = useState(0);
  const [intervalId, setIntervalId] = useState("");
  const [intervalRunning, setIntervalRunning] = useState(false);

  // clearInterval auto-stop test
  const [autoTicks, setAutoTicks] = useState(0);
  const [autoStatus, setAutoStatus] = useState("idle");

  const styles = {
    buttonLabel: {},
    section: {
      borderColor: "#FFF",
      borderWidth: 1,
      padding: 5,
      width: "fill",
      horizontalAlignment: "center",
    },
  };

  const getCurrentTime = () => {
    const time = performance.now();
    setCurrentTime(time);
  };

  const startTimeout = () => {
    setTimeoutStatus("waiting...");
    setTimeout(() => {
      setTimeoutStatus("fired!");
    }, 1000);
  };

  const toggleClearTimeout = () => {
    if (clearTimeoutId !== "") {
      clearTimeout(String(clearTimeoutId));
      setClearTimeoutId("");
      setClearStatus("cancelled");
    } else {
      setClearStatus("waiting...");
      const id = setTimeout(() => {
        setClearStatus("fired!");
        setClearTimeoutId("");
      }, 3000);
      setClearTimeoutId(id);
    }
  };

  const startInterval = () => {
    if (intervalRunning) return;
    setIntervalRunning(true);
    setIntervalTicks(0);
    const id = setInterval(() => {
      setIntervalTicks((p: number) => p + 1);
    }, 500);
    setIntervalId(id);
  };

  const stopInterval = () => {
    clearInterval(String(intervalId));
    setIntervalId("");
    setIntervalRunning(false);
  };

  const startAutoInterval = () => {
    setAutoStatus("running...");
    setAutoTicks(0);
    let count = 0;
    let autoId: string;
    autoId = setInterval(() => {
      count++;
      setAutoTicks(count);
      if (count >= 3) {
        clearInterval(autoId);
        setAutoStatus(`stopped at ${count} ticks`);
      }
    }, 500);
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
      <View style={{ size: 4 }} />
      <HorizontalView
        style={{
          verticalAlignment: "center",
        }}
      >
        <StyledButton
          width={BUTTON_DIMENSIONS.width}
          height={BUTTON_DIMENSIONS.height}
          onPress={getCurrentTime}
          label="get time"
        />
        <View style={{ size: 4 }} />
        <StyledButton
          width={BUTTON_DIMENSIONS.width}
          height={BUTTON_DIMENSIONS.height}
          onPress={startTimeout}
          label="timeout"
        />
      </HorizontalView>
      <View style={{ size: 4 }} />
      <HorizontalView style={{}}>
        <Button
          style={{
            width: BUTTON_DIMENSIONS.width,
            height: BUTTON_DIMENSIONS.height,
            backgroundColor: "rgb(83, 69, 189)",
            verticalAlignment: "center",
            horizontalAlignment: "center",
            borderRadius: 8,
          }}
          onPress={toggleClearTimeout}
        >
          {/* clearTimeoutId */}
          <HorizontalView>
            <Text
              style={{
                ...styles.buttonLabel,
                fontWeight: clearTimeoutId ? 400 : 900,
              }}
            >
              set
            </Text>
            <Text style={styles.buttonLabel}>+</Text>
            <Text
              style={{
                ...styles.buttonLabel,
                fontWeight: !clearTimeoutId ? 400 : 900,
              }}
            >
              clear
            </Text>
          </HorizontalView>
        </Button>
        <View style={{ size: 4 }} />
        <StyledButton
          width={BUTTON_DIMENSIONS.width}
          height={BUTTON_DIMENSIONS.height}
          onPress={startAutoInterval}
          label="auto-stop"
        />
      </HorizontalView>
      <View style={{ size: 4 }} />

      {/* ─────────────────── TESTS ─────────────────── */}
      <ScrollView style={{ width: "fill", backgroundColor: "#000" }}>
        {/* ─────────────────── performance.now ─────────────────── */}
        <VerticalView style={styles.section}>
          <Text style={{ color: "#F00" }}>performance.now()</Text>
          <Text>[time] ({currentTime})</Text>
        </VerticalView>
        {/* ─────────────────── setTimeout ─────────────────── */}
        <VerticalView style={styles.section}>
          <Text style={{ color: "#F00" }}>setTimeout (1s)</Text>
          <Text>[status] ({timeoutStatus})</Text>
          <Text>[fires once after 1s delay]</Text>
        </VerticalView>

        {/* ─────────────────── clearTimeout ─────────────────── */}
        <VerticalView style={styles.section}>
          <Text style={{ color: "#F00" }}>clearTimeout</Text>
          <Text>[status] ({clearStatus})</Text>
          <Text>[press to start 3s timeout, press again to cancel]</Text>
        </VerticalView>

        {/* ─────────────────── setInterval ─────────────────── */}
        <VerticalView style={styles.section}>
          <Text style={{ color: "#F00" }}>setInterval (500ms)</Text>
          <Text>[ticks] ({intervalTicks})</Text>
          <Text>[running] ({intervalRunning})</Text>
          <HorizontalView>
            <StyledButton
              width={BUTTON_DIMENSIONS.width}
              height={BUTTON_DIMENSIONS.height}
              onPress={startInterval}
              label="start"
            />
            <View style={{ size: 4 }} />
            <StyledButton
              width={BUTTON_DIMENSIONS.width}
              height={BUTTON_DIMENSIONS.height}
              onPress={stopInterval}
              label="stop"
            />
          </HorizontalView>
        </VerticalView>

        {/* ─────────────────── clearInterval auto-stop ─────────────────── */}
        <VerticalView style={styles.section}>
          <Text style={{ color: "#F00" }}>clearInterval (auto at 3)</Text>
          <Text>[ticks] ({autoTicks})</Text>
          <Text>[status] ({autoStatus})</Text>
          <Text>[interval self-cancels after 3 ticks]</Text>
        </VerticalView>

        {/* ─────────────────── END ─────────────────── */}
        <View style={{ height: 4 }} />
      </ScrollView>
    </VerticalView>
  );
};
