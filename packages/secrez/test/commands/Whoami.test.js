const chai = require("chai");
const assert = chai.assert;
const stdout = require("test-console").stdout;

const fs = require("fs-extra");
const path = require("path");

const MainPrompt = require("../../src/prompts/MainPromptMock");

const { noPrint, decolorize } = require("@secrez/test-helpers");

const { password, iterations } = require("../fixtures");

describe("#Whoami", function () {
  let prompt;
  let testDir = path.resolve(__dirname, "../../tmp/test");
  let rootDir = path.resolve(testDir, "secrez");
  let inspect;
  let C;
  let secrez;
  let publicKeys = {};

  before(async function () {
    for (let i = 0; i < 3; i++) {
      await fs.emptyDir(testDir);
      prompt = new MainPrompt();
      await prompt.init(options);
      await prompt.secrez.signup(password, iterations);
      publicKeys["user" + i] = prompt.secrez.getPublicKey();
    }
  });

  let options = {
    container: rootDir,
    localDir: __dirname,
  };

  beforeEach(async function () {
    await fs.emptyDir(testDir);
    prompt = new MainPrompt();
    await prompt.init(options);
    C = prompt.commands;
    await prompt.secrez.signup(password, iterations);
    secrez = prompt.secrez;
    await noPrint(
      C.contacts.exec({
        add: "user0",
        publicKey: publicKeys.user0,
      })
    );
  });

  it("should return the help", async function () {
    inspect = stdout.inspect();
    await C.whoami.exec({ help: true });
    inspect.restore();
    let output = inspect.output.map((e) => decolorize(e));
    assert.isTrue(/-h, --help/.test(output[4]));
  });

  it("should see who am I", async function () {
    inspect = stdout.inspect();
    await C.whoami.exec({});
    inspect.restore();
    let output = inspect.output.map((e) => decolorize(e));
    assert.equal(output.length, 1);
    assert.equal(output[0], "Public key: " + secrez.getPublicKey());
  });
});
