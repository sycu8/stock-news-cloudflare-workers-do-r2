#!/usr/bin/env node
/** Add .js extensions to relative imports in .tmp-test for Node ESM. */
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), ".tmp-test");

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".js")) patchFile(p);
  }
}

function patchFile(file) {
  let src = fs.readFileSync(file, "utf8");
  const next = src.replace(/from "(\.\.?\/[^"]+)";/g, (m, spec) => {
    if (spec.endsWith(".js")) return m;
    return `from "${spec}.js";`;
  });
  if (next !== src) fs.writeFileSync(file, next);
}

if (fs.existsSync(root)) walk(root);
