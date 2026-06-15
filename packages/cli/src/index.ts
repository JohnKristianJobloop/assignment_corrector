#!/usr/bin/env node
import { runPublish } from "./models/publish.js";
import { runSubmit } from "./models/submit.js";
import { runList } from "./models/list.js";
import { runDetails } from "./models/details.js";
import { runHelp } from "./models/help.js";


const argv = process.argv.slice(2);
const exitCode =
  argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help"
    ? runHelp()
    : argv[0] === "publish"
      ? await runPublish(argv.slice(1))
      : argv[0] === "list"
        ? await runList(argv.slice(1))
        : argv[0] === "details"
          ? await runDetails(argv.slice(1))
          : await runSubmit(argv);
process.exit(exitCode);
