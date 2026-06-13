import { Component, useEffect } from "wrst";
import {
  Text,
  VerticalView,
  ScalingScrollView,
  useState,
  useSensor,
  type SensorSample,
} from "wrst";

const ZERO: SensorSample = { x: 0, y: 0, z: 0, timestamp: 0 };
const fmt = (n: number) => n.toFixed(2);

// Engine sensors demo: subscribe to all three motion sensors via useSensor
// (auto start on mount / stop on unmount) and show live x/y/z. No permission
// needed - these are the promptless built-in sensors.
export const Sensors: Component = () => {
  const [accel, setAccel] = useState<SensorSample>(ZERO);
  const [gyro, setGyro] = useState<SensorSample>(ZERO);
  const [mag, setMag] = useState<SensorSample>(ZERO);

  useSensor("accelerometer", (s) => setAccel(s), { intervalMs: 200 });
  useSensor("gyroscope", (s) => setGyro(s), { intervalMs: 200 });
  useSensor("magnetometer", (s) => setMag(s), { intervalMs: 200 });

  const styles = {
    section: {
      borderColor: "#FFF",
      borderWidth: 1,
      padding: 5,
      width: "fill",
      horizontalAlignment: "center",
    },
  };

  const section = (title: string, unit: string, s: SensorSample) => (
    <VerticalView style={styles.section}>
      <Text style={{ color: "#F00" }}>
        {title} ({unit})
      </Text>
      <Text>
        ({fmt(s.x)}, {fmt(s.y)}, {fmt(s.z)})
      </Text>
    </VerticalView>
  );

  return (
    <ScalingScrollView
      style={{ width: "fill", height: "fill", backgroundColor: "#000" }}
    >
      {section("ACCELEROMETER", "m/s²", accel)}
      {section("GYROSCOPE", "rad/s", gyro)}
      {section("MAGNETOMETER", "µT", mag)}
    </ScalingScrollView>
  );
};
