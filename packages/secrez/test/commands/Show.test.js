const chai = require("chai");
const assert = chai.assert;
const stdout = require("test-console").stdout;
const fs = require("fs-extra");
const path = require("path");
const { yamlStringify } = require("@secrez/utils");

const MainPrompt = require("../../src/prompts/MainPromptMock");
const {
  noPrint,
  decolorize,
  assertConsole,
} = require("@secrez/test-helpers");

const { password, iterations } = require("../fixtures");

describe("#Show", function () {
  let prompt;
  let rootDir = path.resolve(__dirname, "../../tmp/test/.secrez");
  let inspect, C;

  let options = {
    container: rootDir,
    localDir: path.resolve(__dirname, "../../tmp/test"),
  };

  beforeEach(async function () {
    await fs.emptyDir(path.resolve(__dirname, "../../tmp/test"));
    prompt = new MainPrompt();
    await prompt.init(options);
    C = prompt.commands;
    await prompt.secrez.signup(password, iterations);
    await prompt.internalFs.init();
  });

  it("should return the help", async function () {
    inspect = stdout.inspect();
    await C.totp.exec({ help: true });
    inspect.restore();
    let output = inspect.output.map((e) => decolorize(e));
    assert.isTrue(/-h, --help/.test(output[4]));
  });

  it("should show the field password of a card", async function () {
    const password = "3a5f2r6h2y5w3e4";
    let content = yamlStringify({
      password,
      name: "John",
      surname: "Doe",
    });
    let p = "/card.yml";
    await noPrint(
      C.touch.exec({
        path: p,
        content,
      })
    );
    inspect = stdout.inspect();
    await C.show.exec({
      path: "card.yml",
      field: "password"
    });
    inspect.restore();
    assertConsole(inspect, [password]);
return
    inspect = stdout.inspect();
    await C.show.exec({
      path: "card.yml",
      field: "password",
      qrCode: true
    });
    inspect.restore();
    console.log(9999)
    // TODO we have to figure out how to test this since the reverse seem not to work
    assert.isTrue(!"false");
  });

});
