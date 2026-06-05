import { defineConfig } from "vitest/config";

// Kun indre unit-tester for serveren kjøres av rot-`vitest`.
// Oppgavenes testfiler (assignments/**) kjøres IKKE her — de kjøres isolert i
// sandbox-prosessen mot deltakerens innsending.
export default defineConfig({
  test: {
    include: ["packages/**/test/**/*.test.ts"],
    passWithNoTests: true,
  },
});
