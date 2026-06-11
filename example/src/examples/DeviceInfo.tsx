import { Component } from "wrst";
import { View, Text, ScrollView, VerticalView, Device } from "wrst";

export const DeviceInfo: Component = () => {
  return (
    <ScrollView
      style={{ width: "fill", height: "fill", backgroundColor: "#000" }}
    >
      <VerticalView
        style={{ width: "fill", padding: 8, horizontalAlignment: "center" }}
      >
        <Text style={{ color: "#F00" }}>device info</Text>
        <View style={{ height: 8 }} />
        <Text>platform = {Device.platform}</Text>
        <Text>shape = {Device.shape}</Text>
        <Text>
          dimensions = {Device.dimensions.width} x {Device.dimensions.height}
        </Text>
      </VerticalView>
    </ScrollView>
  );
};
