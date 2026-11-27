const { execSync } = require("child_process");

function publishedVersion(pkg) {
  try {
    return execSync(`npm view ${pkg} version`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : "";
    if (/E404|404 Not Found/.test(stderr)) return null;
    throw err;
  }
}

module.exports = { publishedVersion };
