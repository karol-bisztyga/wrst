import Link from "next/link";

const wrap = {
  maxWidth: 880,
  margin: "0 auto",
  padding: "0 24px",
};

export default function IndexPage() {
  const paragraphStyle = {
    fontSize: "clamp(17px, 2.4vw, 22px)",
    maxWidth: 620,
    margin: "20px auto 0",
  };

  return (
    <main>
      <section
        style={{ ...wrap, padding: "14vh 24px 8vh", textAlign: "center" }}
      >
        <h1
          style={{
            fontSize: "clamp(48px, 10vw, 96px)",
            lineHeight: 1.05,
            fontWeight: 900,
            letterSpacing: "0.04em",
            margin: "0 0 0.2em 0",
          }}
        >
          wrst
        </h1>
        <h1
          style={{
            fontSize: "clamp(36px, 6vw, 64px)",
            lineHeight: 1.05,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Build smartwatch apps with React and TypeScript
        </h1>
        <p style={paragraphStyle}>
          One codebase for <b>Wear OS</b> and <b>Apple Watch</b> 🤖
        </p>
        <p style={paragraphStyle}>Standalone and companion apps 📱 ↔️ ⌚</p>
        <p style={paragraphStyle}>Live reload 🔄</p>
        <p style={paragraphStyle}>
          The workflow you already know - on the wrist 🤜
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: 36,
          }}
        >
          <Link
            href="/docs"
            style={{
              background: "#111",
              color: "#fff",
              padding: "12px 22px",
              borderRadius: 10,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Get started
          </Link>
          <a
            href="https://github.com/karol-bisztyga/wrst"
            style={{
              border: "1px solid currentColor",
              padding: "12px 22px",
              borderRadius: 10,
              fontWeight: 600,
              textDecoration: "none",
              opacity: 0.85,
            }}
          >
            View on GitHub
          </a>
        </div>

        <p style={{ marginTop: 18, fontSize: 14, opacity: 0.55 }}>
          <code>npx wrst init my-app</code>
        </p>
      </section>

      <section
        style={{
          ...wrap,
          display: "grid",
          gap: 20,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          paddingBottom: "12vh",
        }}
      >
        <Feature title="📱 One codebase, two platforms">
          The same TypeScript renders natively on Wear OS (Jetpack Compose) and
          Apple Watch (SwiftUI).
        </Feature>
        <Feature title="⚛️ React-style">
          Components, <code>useState</code>, <code>useEffect</code>, navigation.
          No new mental model.
        </Feature>
        <Feature title="⚡ Live reload">
          Save and see the change on the watch instantly.
        </Feature>
        <Feature title="🤝 Standalone or companion">
          Ship a self-contained watch app, or pair it with a phone app. Designed
          to work with React Native.
        </Feature>
      </section>
    </main>
  );
}

function Feature({ title, children }) {
  return (
    <div
      style={{
        border: "1px solid rgba(128,128,128,0.25)",
        borderRadius: 14,
        padding: 22,
      }}
    >
      <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>{title}</h3>
      <p style={{ margin: 0, opacity: 0.7, fontSize: 15, lineHeight: 1.5 }}>
        {children}
      </p>
    </div>
  );
}
