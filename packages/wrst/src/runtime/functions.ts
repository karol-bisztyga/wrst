import { call } from "../registry/functions";

(globalThis as any).call = (id: string, ...args: any[]) => {
  return call(id, ...args);
};
