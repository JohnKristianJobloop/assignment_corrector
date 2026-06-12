import { defineConfig } from "tsup";

// Bygger CLI-en til ett kjørbart ESM-bunt. Protokollen (workspace-pakke)
// bunles inn (noExternal) slik at den publiserte CLI-en er selvstendig og ikke
// trenger en separat @oppgaveretter/protocol-utgivelse. `ws` holdes ekstern og
// deklareres som runtime-dependency.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",
  outDir: "dist",
  clean: true,
  noExternal: [/@JohnKristianJobloop\//],
  external: ["ws"],
});
