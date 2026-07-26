#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseYca } from "../parser/index.js";

// TODO: this is a temporary stand-in CLI just to exercise the parser.
// Real CLI (arg parsing, `yc run file.yca`, window launch, etc.) comes
// once the VM/window layer exists.

const file = process.argv[2];
if (!file) {
  console.error("usage: yc <file.yca>");
  process.exit(1);
}

const source = readFileSync(file, "utf8");
const yca = parseYca(source);

console.log("metadata:", yca.metadata);
console.log("content (first 80 chars):", yca.content.slice(0, 80).replace(/\n/g, "\\n"));

// TODO: next step — hand `yca` off to the VM/server layer instead of
// just printing it.
