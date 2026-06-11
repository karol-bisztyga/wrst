import { registerEffect } from "../effects.ts";

export function useEffect(
  fn: () => void | (() => void),
  deps?: any[],
): void {
  const depIds =
    deps === undefined
      ? null
      : deps
          .map((d) => d?.toJSON?.()?.["__stateRef"])
          .filter((id): id is string => typeof id === "string");

  registerEffect(fn, depIds);
}
