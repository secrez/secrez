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

    let opens = 0;
    prompt.editorProvider = async (opts) => {
      opens += 1;
      if (opens === 1) {
        assert.equal(opts.content, "old");
        return "new password";
      }
      assert.equal(opts.content, "new password");
      return undefined;
    };
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
    assert.equal(opens, 2);
    assert.match(output, /behind remote/);
    assert.match(output, /Changes aborted or file not changed/);
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

  it("should offer to realign before saving when the repo is only behind", async function () {
    await C.touch.touch({
      path: "/folder2/realign",
      content: "old",
    });

    mockEditor("new password");
    prompt.inquirer = {};
    C.edit.useConfirm = async () => true;
    const check = Promise.resolve({
      hasRisk: true,
      allowBypass: true,
      riskType: "behind_remote",
      message: "behind remote",
      status: { behind: 1, ahead: 0, uncommitted: 0 },
    });

    inspect = stdout.inspect();
    await C.edit.edit({ path: "/folder2/realign" }, check);
    inspect.restore();
    let output = inspect.output.map((e) => decolorize(e)).join("\n");
    assert.match(output, /behind remote/);
    assert.match(output, /Would realign and relaunch/);
    assert.notMatch(output, /File saved/);

    let content = (
      await C.cat.cat({ path: "/folder2/realign", unformatted: true })
    )[0].content;
    assert.equal(content, "old");
  });

  it("should keep the current warning when realign is declined", async function () {
    await C.touch.touch({
      path: "/folder2/no-realign",
      content: "old",
    });

    mockEditor("new");
    prompt.inquirer = {};
    C.edit.useConfirm = async () => false;
    C.edit.useInput = async () => true;
    const check = Promise.resolve({
      hasRisk: true,
      allowBypass: true,
      riskType: "behind_remote",
      message: "behind remote",
      status: { behind: 1, ahead: 0, uncommitted: 0 },
    });

    inspect = stdout.inspect();
    await C.edit.edit({ path: "/folder2/no-realign" }, check);
    inspect.restore();
    assertConsole(inspect, ["behind remote", "File saved."]);

    let content = (
      await C.cat.cat({ path: "/folder2/no-realign", unformatted: true })
    )[0].content;
    assert.equal(content, "new");
  });

  it("should not pull when the repo has local commits", async function () {
    prompt.inquirer = {};
    let asked = false;
    C.rm.useConfirm = async () => {
      asked = true;
      return true;
    };
    C.rm.useInput = async () => false;
    C.rm.readGitConflictStatus = async () => ({
      hasRisk: true,
      allowBypass: true,
      riskType: "behind_remote",
      message: "behind remote",
      status: { behind: 1, ahead: 2, uncommitted: 0 },
    });

    inspect = stdout.inspect();
    let proceed = await C.rm.checkGitConflictsBeforeOperation();
    inspect.restore();
    let output = inspect.output.map((e) => decolorize(e)).join("\n");
    assert.isFalse(proceed);
    assert.isFalse(asked);
    assert.match(output, /align it by hand/);
    assert.match(output, /Operation cancelled/);
    assert.notMatch(output, /Would realign/);
  });

  it("should restart without pulling when the repo changed outside Secrez", async function () {
    prompt.inquirer = {};
    C.rm.useConfirm = async (opts) => {
      assert.match(opts.message, /Do you want Secrez to update the repo and restart/);
      return true;
    };
    C.rm.readGitConflictStatus = async () => ({
      hasRisk: true,
      allowBypass: false,
      riskType: "external_change",
      message: "repo changed",
    });

    inspect = stdout.inspect();
    let proceed = await C.rm.checkGitConflictsBeforeOperation();
    inspect.restore();
    let output = inspect.output.map((e) => decolorize(e)).join("\n");
    assert.isFalse(proceed);
    assert.match(output, /repo changed/);
    assert.match(output, /Would relaunch/);
    assert.notMatch(output, /Would realign/);
    assert.notMatch(output, /Operation blocked for data integrity/);
  });

  it("should ask to update the repo after login when it is behind", async function () {
    prompt.inquirer = {};
    let question;
    C.git.useConfirm = async (opts) => {
      question = opts.message;
      return true;
    };

    inspect = stdout.inspect();
    await C.git.offerUpdateAfterLogin({
      hasRisk: true,
      allowBypass: true,
      riskType: "behind_remote",
      message: "behind remote",
      status: { behind: 1, ahead: 0, uncommitted: 0 },
    });
    inspect.restore();
    let output = inspect.output.map((e) => decolorize(e)).join("\n");
    assert.equal(
      question,
      "Do you want Secrez to update the repo and restart?"
    );
    assert.match(output, /behind remote/);
    assert.match(output, /Would realign and relaunch/);
  });
});
