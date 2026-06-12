import { mkdtemp, readFile, rm } from "node:fs/promises";
import { PublishArgs, PublishOptions } from "./interfaces/clientInterfaces";
import { DEFAULT_SERVER, PUBLISH_TERMINAL } from "./globals";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { AcceptedMessage, RejectedMessage, TestResultMessage, ReportMessage, ErrorMessage, ServerMessage } from "@oppgaveretter/protocol";
import { stream } from "./client";

export function parsePublishArgs(argv: string[]): PublishArgs {
  let repo: string | undefined;
  let server = DEFAULT_SERVER;
  let token = process.env.PUBLISH_TOKEN;
  let force = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--server") server = argv[++i];
    else if (arg === "--token") token = argv[++i];
    else if (arg === "--force") force = true;
    else if (!arg.startsWith("--")) repo = arg;
  }

  if (!repo) {
    console.error(
      "Bruk: oppgavehjelper publish <repo-mappe> [--server ws://host:port] [--token <token>] [--force]",
    );
    process.exit(2);
  }
  if (!token) {
    console.error(
      "Mangler token. Oppgi --token <token> eller sett PUBLISH_TOKEN.",
    );
    process.exit(2);
  }
  return { repo, server, token, force };
}

/** Lager en git bundle av HEAD i repo-mappa og returnerer den som Buffer. */
export async function createBundle(repo: string): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), "oppgave-bundle-"));
  const bundlePath = path.join(dir, "repo.bundle");
  try {
    await runGit(repo, ["bundle", "create", bundlePath, "HEAD"]);
    return await readFile(bundlePath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export function runGit(cwd: string, args: string[]): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("git", args, { cwd, stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr?.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`git ${args[0]} feilet: ${stderr.trim()}`)),
    );
  });
}

export async function runPublish(argv: string[]): Promise<number> {
  const args = parsePublishArgs(argv);

  let bundle: Buffer;
  try {
    bundle = await createBundle(args.repo);
  } catch (e) {
    console.error(`Kunne ikke lage git bundle: ${e instanceof Error ? e.message : e}`);
    return 1;
  }

  console.log(`Publiserer oppgave fra ${args.repo} …\n`);
  let published = false;
  for await (const msg of publishAssignment({
    server: args.server,
    filename: path.basename(args.repo) + ".bundle",
    bundle: bundle.toString("base64"),
    token: args.token!,
    force: args.force,
  })) {
    if (msg.type === "published") {
      published = true;
      console.log(`\nPublisert: ${msg.assignment}`);
    } else {
      renderResult(msg);
    }
  }
  return published ? 0 : 1;
}
function renderResult(msg: AcceptedMessage | RejectedMessage | TestResultMessage | ReportMessage | ErrorMessage) {
  if (msg.type === "error") console.error(msg.message);
}

export function publishAssignment(
  opts: PublishOptions,
): AsyncGenerator<ServerMessage> {
  return stream(
    opts.server,
    {
      type: "publish-assignment",
      filename: opts.filename,
      bundle: opts.bundle,
      encoding: "base64",
      token: opts.token,
      force: opts.force,
    },
    PUBLISH_TERMINAL,
  );
}