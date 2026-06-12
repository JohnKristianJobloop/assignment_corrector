#!/usr/bin/env node
import { runPublish } from "./models/publish.js";
import { runSubmit } from "./models/submit.js";


const argv = process.argv.slice(2);
const exitCode =
  argv[0] === "publish" ? await runPublish(argv.slice(1)) : await runSubmit(argv);
process.exit(exitCode);
