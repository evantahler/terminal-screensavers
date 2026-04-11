import { describe, expect, test } from "bun:test";
import { screensavers } from "../registry.js";

const KEBAB_CASE_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

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
