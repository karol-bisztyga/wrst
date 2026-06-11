import {
  BuildContext,
  BuildResult,
  Message,
  context,
  PluginBuild,
} from "esbuild";
import { wrstBuildOptions } from "../bundler.ts";

const getFileNameFromPath = (path: string) => {
  return path.split("/").slice(-1)[0];
};

function formatBuildError(errors: Message[]): string {
  const e = errors[0];
  if (!e) return "Build failed";
  const loc = e.location;
  return loc ? `${loc.file}:${loc.line}:${loc.column}: ${e.text}` : e.text;
}

export async function startWatcher(
  entry: string,
  outdir: string,
  onRebuild: () => void,
  onBuildError: (message: string) => void,
) {
  const config = [
    { outputFileName: `${outdir}/bundle.js`, minify: false },
    { outputFileName: `${outdir}/bundle.min.js`, minify: true },
  ];

  const expectedFiles = config.map((c) =>
    getFileNameFromPath(c.outputFileName),
  );

  let updatedFiles = new Set<string>();
  let timeout: NodeJS.Timeout | null = null;
  let errorReported = false; // dedup: both contexts fail on the same error

  const resetState = () => {
    updatedFiles.clear();
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  const startTimeout = () => {
    if (timeout) return;

    timeout = setTimeout(() => {
      if (updatedFiles.size !== expectedFiles.length) {
        resetState();
      }
    }, 1000);
  };

  const updateCallback = (fileName: string) => {
    updatedFiles.add(fileName);

    // start timeout on first update
    startTimeout();

    // check if all files updated
    const allUpdated = expectedFiles.every((f) => updatedFiles.has(f));

    if (allUpdated) {
      onRebuild();
      resetState();
    }
  };

  const getContext = async (
    outputFileName: string,
    minify: boolean,
  ): Promise<BuildContext> => {
    const opts = wrstBuildOptions({ entry, outfile: outputFileName, minify });
    return await context({
      ...opts,
      logLevel: "silent", // errors surface via onEnd → dashboard, keep console clean
      plugins: [
        ...(opts.plugins ?? []),
        {
          name: "rebuild-listener",
          setup(build: PluginBuild) {
            build.onEnd((result: BuildResult) => {
              if (result.errors.length === 0) {
                errorReported = false;
                updateCallback(getFileNameFromPath(outputFileName));
              } else {
                if (!errorReported) {
                  errorReported = true;
                  onBuildError(formatBuildError(result.errors));
                }
              }
            });
          },
        },
      ],
    });
  };

  for (const { outputFileName, minify } of config) {
    const ctx = await getContext(outputFileName, minify);
    await ctx.watch();
  }
}
