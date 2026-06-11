import { build, type BuildOptions } from "esbuild";
import { equalityPlugin } from "./plugins/equalityPlugin.ts";

export type WrstBundleInput = {
  /** The app entry file (e.g. the project's src/entry.ts). */
  entry: string;
  /** Output file path. */
  outfile: string;
  /** Minify the output (release builds). */
  minify?: boolean;
};

// The single source of truth for how a wrst app bundle is compiled. The dev
// server (watch) and the one-shot/release builds all go through this, so the
// output is identical regardless of how it's invoked. Runs in QuickJS, so:
// platform=neutral, format=iife, classic JSX via the `jsx` global factory.
export function wrstBuildOptions({
  entry,
  outfile,
  minify = false,
}: WrstBundleInput): BuildOptions {
  return {
    entryPoints: [entry],
    bundle: true,
    outfile,
    platform: "neutral",
    format: "iife",
    minify,
    jsxFactory: "jsx",
    jsxFragment: "Fragment",
    plugins: [equalityPlugin()],
  };
}

// One-shot build of both the dev bundle and the minified release bundle.
export async function bundleOnce(entry: string, outdir: string): Promise<void> {
  await build(wrstBuildOptions({ entry, outfile: `${outdir}/bundle.js` }));
  await build(
    wrstBuildOptions({ entry, outfile: `${outdir}/bundle.min.js`, minify: true }),
  );
}
