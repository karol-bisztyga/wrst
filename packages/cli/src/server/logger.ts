// Append-mode dev-server console: a banner once at startup, then scrolling
// timestamped lines for builds, device connect/disconnect, and forwarded app
// logs. Plain stdout (no screen clearing) so scrollback / grep / piping work.

const useColor = process.stdout.isTTY === true;
const wrap = (code: string) => (s: string) =>
  useColor ? `\x1b[${code}m${s}\x1b[0m` : s;
const dim = wrap("2");
const bold = wrap("1");
const red = wrap("31");
const green = wrap("32");
const yellow = wrap("33");
const cyan = wrap("36");

function ts(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function line(s = ""): void {
  process.stdout.write(s + "\n");
}

function event(text: string): void {
  line(`${dim(ts())}  ${text}`);
}

export function banner(httpUrl: string, wsUrl: string): void {
  line();
  line(bold("  wrst dev server"));
  line(`  bundle  ${httpUrl}`);
  line(`  socket  ${wsUrl}`);
  line(dim("  [r] reload all clients"));
  line(dim("  [l] list devices"));
  line(dim("  [ctrl+c][q] quit"));
  line();
}

// Print the currently connected devices (the `l` key).
export function deviceList(names: string[]): void {
  if (names.length === 0) {
    event("[l] no devices connected");
    return;
  }
  event(`[l] devices (${names.length}):`);
  names.forEach((n, i) => line(`              ${i + 1}. ${n}`));
}

// Report the result of a manual reload (the `r` key).
export function reloadSent(names: string[]): void {
  if (names.length === 0) {
    event(dim("[r] no devices connected"));
    return;
  }
  event(`[r] sent reload signal to:`);
  names.forEach((n, i) => line(`              ${i + 1}. ${n}`));
}

export function buildOk(): void {
  event(green("build ok"));
}

export function buildError(message: string): void {
  event(red("build failed"));
  for (const l of message.split("\n")) line(`  ${red(l)}`);
}

export function deviceConnected(name: string): void {
  event(green(`+ ${name}`));
}

export function deviceDisconnected(name: string): void {
  event(dim(`- ${name}`));
}

// A log forwarded from an app running on a device.
export function appLog(device: string, level: string, message: string): void {
  const body =
    level === "error"
      ? red(message)
      : level === "warn"
        ? yellow(message)
        : message;
  line(`${dim(ts())}  ${cyan(`[${device}]`)} ${body}`);
}
