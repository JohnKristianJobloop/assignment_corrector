import { describe, it, expect } from "vitest";
import { ensureExportedFunctions } from "../src/normalizeExports.js";

describe("ensureExportedFunctions", () => {
  describe("legger til export på top-level verdideklarasjoner", () => {
    it("funksjonsdeklarasjon", () => {
      expect(ensureExportedFunctions("function foo(){ return 1; }")).toBe(
        "export function foo(){ return 1; }",
      );
    });

    it("async function", () => {
      expect(ensureExportedFunctions("async function foo(){}")).toBe(
        "export async function foo(){}",
      );
    });

    it("generator function", () => {
      expect(ensureExportedFunctions("function* gen(){}")).toBe(
        "export function* gen(){}",
      );
    });

    it("arrow function bundet til const", () => {
      expect(ensureExportedFunctions("const foo = () => 1;")).toBe(
        "export const foo = () => 1;",
      );
    });

    it("arrow med parametre, uten parentes, og async", () => {
      const src = [
        "const add = (a, b) => a + b;",
        "let identity = x => x;",
        "var fetchIt = async () => 42;",
      ].join("\n");
      expect(ensureExportedFunctions(src)).toBe(
        [
          "export const add = (a, b) => a + b;",
          "export let identity = x => x;",
          "export var fetchIt = async () => 42;",
        ].join("\n"),
      );
    });

    it("function-uttrykk bundet til const", () => {
      expect(ensureExportedFunctions("const foo = function(){};")).toBe(
        "export const foo = function(){};",
      );
    });

    it("string-, number-, object- og array-verdier", () => {
      const src = [
        'const NAME = "kodehode";',
        "let count = 3;",
        "var ratio = 0.5;",
        "const config = { a: 1 };",
        "const xs = [1, 2, 3];",
      ].join("\n");
      expect(ensureExportedFunctions(src)).toBe(
        [
          'export const NAME = "kodehode";',
          "export let count = 3;",
          "export var ratio = 0.5;",
          "export const config = { a: 1 };",
          "export const xs = [1, 2, 3];",
        ].join("\n"),
      );
    });

    it("destrukturering (object og array)", () => {
      const src = ["const { a, b } = obj;", "const [first] = arr;"].join("\n");
      expect(ensureExportedFunctions(src)).toBe(
        ["export const { a, b } = obj;", "export const [first] = arr;"].join(
          "\n",
        ),
      );
    });

    it("class-deklarasjon", () => {
      expect(ensureExportedFunctions("class Foo {}")).toBe(
        "export class Foo {}",
      );
    });

    it("enum-deklarasjon", () => {
      expect(ensureExportedFunctions("enum Color { Red }")).toBe(
        "export enum Color { Red }",
      );
    });

    it("flere deklarasjoner i samme fil", () => {
      const src = [
        "function doubleAll(numArr){ return numArr.map(n => n * 2); }",
        'const LABEL = "tall";',
      ].join("\n");
      expect(ensureExportedFunctions(src)).toBe(
        [
          "export function doubleAll(numArr){ return numArr.map(n => n * 2); }",
          'export const LABEL = "tall";',
        ].join("\n"),
      );
    });
  });

  describe("lar ting som ikke skal eksporteres være urørt", () => {
    it("allerede eksporterte deklarasjoner", () => {
      const src = [
        "export function a(){}",
        "export async function b(){}",
        "export default function c(){}",
        "export const d = () => 1;",
        "export class E {}",
      ].join("\n");
      expect(ensureExportedFunctions(src)).toBe(src);
    });

    it("nøstede (innrykkede) deklarasjoner", () => {
      const src = [
        "export function outer(){",
        "  function inner(){}",
        "  const local = 1;",
        "}",
      ].join("\n");
      expect(ensureExportedFunctions(src)).toBe(src);
    });

    it("import-setninger", () => {
      const src = 'import { x } from "./y";';
      expect(ensureExportedFunctions(src)).toBe(src);
    });

    it("expression statements (f.eks. console.log)", () => {
      const src = 'console.log("hei");';
      expect(ensureExportedFunctions(src)).toBe(src);
    });

    it("kontrollflyt på toppnivå", () => {
      const src = "if (true) { const x = 1; }";
      expect(ensureExportedFunctions(src)).toBe(src);
    });

    it("rein reassignment uten deklarasjonsnøkkelord", () => {
      const src = "x = 5;";
      expect(ensureExportedFunctions(src)).toBe(src);
    });

    it("type-nivå (type og interface)", () => {
      const src = ["type T = string;", "interface I { x: number }"].join("\n");
      expect(ensureExportedFunctions(src)).toBe(src);
    });

    it("nøkkelord inne i strenger og kommentarer (AST-robusthet)", () => {
      const src = [
        'const s = "const x = 1";',
        "// function ghost(){}",
        "/* class Ghost {} */",
      ].join("\n");
      // Kun den faktiske `const s`-deklarasjonen eksporteres; tekst inne i
      // streng/kommentar er ikke statements og røres ikke.
      expect(ensureExportedFunctions(src)).toBe(
        [
          'export const s = "const x = 1";',
          "// function ghost(){}",
          "/* class Ghost {} */",
        ].join("\n"),
      );
    });
  });
});
