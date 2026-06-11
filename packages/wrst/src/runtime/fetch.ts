import { register, registry } from "../registry/functions.ts";

type FetchOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

type FetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<any>;
  text: () => Promise<string>;
};

export function fetch(
  url: string,
  options: FetchOptions = {},
): Promise<FetchResponse> {
  return new Promise((resolve, reject) => {
    let resolveId: string;
    let rejectId: string;

    resolveId = register((response: any) => {
      registry.delete(resolveId);
      registry.delete(rejectId);
      resolve({
        ok: response.ok as boolean,
        status: response.status as number,
        statusText: response.statusText as string,
        json: () =>
          Promise.resolve(
            response.jsonBody ?? JSON.parse(response.rawBody),
          ),
        text: () => Promise.resolve(response.rawBody as string),
      });
    });

    rejectId = register((error: string) => {
      registry.delete(resolveId);
      registry.delete(rejectId);
      reject(new Error(error));
    });

    (globalThis as any).native?.nativeFetch(
      url,
      JSON.stringify(options),
      resolveId,
      rejectId,
    );
  });
}

(globalThis as any).fetch = fetch;
