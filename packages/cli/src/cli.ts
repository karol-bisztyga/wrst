import { init } from "./commands/init.ts";
import { start } from "./commands/start.ts";
import { sync } from "./commands/sync.ts";
import { runIos, runAndroid, buildIos, buildAndroid } from "./commands/native.ts";
import { help } from "./commands/help.ts";

const [, , command, ...args] = process.argv;

async function main(): Promise<void> {
  switch (command) {
    case "init":
      await init(args);
      break;
    case "start":
      await start(args);
      break;
    case "sync":
      await sync(args);
      break;
    case "run-ios":
      await runIos(args);
      break;
    case "run-android":
      await runAndroid(args);
      break;
    case "build-ios":
      await buildIos(args);
      break;
    case "build-android":
      await buildAndroid(args);
      break;
    case "help":
    case "--help":
    case "-h":
    case undefined:
      help();
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      help();
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
