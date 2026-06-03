#!/usr/bin/env node
// Hard guard: refuse to install/dev if the active Node version doesn't match
// the one pinned in package.json `engines.node`. yarn 1's own engine-strict
// is unreliable across machines, so we enforce here too. Single source of
// truth: the `engines.node` field in the root package.json.

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const required = pkg.engines && pkg.engines.node;
if (!required) process.exit(0);

const current = process.versions.node;
if (current === required) process.exit(0);

const red = "\x1b[31m";
const yellow = "\x1b[33m";
const reset = "\x1b[0m";

process.stderr.write(
  `\n${red}✘ Wrong Node version${reset}\n` +
    `  required: ${required}  (from package.json engines.node)\n` +
    `  active:   ${current}\n\n` +
    `${yellow}Fix it:${reset}\n` +
    `  nvm use            # picks up .nvmrc (22.20.0)\n` +
    `  # or: nvm install  # if 22.20.0 isn't installed yet\n\n`,
);
process.exit(1);
