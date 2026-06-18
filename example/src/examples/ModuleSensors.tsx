import { Component } from "@wrst/core";
import {
  Text,
  VerticalView,
  ScalingScrollView,
  useState,
  useEffect,
  useNativeModule,
  requestPermission,
} from "@wrst/core";

// Sensors that are *native modules* (not engine built-ins). These two work on
// both platforms - step count (Android SensorManager / iOS CMPedometer) and
// barometer (Android SensorManager / iOS CMAltimeter) - and stream via
// useNativeModule (start on mount / stop on unmount). Each pushes a scalar
// { value, timestamp }. Registered in the app shells (Android: SensorModules.kt,
// iOS: SensorModules.swift).
//
// (Platform-asymmetric sensors like heart rate - iOS needs HealthKit - and
// ambient light - no watchOS API - are intentionally not shown here.)
type Reading = { value: number; timestamp: number };
const ZERO: Reading = { value: 0, timestamp: 0 };

const styles = {
  section: {
    borderColor: "#FFF",
    borderWidth: 1,
    padding: 5,
    width: "fill",
    horizontalAlignment: "center",
  },
};

export const ModuleSensors: Component = () => {
  const [steps, setSteps] = useState<Reading>(ZERO);
  const [pressure, setPressure] = useState<Reading>(ZERO);
  const [perms, setPerms] = useState("requesting...");

  // Layer-2 permission: both sensors need motion/"activity" (Android
  // ACTIVITY_RECOGNITION, iOS motion & fitness). Ask, then show the result.
  useEffect(() => {
    requestPermission("activity").then((activity) =>
      setPerms(`activity=${activity}`),
    );
  }, []);

  useNativeModule<Reading>("stepCount", setSteps, { intervalMs: 1000 });
  useNativeModule<Reading>("barometer", setPressure, { intervalMs: 1000 });

  const section = (title: string, unit: string, r: Reading) => (
    <VerticalView style={styles.section}>
      <Text style={{ color: "#F00" }}>
        {title} ({unit})
      </Text>
      <Text>{r.value.toFixed(2)}</Text>
    </VerticalView>
  );

  return (
    <ScalingScrollView
      style={{ width: "fill", height: "fill", backgroundColor: "#000" }}
    >
      <VerticalView style={styles.section}>
        <Text style={{ color: "#0F0" }}>permissions</Text>
        <Text>{perms}</Text>
      </VerticalView>
      {section("STEP COUNT", "steps", steps)}
      {section("BAROMETER", "hPa", pressure)}
    </ScalingScrollView>
  );
};
