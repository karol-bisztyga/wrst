let _deps: string[] | null = null;

export function startTracking(): void {
  _deps = [];
}

export function stopTracking(): string[] {
  const deps = _deps ?? [];
  _deps = null;
  return deps;
}

// Called by the state proxy's get() whenever a state value is read.
// Recorded only when tracking is active (inside a computed() call).
export function recordRead(id: string): void {
  _deps?.push(id);
}
