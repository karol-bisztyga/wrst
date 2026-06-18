type StorageNative = {
  nativeStorageGet: (key: string) => string | null;
  nativeStorageSet: (key: string, value: string) => void;
  nativeStorageRemove: (key: string) => void;
  nativeStorageClear: () => void;
};

function native(): StorageNative | undefined {
  return (globalThis as any).native;
}

// Web-compatible, synchronous, string-only key/value store backed by
// Android SharedPreferences. Keys and values are coerced to strings (and
// state proxies unwrapped) exactly like the browser does.
export const localStorage = {
  getItem(key: string): string | null {
    return native()?.nativeStorageGet(String(key)) ?? null;
  },
  setItem(key: string, value: string): void {
    native()?.nativeStorageSet(String(key), String(value));
  },
  removeItem(key: string): void {
    native()?.nativeStorageRemove(String(key));
  },
  clear(): void {
    native()?.nativeStorageClear();
  },
};

(globalThis as any).localStorage = localStorage;
