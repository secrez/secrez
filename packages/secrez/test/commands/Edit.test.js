const chai = require("chai");
const assert = chai.assert;
const stdout = require("test-console").stdout;

const fs = require("fs-extra");
const path = require("path");
const { yamlParse } = require("@secrez/utils");
const MainPrompt = require("../../src/prompts/MainPromptMock");
const { assertConsole, decolorize } = require("@secrez/test-helpers");

const { password, iterations } = require("../fixtures");

describe("#Edit", function () {
  let prompt;
  let rootDir = path.resolve(__dirname, "../../tmp/test/.secrez");
  let inspect;
  let C;

  let options = {
    container: rootDir,
    localDir: path.resolve(__dirname, "../fixtures/files"),
  };

  function mockEditor(result) {
    prompt.editorProvider =
      typeof result === "function" ? result : async () => result;
  }

  beforeEach(async function () {
    await fs.emptyDir(path.resolve(__dirname, "../../tmp/test"));
    prompt = new MainPrompt();
    await prompt.init(options);
    C = prompt.commands;
    await prompt.secrez.signup(password, iterations);
    await prompt.internalFs.init();
    prompt.editorProvider = null;
  });

  afterEach(function () {
    prompt.editorProvider = null;
  });

  it("should return the help", async function () {
    inspect = stdout.inspect();
    await C.edit.exec({ help: true });
    inspect.restore();
    let output = inspect.output.map((e) => decolorize(e));
    assert.isTrue(output.some((line) => /-h, --help/.test(line)));
    assert.isTrue(output.some((line) => /in-memory editor/.test(line)));
    assert.isTrue(output.some((line) => /Ctrl-d to save/.test(line)));
  });

  it("should save edited content for a new file", async function () {
    mockEditor("new secret\n");

    inspect = stdout.inspect();
    await C.edit.edit({ path: "/folder2/new-secret" });
    inspect.restore();
    assertConsole(inspect, "File saved.");

    let content = (
      await C.cat.cat({ path: "/folder2/new-secret", unformatted: true })
    )[0].content;
    assert.equal(content, "new secret\n");
  });

  it("should update an existing file", async function () {
    await C.touch.touch({
      path: "/folder2/to-edit",
      content: "old value",
    });

    let before = (
      await C.cat.cat({ path: "/folder2/to-edit", unformatted: true })
    )[0].content;
    assert.equal(before, "old value");

    mockEditor("updated value");
    inspect = stdout.inspect();
    await C.edit.edit({ path: "/folder2/to-edit" });
    inspect.restore();
    assertConsole(inspect, "File saved.");

    let content = (
      await C.cat.cat({ path: "/folder2/to-edit", unformatted: true })
    )[0].content;
    assert.equal(content, "updated value");
  });

  it("should update an existing file using a dataset-qualified path", async function () {
    await C.touch.touch({
      path: "/folder2/to-edit",
      content: "old value",
    });

    mockEditor("updated via main prefix");
    inspect = stdout.inspect();
    await C.edit.edit({ path: "main:/folder2/to-edit" });
    inspect.restore();
    assertConsole(inspect, "File saved.");

    let content = (
      await C.cat.cat({ path: "/folder2/to-edit", unformatted: true })
    )[0].content;
    assert.equal(content, "updated via main prefix");
  });

  it("should edit a single yaml field", async function () {
    await C.touch.touch({
      path: "/cards/site.yml",
      content: "email: old@example.com\npassword: secret\n",
    });

    mockEditor("new@example.com");
    inspect = stdout.inspect();
    await C.edit.edit({ path: "/cards/site.yml", field: "email" });
    inspect.restore();
    assertConsole(inspect, "File saved.");

    let fields = yamlParse(
      (await C.cat.cat({ path: "/cards/site.yml", unformatted: true }))[0]
        .content
    );
    assert.equal(fields.email, "new@example.com");
    assert.equal(fields.password, "secret");
  });

  it("should report no changes when the editor is aborted", async function () {
    await C.touch.touch({
      path: "/folder2/abort-edit",
      content: "same",
    });

    mockEditor(undefined);

    inspect = stdout.inspect();
    await C.edit.edit({ path: "/folder2/abort-edit" });
    inspect.restore();
    assertConsole(inspect, "Changes aborted or file not changed");

    let content = (
      await C.cat.cat({ path: "/folder2/abort-edit", unformatted: true })
    )[0].content;
    assert.equal(content, "same");
  });

  it("should close the editor when the remote blocks the save", async function () {
    await C.touch.touch({
      path: "/folder2/blocked",
      content: "old",
    });

    let resolveCheck;
    const check = new Promise((resolve) => {
      resolveCheck = resolve;
    });

    prompt.editorProvider = (opts) =>
      new Promise((resolve) => {
        opts.onEditorReady({
          abort() {
            resolve(undefined);
          },
        });
        resolveCheck({
          hasRisk: true,
          allowBypass: false,
          message: "repo changed",
        });
      });

    inspect = stdout.inspect();
    await C.edit.edit({ path: "/folder2/blocked" }, check);
    inspect.restore();
    let output = inspect.output.map((e) => decolorize(e)).join("\n");
    assert.match(output, /repo changed/);
    assert.match(output, /Operation blocked for data integrity/);
    assert.notMatch(output, /File saved/);
    assert.notMatch(output, /Changes aborted/);

    let content = (
      await C.cat.cat({ path: "/folder2/blocked", unformatted: true })
    )[0].content;
    assert.equal(content, "old");
  });

  it("should ask before saving when the remote check only warns", async function () {
    await C.touch.touch({
      path: "/folder2/soft",
      content: "old",
    });

    mockEditor("new");
    C.edit.useInput = async () => false;
    const check = Promise.resolve({
      hasRisk: true,
      allowBypass: true,
      message: "behind remote",
    });

    inspect = stdout.inspect();
    await C.edit.edit({ path: "/folder2/soft" }, check);
    inspect.restore();
    let output = inspect.output.map((e) => decolorize(e)).join("\n");
    assert.match(output, /behind remote/);
    assert.match(output, /Operation cancelled/);
    assert.notMatch(output, /File saved/);

    let content = (
      await C.cat.cat({ path: "/folder2/soft", unformatted: true })
    )[0].content;
    assert.equal(content, "old");
  });

  it("should save when the user accepts a bypassable remote warning", async function () {
    await C.touch.touch({
      path: "/folder2/soft-ok",
      content: "old",
    });

    mockEditor("new");
    C.edit.useInput = async () => true;
    const check = Promise.resolve({
      hasRisk: true,
      allowBypass: true,
      message: "behind remote",
    });

    inspect = stdout.inspect();
    await C.edit.edit({ path: "/folder2/soft-ok" }, check);
    inspect.restore();
    assertConsole(inspect, ["behind remote", "File saved."]);

    let content = (
      await C.cat.cat({ path: "/folder2/soft-ok", unformatted: true })
    )[0].content;
    assert.equal(content, "new");
  });
});
