#!/usr/bin/env node
import { render } from "ink";
import meow from "meow";
import React from "react";
import App from "./App.js";
import { screensavers } from "./registry.js";

const cli = meow(
  `
  Usage
    $ terminal-screensavers [name]

  Options
    --list, -l   List available screensavers
    --fps, -f    Override frames per second

  Controls
    ←/→          Previous/next screensaver
    m            Open screensaver menu
    Any other    Exit

  Examples
    $ terminal-screensavers
    $ terminal-screensavers matrix-rain
    $ terminal-screensavers --list
    $ terminal-screensavers --fps 30
`,
  {
    importMeta: import.meta,
    flags: {
      list: { type: "boolean", shortFlag: "l" },
      fps: { type: "number", shortFlag: "f" },
    },
  },
);

if (cli.flags.list) {
  console.log("\nAvailable screensavers:\n");
  console.log("  Name              Description");
  console.log("  ────────────────  ──────────────────────────────────────────");
  for (const s of screensavers) {
    const name = s.name.padEnd(16);
    console.log(`  ${name}  ${s.description}`);
  }
  console.log("");
  process.exit(0);
}

const name = cli.input[0];
let initialIndex: number;

if (name) {
  const foundIndex = screensavers.findIndex((s) => s.name === name);
  if (foundIndex === -1) {
    console.error(`Unknown screensaver: "${name}"`);
    console.error("Run with --list to see available screensavers");
    process.exit(1);
  }
  initialIndex = foundIndex;
} else {
  initialIndex = Math.floor(Math.random() * screensavers.length);
}

render(
  <App
    screensavers={screensavers}
    initialIndex={initialIndex}
    fpsOverride={cli.flags.fps}
  />,
);
