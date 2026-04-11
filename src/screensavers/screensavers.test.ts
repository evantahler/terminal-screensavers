import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { screensavers } from "../registry.js";

const KEBAB_CASE_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const ROOT = resolve(import.meta.dirname, "../..");

describe("screensaver registry", () => {
  test("registry is not empty", () => {
    expect(screensavers.length).toBeGreaterThan(0);
  });

  test("no duplicate names in registry", () => {
    const names = screensavers.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("each screensaver module", () => {
  for (const screensaver of screensavers) {
    describe(screensaver.name, () => {
      test("has a kebab-case name", () => {
        expect(screensaver.name).toMatch(KEBAB_CASE_RE);
      });

      test("has a non-empty description", () => {
        expect(screensaver.description.length).toBeGreaterThan(0);
      });

      test("has a component function", () => {
        expect(typeof screensaver.component).toBe("function");
      });

      test("fps is a positive number if set", () => {
        if (screensaver.fps !== undefined) {
          expect(screensaver.fps).toBeGreaterThan(0);
        }
      });
    });
  }
});

describe("documentation", () => {
  const readmeContent = readFileSync(resolve(ROOT, "README.md"), "utf-8");
  const readmeTableRows = readmeContent
    .split("\n")
    .filter((line) => line.startsWith("| `"));
  const readmeNames = readmeTableRows.map((row) => {
    const match = row.match(/\| `([^`]+)` \|/);
    return match?.[1] ?? "";
  });

  const registryNames = screensavers.map((s) => s.name).sort();

  test("README table has an entry for every registered screensaver", () => {
    for (const name of registryNames) {
      expect(readmeNames).toContain(name);
    }
  });

  test("README table has no stale entries", () => {
    for (const name of readmeNames) {
      expect(registryNames).toContain(name);
    }
  });

  test("README table is alphabetically sorted", () => {
    const sorted = [...readmeNames].sort();
    expect(readmeNames).toEqual(sorted);
  });

  for (const screensaver of screensavers) {
    test(`${screensaver.name} has a screenshot file`, () => {
      const screenshotPath = resolve(
        ROOT,
        "screenshots",
        `${screensaver.name}.png`,
      );
      expect(existsSync(screenshotPath)).toBe(true);
    });
  }
});
