const stdout = require("test-console").stdout;
const fs = require("fs-extra");
const path = require("path");
const MainPrompt = require("../../src/prompts/MainPromptMock");
const { assertConsole } = require("@secrez/test-helpers");
const pkg = require("../../package");

const { password, iterations } = require("../fixtures");

describe("#Ver", function () {
  let prompt;
  let rootDir = path.resolve(__dirname, "../../tmp/test/.secrez");
  let inspect, C;

  let options = {
    container: rootDir,
    localDir: __dirname,
  };

  beforeEach(async function () {
    await fs.emptyDir(path.resolve(__dirname, "../../tmp/test"));
    prompt = new MainPrompt();
    await prompt.init(options);
    C = prompt.commands;
    await prompt.secrez.signup(password, iterations);
    await prompt.internalFs.init();
  });

  it("should show the current version", async function () {
    inspect = stdout.inspect();
    await C.ver.exec();
    inspect.restore();
    assertConsole(inspect, `v${pkg.version}`);
  });
});
