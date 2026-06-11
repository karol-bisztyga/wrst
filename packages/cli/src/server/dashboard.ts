type Status = { ok: true } | { ok: false; message: string };

// A `top`-style live console: clears and redraws a fixed dashboard in place on
// every state change (build, device connect/disconnect) instead of appending
// logs. Falls back to plain appended output when stdout isn't a TTY.
export class Dashboard {
  private status: Status = { ok: true };
  private lastBuild: Date | null = null;
  private getDevices: () => string[] = () => [];
  private readonly httpUrl: string;
  private readonly wsUrl: string;

  constructor(httpPort: number, wsPort: number) {
    this.httpUrl = `http://localhost:${httpPort}/bundle.js`;
    this.wsUrl = `ws://localhost:${wsPort}`;
  }

  setDevicesProvider(fn: () => string[]): void {
    this.getDevices = fn;
  }

  markBuilt(): void {
    this.status = { ok: true };
    this.lastBuild = new Date();
    this.render();
  }

  markError(message: string): void {
    this.status = { ok: false, message };
    this.render();
  }

  refresh(): void {
    this.render();
  }

  render(): void {
    const devices = this.getDevices();
    const lines: string[] = [];

    lines.push("  wrst dev server");
    lines.push("");
    lines.push(`  bundle  ${this.httpUrl}`);
    lines.push(`  socket  ${this.wsUrl}`);
    lines.push("");
    lines.push(
      `  status      ${this.status.ok ? "✅ ok" : `❌ ${this.status.message}`}`,
    );
    lines.push(
      `  last build  ${this.lastBuild ? formatTime(this.lastBuild) : "-"}`,
    );
    lines.push("");
    lines.push(`  devices (${devices.length})`);
    if (devices.length === 0) {
      lines.push("    (none connected)");
    } else {
      devices.forEach((d, i) => lines.push(`    ${i + 1}. ${d}`));
    }
    lines.push("");
    lines.push("  [r] reload all clients   [ctrl+c] quit");

    const out = lines.join("\n") + "\n";
    if (process.stdout.isTTY) {
      // Clear screen + scrollback, move cursor home, then draw.
      process.stdout.write(`\x1b[2J\x1b[3J\x1b[H${out}`);
    } else {
      process.stdout.write(`${out}\n`);
    }
  }
}

function formatTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
}
