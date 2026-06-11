import { register, registry } from "../registry/functions.ts";

type TimerNative = {
  nativeSetTimeout: (id: string, delay: number) => void;
  nativeClearTimeout: (id: string) => void;
  nativeSetInterval: (id: string, delay: number) => void;
  nativeClearInterval: (id: string) => void;
};

function native(): TimerNative | undefined {
  return (globalThis as any).native;
}

export function setTimeout(fn: Function, delay: number = 0): string {
  let id: string;
  id = register(() => {
    registry.delete(id);
    fn();
  });
  native()?.nativeSetTimeout(id, delay);
  return id;
}

export function clearTimeout(id: string): void {
  const realId = String(id);
  registry.delete(realId);
  native()?.nativeClearTimeout(realId);
}

export function setInterval(fn: Function, delay: number): string {
  const id = register(fn);
  native()?.nativeSetInterval(id, delay);
  return id;
}

export function clearInterval(id: string): void {
  const realId = String(id);
  registry.delete(realId);
  native()?.nativeClearInterval(realId);
}

(globalThis as any).setTimeout = setTimeout;
(globalThis as any).clearTimeout = clearTimeout;
(globalThis as any).setInterval = setInterval;
(globalThis as any).clearInterval = clearInterval;
