#!/usr/bin/env node
import { VERSION } from "./version.mjs";

// Answer frequent probes before loading filesystem, child-process, or CLI logic.
const args = process.argv.slice(2);
if (args.length === 1 && ["--version", "-v", "-V"].includes(args[0])) {
  console.log(VERSION);
} else {
  const { main } = await import("./cli.mjs");
  await main(args);
}
