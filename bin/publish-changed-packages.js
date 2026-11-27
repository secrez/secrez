const { execSync } = require("child_process");
const { publishedVersion } = require("./published-version");
const fs = require("fs-extra");
const path = require("path");

let changes;
const publishCommands = [];

let gitDiff = execSync("git diff --name-only").toString().split("\n");

if (gitDiff.length > 0 && gitDiff[0]) {
  console.error("The repo is not committed.");
  process.exit(1);
}

function checkIfMustBePublished(dir) {
  const pkg = dir === "secrez" ? "" : "@secrez/";
  console.debug(`Checking  ${pkg}${dir}`);
  const version = require(`../packages/${dir}/package.json`).version;
  const name = `${pkg}${dir}`;
  const currVersion = publishedVersion(name);
  if (currVersion == null || version !== currVersion) {
    const note = currVersion == null ? " (not on npm yet)" : "";
    console.log(`📦 MUST PUBLISH ${name} v${version}${note}`);
    const publishCommand = `(cd packages/${dir} && pnpm publish ${
      /beta/.test(version) ? "--tag beta" : ""
    })`;
    publishCommands.push(publishCommand);
    changes = true;
  }
}

checkIfMustBePublished("utils", "@secrez");
checkIfMustBePublished("test-helpers", "@secrez");
checkIfMustBePublished("crypto", "@secrez");
checkIfMustBePublished("eth", "@secrez");
checkIfMustBePublished("core", "@secrez");
checkIfMustBePublished("fs", "@secrez");
checkIfMustBePublished("prompt", "@secrez");
// the deployed version is latest one
// checkIfMustBePublished('migrate', '@secrez')
checkIfMustBePublished("secrez");

if (!changes) {
  console.log("✅ No packages need to be published.");
} else {
  // Generate shell script
  const tmpPath = path.resolve(__dirname, "../tmp");
  fs.ensureDirSync(tmpPath);
  const scriptPath = path.resolve(tmpPath, "publish-packages.sh");
  const scriptContent = `#!/bin/bash

# Auto-generated publish script for Secrez packages
# This script will publish packages that need to be updated
# You'll be prompted for 2FA for each package

set -e

echo "🚀 Starting package publishing..."

${publishCommands.join("\n\n")}

echo "✅ All packages published successfully!"
`;

  fs.writeFileSync(scriptPath, scriptContent);
  fs.chmodSync(scriptPath, "755");

  console.log(`
🎯 Packages need to be published! A shell script has been generated at:
   ${scriptPath}

📋 To publish all packages, run:
   ${scriptPath}

⚠️  Note: You'll be prompted for 2FA authentication for each package.
`);
}
