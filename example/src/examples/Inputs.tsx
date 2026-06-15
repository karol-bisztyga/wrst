import {
  Component,
  useState,
  ScalingScrollView,
  VerticalView,
  View,
  Text,
  Button,
  Toggle,
  Slider,
  Stepper,
  Picker,
  RadioGroup,
  Crown,
  TextInput,
  Touchable,
  Image,
} from "wrst";

// Demo of the input controls: Toggle / Slider / Stepper / Picker. Each holds its
// value in useState and updates via the control's onChange.
export const Inputs: Component = () => {
  const [on, setOn] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [count, setCount] = useState(2);
  const options = ["Low", "Medium", "High", "Max"];
  const [index, setIndex] = useState(1);
  const [choice, setChoice] = useState(0);
  const [dial, setDial] = useState(20);
  const [pressed, setPressed] = useState("tap or long-press");
  const [name, setName] = useState("");
  const [taps, setTaps] = useState(0);

  const styles = {
    itemWrapper: { width: "fill", padding: 4, horizontalAlignment: "center" },
  };

  return (
    <ScalingScrollView
      style={{ width: "fill", height: "fill", backgroundColor: "#000" }}
    >
      <VerticalView style={styles.itemWrapper}>
        <Text style={{ color: "#F00" }}>inputs</Text>
        <View style={{ height: 8 }} />
      </VerticalView>
      <VerticalView style={styles.itemWrapper}>
        <Toggle
          style={{ width: "fill" }}
          value={on}
          onChange={setOn}
          label={on ? "On" : "Off"}
        />
      </VerticalView>
      <VerticalView style={styles.itemWrapper}>
        <Text>volume: {Math.round(volume * 100)}%</Text>
        <Slider
          value={volume}
          onChange={setVolume}
          min={0}
          max={1}
          step={0.05}
          style={{ width: "fill" }}
        />
      </VerticalView>
      <VerticalView style={styles.itemWrapper}>
        <Text>count: {count}</Text>
        <Stepper
          value={count}
          onChange={setCount}
          min={0}
          max={10}
          step={1}
          label={`${count}`}
          style={{ width: "fill" }}
        />
      </VerticalView>
      <VerticalView style={styles.itemWrapper}>
        <Text>level: {options[index]}</Text>
        <Picker
          options={options}
          selectedIndex={index}
          onChange={setIndex}
          style={{ width: "fill", height: 100 }}
        />
      </VerticalView>
      <VerticalView style={styles.itemWrapper}>
        <Text>choice: {options[choice]}</Text>
        <RadioGroup
          options={options}
          selectedIndex={choice}
          onChange={setChoice}
          style={{ width: "fill" }}
        />
      </VerticalView>
      <VerticalView style={styles.itemWrapper}>
        <Text>dial (crown): {dial}</Text>
        <Crown
          value={dial}
          onChange={setDial}
          min={0}
          max={100}
          step={5}
          style={{
            width: 100,
            height: 60,
            backgroundColor: "#222",
            borderRadius: 12,
            verticalAlignment: "center",
            horizontalAlignment: "center",
          }}
        >
          <Text style={{ color: "#0F0" }}>{dial}</Text>
        </Crown>
      </VerticalView>
      <VerticalView style={styles.itemWrapper}>
        <Text>name: {name || "(empty)"}</Text>
        <TextInput
          value={name}
          onChange={setName}
          placeholder="enter name"
          style={{
            width: "fill",
            height: 64,
            backgroundColor: "#222",
            borderRadius: 8,
            padding: 8,
          }}
        />
      </VerticalView>
      <VerticalView style={styles.itemWrapper}>
        <Button
          onPress={() => setPressed("tapped")}
          onLongPress={() => setPressed("long-pressed!")}
          style={{
            width: "fill",
            height: 40,
            backgroundColor: "#3C4043",
            borderRadius: 8,
            verticalAlignment: "center",
            horizontalAlignment: "center",
          }}
        >
          <Text>{pressed}</Text>
        </Button>
      </VerticalView>
      <VerticalView style={styles.itemWrapper}>
        <Text>touchable taps: {taps}</Text>
        <Touchable
          onPress={() => setTaps(taps + 1)}
          onLongPress={() => setTaps(0)}
          activeOpacity={0.4}
          style={{
            width: "fill",
            height: 60,
            backgroundColor: "#1E3A5F",
            borderRadius: 12,
            verticalAlignment: "center",
            horizontalAlignment: "center",
          }}
        >
          <Image
            src="img.jpg"
            resizeMode="cover"
            style={{
              width: "fill",
              height: 80,
              borderRadius: 8,
            }}
          />
          <Text
            style={{
              backgroundColor: "rgba(0,0,0,0.5)",
              borderRadius: 8,
              padding: 4,
              color: "#FFF",
            }}
          >
            tap (+1) · long-Press (reset)
          </Text>
        </Touchable>
      </VerticalView>
    </ScalingScrollView>
  );
};
