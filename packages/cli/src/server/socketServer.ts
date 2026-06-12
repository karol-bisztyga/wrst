import { WebSocketServer, WebSocket } from "ws";

type Client = { ws: WebSocket; name: string };

// Events the dev server cares about. Clients send JSON messages:
//   { type: "hello", name }            once on connect (identifies the device)
//   { type: "log", level, message }    a forwarded app console.* call
export type SocketHandlers = {
  onConnect?: (name: string) => void;
  onDisconnect?: (name: string) => void;
  onLog?: (device: string, level: string, message: string) => void;
};

export function startSocketServer(port: number, handlers: SocketHandlers = {}) {
  const wss = new WebSocketServer({ port });

  const clients: Client[] = [];

  wss.on("connection", (ws) => {
    const client: Client = { ws, name: "unknown device" };
    clients.push(client);

    ws.on("message", (data) => {
      let msg: any;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return; // ignore non-JSON
      }
      if (msg.type === "hello" && typeof msg.name === "string") {
        client.name = msg.name;
        handlers.onConnect?.(client.name);
      } else if (msg.type === "log" && typeof msg.message === "string") {
        handlers.onLog?.(client.name, String(msg.level ?? "log"), msg.message);
      }
    });

    ws.on("close", () => {
      const index = clients.indexOf(client);
      if (index !== -1) clients.splice(index, 1);
      handlers.onDisconnect?.(client.name);
    });
  });

  return {
    // A "re-pull" nudge. Clients always re-fetch /bundle.js, which is the source
    // of truth (bundle or build error).
    broadcast(message: string) {
      clients.forEach((c) => {
        if (c.ws.readyState === c.ws.OPEN) c.ws.send(message);
      });
    },

    devices(): string[] {
      return clients.map((c) => c.name);
    },
  };
}
