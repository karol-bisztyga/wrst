import { WebSocketServer, WebSocket } from "ws";

type Client = { ws: WebSocket; name: string };

// onChange is called whenever the connected-device set changes (connect, hello
// with a name, disconnect) so the dashboard can re-render.
export function startSocketServer(port: number, onChange: () => void = () => {}) {
  const wss = new WebSocketServer({ port });

  const clients: Client[] = [];

  wss.on("connection", (ws) => {
    const client: Client = { ws, name: "unknown device" };
    clients.push(client);
    onChange();

    // Clients send { type: "hello", name } once on connect so we can list them.
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "hello" && typeof msg.name === "string") {
          client.name = msg.name;
          onChange();
        }
      } catch {
        // ignore non-JSON messages
      }
    });

    ws.on("close", () => {
      const index = clients.indexOf(client);
      if (index !== -1) clients.splice(index, 1);
      onChange();
    });
  });

  return {
    // A "re-pull" nudge. Clients always re-fetch /bundle.js, which is the source
    // of truth (bundle or build error).
    broadcast(message: string) {
      clients.forEach((c) => {
        if (c.ws.readyState === c.ws.OPEN) {
          c.ws.send(message);
        }
      });
    },

    devices(): string[] {
      return clients.map((c) => c.name);
    },
  };
}
