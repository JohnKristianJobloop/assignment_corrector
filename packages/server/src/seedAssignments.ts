import { cp, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * Kopierer image-bakte seed-oppgaver inn i den persistente oppgavemappa.
 *
 * På Render skygger en montert disk på `/app/assignments` for det som ble
 * `COPY`-et inn i imaget der. Derfor bakes seed-oppgavene til en egen sti
 * (`seedDir`) og kopieres inn på disken ved oppstart. Operasjonen er
 * idempotent: oppgaver som allerede finnes på disken (publiserte eller
 * tidligere seedede) røres ikke, så runtime-data overlever deploys.
 *
 * @returns id-ene som faktisk ble kopiert (tom liste hvis ingenting nytt).
 */
export async function seedAssignments(
  seedDir: string,
  targetDir: string,
): Promise<string[]> {
  await mkdir(targetDir, { recursive: true });

  let seeds: string[] = [];
  try {
    seeds = (await readdir(seedDir, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    // Ingen seed-mappe (f.eks. lokal kjøring uten image) → ingenting å gjøre.
    return [];
  }

  const existing = new Set(await readdir(targetDir).catch(() => []));
  const copied: string[] = [];
  for (const id of seeds) {
    if (existing.has(id)) continue; // ikke overskriv publiserte/oppdaterte
    await cp(path.join(seedDir, id), path.join(targetDir, id), {
      recursive: true,
    });
    copied.push(id);
  }
  return copied;
}
