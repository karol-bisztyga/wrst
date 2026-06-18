import { cp, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initCompanion } from "./initCompanion.ts";

// Extract the value of a `--flag` from argv, supporting both `--flag value` and
// `--flag=value`. Returns null when the flag is absent, "" when present without
// a value (e.g. trailing `--companion`).
function flagValue(args: string[], flag: string): string | null {
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === flag) {
      const next = args[i + 1];
      return next && !next.startsWith("-") ? next : "";
    }
    if (a.startsWith(`${flag}=`)) return a.slice(flag.length + 1);
  }
  return null;
}

// packages/cli/src/commands/init.ts → packages/cli/templates
const TEMPLATES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "templates",
);

export async function init(args: string[]): Promise<void> {
  // Companion mode: add a watch app to an EXISTING RN project (path to its root,
  // defaulting to the cwd). Different flow from the standalone scaffold below.
  const companion = flagValue(args, "--companion");
  if (companion !== null) {
    await initCompanion(companion || ".");
    return;
  }

  const name = args[0];
  if (!name) {
    console.error(
      "usage: wrst init <name>\n       wrst init --companion <path-to-rn-project>",
    );
    process.exit(1);
  }
  if (/\s/.test(name)) {
    console.error("wrst: project name must not contain spaces");
    process.exit(1);
  }

  // The single arg is the folder name AND the app name. The slug (lowercased,
  // hyphens ok) is the npm name; the id (alphanumeric only) is the bundle-id
  // segment, since Android applicationId segments can't contain hyphens.
  const dir = path.resolve(name);
  const slug = slugify(name) || "wrst-app";
  const appId = slug.replace(/-/g, "") || "app";

  if (existsSync(dir) && (await readdir(dir)).length > 0) {
    console.error(`Directory "${dir}" already exists and is not empty.`);
    process.exit(1);
  }

  // The JS project at the root, plus the native shells into apple-watch/ and
  // wear-os/ (named for the platform brand to match the rest of the toolchain
  // and avoid the which-is-which ambiguity of ios/android).
  await cp(path.join(TEMPLATES_DIR, "project"), dir, { recursive: true });
  for (const [tpl, dest] of [
    ["apple-watch", "apple-watch"],
    ["wear-os", "wear-os"],
  ] as const) {
    const src = path.join(TEMPLATES_DIR, tpl);
    if (existsSync(src))
      await cp(src, path.join(dir, dest), { recursive: true });
  }

  // Templates ship `gitignore` (a nested .gitignore would be applied by npm at
  // pack time). Rename them all back to .gitignore on scaffold.
  await renameGitignores(dir);

  await substitute(dir, {
    __APP_NAME__: name,
    __APP_SLUG__: slug,
    __APP_ID__: appId,
  });

  console.log(`\n  Created ${name} in ${dir}\n`);
  console.log("  Next steps:");
  console.log(`    cd ${name}`);
  console.log("    npm install");
  console.log("    npm start        # dev server + bundler with live reload\n");
}

async function renameGitignores(dir: string): Promise<void> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await renameGitignores(full);
    else if (entry.name === "gitignore")
      await rename(full, path.join(dir, ".gitignore"));
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function substitute(
  dir: string,
  vars: Record<string, string>,
): Promise<void> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await substitute(full, vars);
    } else {
      let content = await readFile(full, "utf8");
      let changed = false;
      for (const [key, value] of Object.entries(vars)) {
        if (content.includes(key)) {
          content = content.split(key).join(value);
          changed = true;
        }
      }
      if (changed) await writeFile(full, content);
    }
  }
}
