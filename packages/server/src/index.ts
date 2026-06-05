import { createServer } from "./createServer.js";

const port = Number(process.env.PORT ?? 8080);

const server = await createServer({ port });
console.log(`Oppgaveretter (JS/TS) lytter på ${server.url}`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void server.close().then(() => process.exit(0));
  });
}
