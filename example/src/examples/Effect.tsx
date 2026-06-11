import { HorizontalView } from "wrst";
import { VerticalView } from "wrst";
import { View, Text, useState, useEffect, ScalingScrollView } from "wrst";
import { Component } from "wrst";
import { StyledButton } from "./components/StyledButton.tsx";

const rnd = () => Math.floor(Math.random() * 100);

export const Effect: Component = () => {
  // primary state - changed by buttons
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [flag, setFlag] = useState(false);
  const [str, setStr] = useState("");

  // derived via useEffect
  const [onMount, setOnMount] = useState(0);
  const [reactToX, setReactToX] = useState(0);
  const [doubleX, setDoubleX] = useState(0);
  const [sumXY, setSumXY] = useState(0);
  const [effectColor, setEffectColor] = useState("#888");
  const [effectStr, setEffectStr] = useState("?");

  // --- effects ---
  useEffect(() => {
    setStr(`str flag from x=${x}`);
  }, [x]);
  useEffect(() => {
    setOnMount(rnd());
  }, []); // once on mount
  useEffect(() => {
    setReactToX(x + 1);
  }, [x]); // tracks x
  useEffect(() => {
    setDoubleX(x * 2);
  }, [x]); // tracks x
  useEffect(() => {
    setSumXY(x + y);
  }, [x, y]); // tracks both
  useEffect(() => {
    setEffectStr(x > 5 ? "big" : "small");
  }, [x]);
  useEffect(() => {
    setEffectColor(x % 2 === 0 ? "#F00" : "#0F0");
  }, [x]);

  const styles = {
    section: {
      borderColor: "#FFF",
      borderWidth: 1,
      padding: 5,
      width: "fill",
      horizontalAlignment: "center",
    },
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
          width={60}
          height={30}
          onPress={() => setX((p) => p + 1)}
          label="x++"
        />
        <View style={{ size: 4 }} />
        <StyledButton
          width={60}
          height={30}
          onPress={() => setY(rnd())}
          label="y=rnd"
        />
      </HorizontalView>
      <View style={{ size: 4 }} />
      <HorizontalView>
        <StyledButton
          width={60}
          height={30}
          onPress={() => setFlag((p) => !p)}
          label="toggle"
        />
        <View style={{ size: 4 }} />
        <StyledButton
          width={60}
          height={30}
          onPress={() => {
            setX(0);
            setY(0);
          }}
          label="reset"
        />
      </HorizontalView>
      <View style={{ size: 4 }} />

      {/* ─────────────────── TESTS ─────────────────── */}
      <ScalingScrollView style={{ width: "fill", backgroundColor: "#000" }}>
        {/* ─────────────────── DIRECT STATE ─────────────────── */}
        <VerticalView style={styles.section}>
          <Text style={{ color: "#F00" }}>DIRECT STATE</Text>
          <Text>[x directly] ({x})</Text>
          <Text>[y directly] ({y})</Text>
          <Text>[flag directly] ({flag})</Text>
          <Text>[str] ({str})</Text>
        </VerticalView>

        {/* ─────────────────── ARITHMETIC ─────────────────── */}
        <VerticalView style={styles.section}>
          <Text style={{ color: "#F00" }}>ARITHMETIC</Text>
          <Text>[x+1 = ] ({x + 1})</Text>
          <Text>[x*2 = ] ({x * 2})</Text>
          <Text>[x-y = ] ({x - y})</Text>
          <Text>[x+y = ] ({x + y})</Text>
          <Text>[-x = ] ({-x})</Text>
          <Text>[|x-y| = ] ({Math.abs(x - y)})</Text>
          <Text>[x%2 = ] ({x % 2})</Text>
        </VerticalView>

        {/* ─────────────────── TEMPLATE LITERALS ─────────────────── */}
        <VerticalView style={styles.section}>
          <Text style={{ color: "#F00" }}>TEMPLATE LITERALS</Text>
          <Text>{`[tmpl] x=${x}`}</Text>
          <Text>{`[tmpl] x=${x} y=${y}`}</Text>
          <Text>{`[tmpl] sum=${x + y} diff=${x - y}`}</Text>
        </VerticalView>

        {/* ─────────────────── COMPARISONS (===, !==) ─────────────────── */}
        <VerticalView style={styles.section}>
          <Text style={{ color: "#F00" }}>COMPARISONS (===, !==)</Text>
          <Text>[x===y should flip when equal] ({x === y})</Text>
          <Text>[x===0 true only when x=0] ({x === 0})</Text>
          <Text>[x!==y opposite of above] ({x !== y})</Text>
          <Text>[x===1] ({x === 1})</Text>
        </VerticalView>

        {/* ─────────────────── COMPARISONS (>, <, >=) ─────────────────── */}
        <VerticalView style={styles.section}>
          <Text style={{ color: "#F00" }}>COMPARISONS ({">, <, >="})</Text>
          <Text>{`[x>0 false only at start] (${x > 0})`}</Text>
          <Text>{`[x>y] (${x > y})`}</Text>
          <Text>{`[x>=y] (${x >= y})`}</Text>
          <Text>{`[x>5 changes at 6] (${x > 5})`}</Text>
        </VerticalView>

        {/* ─────────────────── TERNARY ─────────────────── */}
        <VerticalView style={styles.section}>
          <Text style={{ color: "#F00" }}>TERNARY</Text>
          <Text>[big/small at 6] ({x > 5 ? "big" : "small"})</Text>
          <Text>[zero/nonzero] ({x === 0 ? "zero" : "nonzero"})</Text>
          <Text>[even/odd] ({x % 2 === 0 ? "even" : "odd"})</Text>
          <Text>{`[pos/neg/zero] (${x > 0 ? "pos" : x < 0 ? "neg" : "zero"})`}</Text>
        </VerticalView>

        {/* ─────────────────── BOOLEAN QUIRKS ─────────────────── */}
        <VerticalView style={styles.section}>
          <Text style={{ color: "#F00" }}>BOOLEAN QUIRKS</Text>
          <Text>
            [flag===true ON/OFF works] ({flag === true ? "ON" : "OFF"})
          </Text>
          <Text>[flag?] ({flag ? "ON" : "OFF"})</Text>
        </VerticalView>

        {/* ─────────────────── EFFECTS ─────────────────── */}
        <VerticalView style={styles.section}>
          <Text style={{ color: "#F00" }}>EFFECTS</Text>
          <Text>[onMount random once] ({onMount})</Text>
          <Text>[reactToX = x+1] ({reactToX})</Text>
          <Text>[doubleX = x*2] ({doubleX})</Text>
          <Text>[sumXY = x+y via effect] ({sumXY})</Text>
          <Text>[effectStr big/small at 6] ({effectStr})</Text>
        </VerticalView>

        {/* ─────────────────── STYLE WITH STATE ─────────────────── */}
        <VerticalView style={styles.section}>
          <Text style={{ color: "#F00" }}>STYLE WITH STATE</Text>
          <View
            style={{ width: 30, height: 30, backgroundColor: effectColor }}
          />
        </VerticalView>

        {/* ─────────────────── PROP WITH STATE ─────────────────── */}
        <VerticalView style={styles.section}>
          <Text style={{ color: "#F00" }}>PROP WITH STATE</Text>
          <Text hidden={x % 2 === 0}>[visible when x%2 == 0]</Text>
          <Text hidden={x % 2 !== 0}>[visible when x%2 != 0]</Text>
        </VerticalView>

        {/* ─────────────────── MULTI-STATE STYLE ─────────────────── */}
        <VerticalView style={styles.section}>
          <Text style={{ color: "#F00" }}>MULTI-STATE STYLE</Text>
          <View
            style={{
              width: x % 2 === 0 ? 20 : 30,
              height: 20,
              backgroundColor: x % 2 === 0 ? "#FF0" : "#888",
            }}
          />
        </VerticalView>
        {/* ─────────────────── END ─────────────────── */}
        <View style={{ height: 4 }} />
      </ScalingScrollView>
    </VerticalView>
  );
};
