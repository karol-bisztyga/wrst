// queueMicrotask: schedules fn as a microtask (runs before next macrotask)
(globalThis as any).queueMicrotask = (fn: Function): void => {
  Promise.resolve().then(() => fn());
};

// performance.now: milliseconds elapsed since runtime start
(globalThis as any).performance = {
  now: (): number =>
    ((globalThis as any).native?.performanceNow?.() as number) ?? 0,
};
