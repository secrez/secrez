#!/usr/bin/env node

const chalk = require("chalk");
const path = require("path");
const fs = require("fs-extra");

const pkg = require("../../package");
const { startServer } = require("../..");

let options;

if (fs.existsSync(path.join(__dirname, "config.js"))) {
  options = require("./config");
} else if (fs.existsSync(path.join(__dirname, "default-config.js"))) {
  options = require("./default-config");
} else {
  throw new Error("No configuration file found");
}

console.info(chalk.bold.grey(`Secrez-hub v${pkg.version}`));

async function start() {
  const port = await startServer(options);
  console.info(`Hub listening on port ${port}`);
}

start();
