import { init } from "./commands/init.ts";
import { start } from "./commands/start.ts";
import { sync } from "./commands/sync.ts";
import {
  runAppleWatch,
  runWearOs,
  buildAppleWatch,
  buildWearOs,
  buildReleaseAppleWatch,
  buildReleaseWearOs,
} from "./commands/native.ts";
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
    case "run:apple-watch":
      await runAppleWatch(args);
      break;
    case "run:wear-os":
      await runWearOs(args);
      break;
    case "build:apple-watch":
      await buildAppleWatch(args);
      break;
    case "build:wear-os":
      await buildWearOs(args);
      break;
    case "build-release:apple-watch":
      await buildReleaseAppleWatch(args);
      break;
    case "build-release:wear-os":
      await buildReleaseWearOs(args);
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
