import { Companion, VerticalView, Text, View, useState, useEffect } from "wrst";
import { Component } from "wrst";
import { StyledButton } from "./components/StyledButton.tsx";

// The companion 3-tier pattern: ask the phone when it's reachable, else fetch
// directly from the watch, else fall back to a cached value. `isCompanionAvailable`
// is a reactive proxy; coerce it to a primitive for plain-JS branching.
const isAvailable = () => String(Companion.isCompanionAvailable) === "true";

const CACHE_KEY = "companion:lastData";

export const CompanionScreen: Component = () => {
  const [status, setStatus] = useState("idle");
  const [data, setData] = useState(localStorage.getItem(CACHE_KEY) ?? "-");
  const [reason, setReason] = useState(String(Companion.reason ?? ""));

  useEffect(() => {
    const sub = Companion.onMessage((msg) => {
      const value =
        typeof msg === "object" && msg ? JSON.stringify(msg) : String(msg);
      localStorage.setItem(CACHE_KEY, value);
      setData(value);
      setStatus("from companion");
    });
    return () => sub.unsubscribe();
  }, []);

  const refresh = () => {
    setReason(String(Companion.reason ?? ""));
    if (isAvailable()) {
      setStatus("asking phone...");
      Companion.sendMessage({ type: "getData", at: Date.now() });
      return;
    }
    setStatus("fetching...");
    fetch("https://worldtimeapi.org/api/timezone/Etc/UTC")
      .then((r) => r.json())
      .then((j) => {
        const value = String(j.datetime ?? "ok");
        localStorage.setItem(CACHE_KEY, value);
        setData(value);
        setStatus("from fetch");
      })
      .catch(() => {
        setData(localStorage.getItem(CACHE_KEY) ?? "-");
        setStatus("from cache");
      });
  };

  return (
    <VerticalView
      style={{
        width: "fill",
        height: "fill",
        backgroundColor: "#000",
        horizontalAlignment: "center",
        padding: 10,
      }}
    >
      <Text style={{ color: "#F00" }}>Companion</Text>
      <View style={{ height: 6 }} />
      <Text style={{ color: "#fff" }}>{`available: ${isAvailable()}`}</Text>
      <Text style={{ color: "#9cf" }}>{`reason: ${reason || "-"}`}</Text>
      <Text style={{ color: "#9cf" }}>{`status: ${status}`}</Text>
      <Text style={{ color: "#fff" }}>{`data: ${data}`}</Text>
      <View style={{ height: 8 }} />
      <StyledButton width={120} height={36} label="Refresh" onPress={refresh} />
    </VerticalView>
  );
};
