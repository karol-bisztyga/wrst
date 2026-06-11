let __logs: string[] = [];

declare const native: {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
};

function serialize(a: any): string {
  if (typeof a !== "object" || a === null) return String(a);
  const v = a.valueOf?.();
  if (v !== a && v !== undefined) return serialize(v);
  return JSON.stringify(a);
}

(globalThis as any).console = {
  log: (...args: any[]) => native.log(args.map(serialize)),
  warn: (...args: any[]) => native.warn(args.map(serialize)),
  error: (...args: any[]) => native.error(args.map(serialize)),
  info: (...args: any[]) => native.log(args.map(serialize)),
};

(globalThis as any).getLogs = () => __logs;
