import { HorizontalView } from "@wrst/core";
import { VerticalView } from "@wrst/core";
import { View, Text, ScrollView, useState } from "@wrst/core";
import { Component } from "@wrst/core";
import { StyledButton } from "./components/StyledButton.tsx";

const clip = (s: string, n = 60): string =>
  s.length > n ? s.slice(0, n) + "..." : s;

const runFetch = (
  url: string,
  options: Parameters<typeof fetch>[1],
  setResult: (s: string) => void,
) => {
  setResult("loading...");
  fetch(url, options)
    .then((r) =>
      r.text().then((body) => {
        setResult(`ok=${r.ok} ${r.status} | ${clip(body)}`);
      }),
    )
    .catch((e: Error) => setResult(`rejected: ${e.message}`));
};

export const Fetch: Component = () => {
  const [get200, setGet200] = useState("idle");
  const [get404, setGet404] = useState("idle");
  const [get500, setGet500] = useState("idle");
  const [get400, setGet400] = useState("idle");
  const [post200, setPost200] = useState("idle");
  const [netErr, setNetErr] = useState("idle");

  const styles = {
    button: { width: 70, height: 30 },
    buttonLabel: {},
    runBtn: { width: 50, height: 22 },
    section: {
      borderColor: "#FFF",
      borderWidth: 1,
      padding: 5,
      width: "fill",
      horizontalAlignment: "center",
    },
  };

  const resetAll = () => {
    setGet200("idle");
    setGet404("idle");
    setGet500("idle");
    setGet400("idle");
    setPost200("idle");
    setNetErr("idle");
  };

  const runAll = () => {
    runFetch("https://jsonplaceholder.typicode.com/todos/1", {}, setGet200);
    runFetch("https://httpbin.org/status/404", {}, setGet404);
    runFetch("https://httpbin.org/status/500", {}, setGet500);
    runFetch("https://httpbin.org/status/400", {}, setGet400);
    runFetch(
      "https://httpbin.org/post",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hello: "world" }),
      },
      setPost200,
    );
    runFetch("https://this-domain-does-not-exist-xyz.invalid/", {}, setNetErr);
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
      <View style={{ height: 4 }} />
      <HorizontalView style={{ verticalAlignment: "center" }}>
        <StyledButton width={80} label="run all" onPress={runAll} />
        <View style={{ size: 4 }} />
        <StyledButton width={80} label="reset" onPress={resetAll} />
      </HorizontalView>
      <View style={{ size: 4 }} />

      {/* ─────────────────── TESTS ─────────────────── */}
      <ScrollView style={{ width: "fill", backgroundColor: "#000" }}>
        {/* ─────────────────── GET 200 ─────────────────── */}
        <VerticalView style={styles.section}>
          <Text style={{ color: "#F00" }}>GET 200 - jsonplaceholder</Text>
          <Text>[result] ({get200})</Text>
          <Text>[promise resolves, ok=true, status=200]</Text>
          <StyledButton
            label="run"
            onPress={() =>
              runFetch(
                "https://jsonplaceholder.typicode.com/todos/1",
                {},
                setGet200,
              )
            }
          />
        </VerticalView>

        {/* ─────────────────── GET 404 ─────────────────── */}
        <VerticalView style={styles.section}>
          <Text style={{ color: "#F00" }}>GET 404 - httpbin</Text>
          <Text>[result] ({get404})</Text>
          <Text>[promise resolves, ok=false, status=404]</Text>
          <StyledButton
            label="run"
            onPress={() =>
              runFetch("https://httpbin.org/status/404", {}, setGet404)
            }
          />
        </VerticalView>

        {/* ─────────────────── GET 500 ─────────────────── */}
        <VerticalView style={styles.section}>
          <Text style={{ color: "#F00" }}>GET 500 - httpbin</Text>
          <Text>[result] ({get500})</Text>
          <Text>[promise resolves, ok=false, status=500]</Text>
          <StyledButton
            label="run"
            onPress={() =>
              runFetch("https://httpbin.org/status/500", {}, setGet500)
            }
          />
        </VerticalView>

        {/* ─────────────────── GET 400 ─────────────────── */}
        <VerticalView style={styles.section}>
          <Text style={{ color: "#F00" }}>GET 400 - httpbin</Text>
          <Text>[result] ({get400})</Text>
          <Text>[promise resolves, ok=false, status=400]</Text>
          <StyledButton
            label="run"
            onPress={() =>
              runFetch("https://httpbin.org/status/400", {}, setGet400)
            }
          />
        </VerticalView>

        {/* ─────────────────── POST 200 ─────────────────── */}
        <VerticalView style={styles.section}>
          <Text style={{ color: "#F00" }}>POST 200 - httpbin</Text>
          <Text>[result] ({post200})</Text>
          <Text>[promise resolves, ok=true, echoes body]</Text>
          <StyledButton
            label="run"
            onPress={() =>
              runFetch(
                "https://httpbin.org/post",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ hello: "world" }),
                },
                setPost200,
              )
            }
          />
        </VerticalView>

        {/* ─────────────────── NETWORK ERROR ─────────────────── */}
        <VerticalView style={styles.section}>
          <Text style={{ color: "#F00" }}>network error - bad domain</Text>
          <Text>[result] ({netErr})</Text>
          <Text>[promise rejects, no ok/status]</Text>
          <StyledButton
            label="run"
            onPress={() =>
              runFetch(
                "https://this-domain-does-not-exist-xyz.invalid/",
                {},
                setNetErr,
              )
            }
          />
        </VerticalView>

        {/* ─────────────────── END ─────────────────── */}
        <View style={{ height: 4 }} />
      </ScrollView>
    </VerticalView>
  );
};
