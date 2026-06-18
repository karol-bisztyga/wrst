type ConfigNative = { nativeSetAppConfig: (backgroundColor: string) => void };

function native(): ConfigNative | undefined {
  return (globalThis as any).native;
}

export type AppConfig = {
  appBackgroundColor: string;
};

let configured = false;

// Set app-wide config once at module load. Applied on each bundle eval, so it
// re-applies on live reload. Invalid colors throw on the native side and surface
// as the error screen.
export function createAppConfig(config: AppConfig): void {
  if (configured) throw new Error("createAppConfig already called");
  configured = true;
  native()?.nativeSetAppConfig(String(config.appBackgroundColor));
}
