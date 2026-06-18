// todo import from '@wrst/core'
import { HorizontalView } from "@wrst/core";
import { VerticalView } from "@wrst/core";
import { View, Text, useState, List } from "@wrst/core";
// todo remove this
import { Component } from "@wrst/core";
import { StyledButton } from "./components/StyledButton.tsx";

const boxSize = 20;

export const State: Component = () => {
  const [color, setColor] = useState("#000");
  const [text, setText] = useState("1");
  const [items, setItems] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const maxItems = 5;

  const [ns, setNs] = useState<string | null>("hello");

  return (
    <View>
      <View
        style={{
          width: "fill",
          height: "fill",
          verticalAlignment: "center",
          backgroundColor: "rgba(0,0,0,.5)",
        }}
      >
        <VerticalView
          style={{
            width: "fill",
            horizontalAlignment: "center",
            backgroundColor: "rgba(255,0,0,.5)",
          }}
        >
          <HorizontalView
            style={{
              verticalAlignment: "center",
              backgroundColor: "rgba(0,0,255,.5)",
            }}
          >
            <View
              style={{
                width: boxSize,
                height: boxSize,
                backgroundColor: color,
              }}
            >
              <Text
                style={{
                  color: "#FFF",
                  textAlign: "center",
                  width: "fill",
                  height: "fill",
                }}
              >
                {text}
              </Text>
            </View>
          </HorizontalView>
          <View style={{ height: 10 }} />
          <HorizontalView style={{ height: 20 }}>
            <List
              items={items}
              renderItem={(item, index) => {
                return (
                  <HorizontalView>
                    <View
                      style={{
                        width: 15,
                        height: 20,
                        backgroundColor:
                          currentIndex === index
                            ? "rgba(0,255,0,1)"
                            : "rgba(0,255,0,0.5)",
                      }}
                    >
                      <Text
                        style={{ width: "fill", textAlign: "center" }}
                      >{`${item}`}</Text>
                    </View>
                    <View style={{ width: 4 }} />
                  </HorizontalView>
                );
              }}
            />
          </HorizontalView>
          <View style={{ height: 10 }} />
          <StyledButton
            label={`change ${ns}`}
            width={180}
            onPress={() => {
              setNs((prev) =>
                prev ? null : "number " + Math.floor(Math.random() * 10),
              );
            }}
          />
          <View style={{ height: 10 }} />
          <StyledButton
            label="Change State"
            onPress={() => {
              const len = items.length;
              const idx = Number(currentIndex);
              const newIndex = len < maxItems ? len : (idx + 1) % maxItems;
              let newNumber = null;
              while (newNumber === null || newNumber === items[newIndex]) {
                newNumber = Math.floor(Math.random() * 3);
              }
              const newColor =
                "#" +
                Math.floor(Math.random() * 16777215)
                  .toString(16)
                  .padStart(6, "0");

              setColor(newColor);
              setText(String(newNumber));
              console.log("new number", newNumber);

              if (len < maxItems) {
                setItems([...items, newNumber]);
              } else {
                const newItems = [...items];
                newItems[newIndex] = newNumber;
                setItems(newItems);
              }
              setCurrentIndex(newIndex);
            }}
          />
        </VerticalView>
      </View>
    </View>
  );
};
