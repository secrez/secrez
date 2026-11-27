const { execSync } = require("child_process");
const { publishedVersion } = require("./published-version");

let changes;

function checkAndGetCoverage(dir) {
  const org = dir === "secrez" ? "" : "@secrez/";
  const pkg = `${org}${dir}`;
  console.debug(`Checking  ${pkg}`);
  const version = require(`../packages/${dir}/package.json`).version;
  const currVersion = publishedVersion(pkg);
  if (currVersion == null) {
    console.debug(`${pkg} is not on npm yet`);
  }
  if (version !== currVersion) {
    console.debug(`Getting coverage for ${pkg}`);
    console.debug(execSync(`bin/get-coverage.sh ${dir} ${pkg}`).toString());
    changes = true;
  }
}

checkAndGetCoverage("utils");
checkAndGetCoverage("test-helpers");
checkAndGetCoverage("crypto");
checkAndGetCoverage("eth");
checkAndGetCoverage("core");
checkAndGetCoverage("fs");
checkAndGetCoverage("prompt");
checkAndGetCoverage("secrez");

if (!changes) {
  console.debug("No upgrade needed.");
}
