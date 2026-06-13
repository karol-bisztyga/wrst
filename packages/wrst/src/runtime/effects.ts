import { beginBatch, endEffectBatch, setOnBatchEnd } from "./stateBatch.ts";

type EffectFn = () => void | (() => void);

type Effect = {
  fn: EffectFn;
  // null  = run after every state change (no deps array passed)
  // []    = run once on mount only
  // [...] = run on mount + when any listed state ID changes
  deps: string[] | null;
  cleanup: (() => void) | undefined;
  mounted: boolean;
};

const effects: Effect[] = [];

export function registerEffect(fn: EffectFn, deps: string[] | null): void {
  effects.push({ fn, deps, cleanup: undefined, mounted: false });
}

// Tear down every registered effect (calling its cleanup), then clear the list.
// Run at the start of each full render() so navigating/reloading unmounts the
// previous tree's effects - e.g. a screen's sensor subscriptions stop. The
// fresh render then re-registers and re-mounts the current screen's effects.
export function teardownEffects(): void {
  effects.forEach((effect) => effect.cleanup?.());
  effects.length = 0;
}

export function runInitialEffects(): void {
  effects.forEach((effect) => {
    if (!effect.mounted) {
      effect.mounted = true;
      const cleanup = effect.fn();
      effect.cleanup = typeof cleanup === "function" ? cleanup : undefined;
    }
  });
}

const MAX_EFFECT_DEPTH = 50;

export function runEffectsForChanges(
  changedIds: Set<string>,
  depth: number = 0,
): void {
  if (depth >= MAX_EFFECT_DEPTH) {
    throw new Error(
      "useEffect: Maximum update depth exceeded. An effect is likely updating its own dependencies.",
    );
  }

  const toRun = effects.filter((effect) => {
    if (!effect.mounted) return false;
    if (effect.deps === null) return true;
    if (effect.deps.length === 0) return false;
    return effect.deps.some((id) => changedIds.has(id));
  });

  if (toRun.length === 0) return;

  // Run effects inside a mini-batch so their setState calls are collected,
  // then flush without triggering onBatchEnd to avoid re-entering this loop.
  beginBatch();
  toRun.forEach((effect) => {
    effect.cleanup?.();
    const cleanup = effect.fn();
    effect.cleanup = typeof cleanup === "function" ? cleanup : undefined;
  });
  const newChanges = endEffectBatch();

  if (newChanges.size > 0) {
    runEffectsForChanges(newChanges, depth + 1);
  }
}

setOnBatchEnd((changedIds) => {
  if (changedIds.size > 0) runEffectsForChanges(changedIds);
});
