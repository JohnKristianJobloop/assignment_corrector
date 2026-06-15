import { createServer } from "./createServer.js";
import { seedAssignments } from "./seedAssignments.js";

const port = Number(process.env.PORT ?? 8080);
// `|| null` (ikke `??`) slik at en tom streng (f.eks. uutfylt compose-variabel)
// behandles som «ikke satt» og faller tilbake på default-mappa.
const dir = process.env.ASSIGNMENTS_DIRECTORY || null;
// Admin-token for publisering. createServer trimmer verdien (usynlig etterstilt
// whitespace fra Render/Docker-dashboards), så vi sender den rå videre her.
const publishToken = process.env.PUBLISH_TOKEN;

if (publishToken == null || publishToken == undefined) console.error("missing publish token:", publishToken);

console.log(publishToken);

// Seed image-bakte oppgaver inn på den persistente disken før serveren laster
// registeret. Hopper over hvis SEED_ASSIGNMENTS_DIR ikke er satt (lokal kjøring)
// eller hvis vi ikke har en eksplisitt mål-mappe.
const seedDir = process.env.SEED_ASSIGNMENTS_DIR || null;
if (seedDir != null && dir != null) {
  const copied = await seedAssignments(seedDir, dir);
  if (copied.length > 0) {
    console.log(`Seedet ${copied.length} oppgave(r): ${copied.join(", ")}`);
  }
}

const server =
  dir == null
    ? await createServer({ port, publishToken })
    : await createServer({ port, publishToken, assignmentsDir: dir });
console.log(`Oppgaveretter (JS/TS + C#) lytter på ${server.url}`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void server.close().then(() => process.exit(0));
  });
}
