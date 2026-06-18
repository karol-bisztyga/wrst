import { Component, useState } from "@wrst/core";
import {
  Image,
  Progress,
  Text,
  View,
  VerticalView,
  ScalingScrollView,
} from "@wrst/core";
import { StyledButton } from "./components/StyledButton";

// Image component demo: loads from a URL via the native async image loader
// (SwiftUI AsyncImage / Coil). This same URL-loading path is what project-local
// images will use in dev (served by the dev server) and what remote images use.
// const URL_A = "https://picsum.photos/2000/2000";
const URL_B = "https://picsum.photos/id/1062/200/120";

export const Images: Component = () => {
  const getBigRandomImage = () =>
    `https://picsum.photos/2000/1200?random=${Math.random()}`;

  const [image, setImage] = useState(getBigRandomImage());

  return (
    <ScalingScrollView
      style={{ width: "fill", height: "fill", backgroundColor: "#000" }}
    >
      <VerticalView
        style={{ width: "fill", padding: 8, horizontalAlignment: "center" }}
      >
        <Text style={{ color: "#F00" }}>images</Text>
        <View style={{ height: 8 }} />
        <StyledButton
          label="reload"
          onPress={() => setImage(getBigRandomImage())}
        />
        <View style={{ height: 8 }} />

        <Text>fit</Text>
        <View
          style={{
            width: 140,
            height: 80,
            borderRadius: 8,
            verticalAlignment: "center",
            horizontalAlignment: "center",
          }}
        >
          <Image
            src={image}
            resizeMode="fit"
            style={{
              borderRadius: 8,
            }}
            loader={
              <View
                style={{
                  width: "fill",
                  height: "fill",
                  verticalAlignment: "center",
                  horizontalAlignment: "center",
                }}
              >
                <Progress size={24} color="#888" />
              </View>
            }
          />
        </View>
        <View style={{ height: 10 }} />

        <Text>cover (circular)</Text>
        <Image
          src={URL_B}
          resizeMode="cover"
          loader={<Progress size={24} color="#888" />}
          style={{ size: 80, borderRadius: 999 }}
        />
        <View style={{ height: 10 }} />

        {/* local asset (example/assets/logo.png) - same component, no scheme */}
        <Text>local</Text>
        <View
          style={{
            width: 140,
            height: 80,
            borderRadius: 8,
            backgroundColor: "#F00",
          }}
        >
          <Image
            src="img.jpg"
            resizeMode="cover"
            style={{
              width: 140,
              height: 80,
              borderRadius: 8,
              backgroundColor: "#F00",
            }}
          />
        </View>
      </VerticalView>
    </ScalingScrollView>
  );
};
