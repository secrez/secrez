const chai = require("chai");
const assert = chai.assert;
const _ = require("lodash");
const stdout = require("test-console").stdout;

const fs = require("fs-extra");
const path = require("path");
const MainPrompt = require("../../src/prompts/MainPromptMock");
const { assertConsole, noPrint, decolorize } = require("@secrez/test-helpers");

const { password, iterations } = require("../fixtures");

describe("#Ls", function () {
  let prompt;
  let rootDir = path.resolve(__dirname, "../../tmp/test/.secrez");
  let inspect, C;

  let options = {
    container: rootDir,
    localDir: __dirname,
  };

  let when;

  function formatResult(r) {
    return [0, when, when, 1, r].join("  ");
  }

  beforeEach(async function () {
    await fs.emptyDir(path.resolve(__dirname, "../../tmp/test"));
    prompt = new MainPrompt();
    await prompt.init(options);
    C = prompt.commands;
    await prompt.secrez.signup(password, iterations);
    await prompt.internalFs.init();
    when = C.ls.formatTs(Date.now());
  });

  it("should return the help", async function () {
    inspect = stdout.inspect();
    await C.ls.exec({ help: true });
    inspect.restore();
    let output = inspect.output.map((e) => decolorize(e));
    assert.isTrue(/-h, --help/.test(output[4]));
  });

  it("should return all the datasets", async function () {
    inspect = stdout.inspect();
    await C.ls.exec({ datasets: true });
    inspect.restore();
    let output = inspect.output.map((e) => decolorize(e));
    assert.isTrue(/main +trash/.test(output[0]));
  });

  it("should list folders and files", async function () {
    await noPrint(C.mkdir.exec({ path: "/dir1/dirA1" }));
    await noPrint(C.mkdir.exec({ path: "/dir1/dirA2" }));
    await noPrint(C.mkdir.exec({ path: "/dir1/dirB1" }));
    await noPrint(C.mkdir.exec({ path: "/dir1/dirB2" }));
    await noPrint(C.mkdir.exec({ path: "/dir1/dir2A" }));
    await noPrint(C.mkdir.exec({ path: "/dir1/dir2B" }));
    await noPrint(C.mkdir.exec({ path: "/dir1/dir2A/dir6" }));
    await noPrint(C.mkdir.exec({ path: "/dir1/dir2A/dir7" }));
    await noPrint(C.touch.exec({ path: "/dir1/file1" }));
    await noPrint(C.touch.exec({ path: "/dir1/file2" }));

    inspect = stdout.inspect();
    await C.ls.exec({ path: "/dir1", list: true });
    inspect.restore();
    assertConsole(inspect, [
      formatResult("dir2A/"),
      formatResult("dir2B/"),
      formatResult("dirA1/"),
      formatResult("dirA2/"),
      formatResult("dirB1/"),
      formatResult("dirB2/"),
      formatResult("file1"),
      formatResult("file2"),
    ]);

    inspect = stdout.inspect();
    await C.ls.exec({ path: "/dir1/dir2A", list: true });
    inspect.restore();
    assertConsole(inspect, [formatResult("dir6/"), formatResult("dir7/")]);

    inspect = stdout.inspect();
    await C.ls.exec({ path: "/dir1/dir2B", list: true });
    inspect.restore();
    assert.isUndefined(inspect.output[0]);

    inspect = stdout.inspect();
    await C.ls.exec({ path: "/dir1/dir2A/dir6", list: true });
    inspect.restore();
    assert.isUndefined(inspect.output[0]);

    inspect = stdout.inspect();
    await C.ls.exec({ path: "/dir1/dir2A" });
    inspect.restore();
    assertConsole(inspect, ["dir6/    dir7/"]);

    inspect = stdout.inspect();
    await C.ls.exec({ path: "/none" });
    inspect.restore();
    assert.isUndefined(inspect.output[0]);
  });

  it("should list folders and files using wildcards", async function () {
    inspect = stdout.inspect();
    await C.mkdir.exec({ path: "/dir1/dirA1" });
    await C.mkdir.exec({ path: "/dir1/dirA2" });
    await C.mkdir.exec({ path: "/dir1/dirB1" });
    await C.mkdir.exec({ path: "/dir1/dirB2" });
    await C.mkdir.exec({ path: "/dir1/dir2A" });
    await C.mkdir.exec({ path: "/dir1/dir2B" });
    await C.mkdir.exec({ path: "/dir1/dorB3" });
    await C.mkdir.exec({ path: "/dir1/dor3CC" });
    await C.mkdir.exec({ path: "/dir1/dir2A/dir6" });
    await C.mkdir.exec({ path: "/dir1/dir2A/dir7" });
    await C.touch.exec({ path: "/dir1/file1" });
    await C.touch.exec({ path: "/dir1/file2" });
    inspect.restore();

    inspect = stdout.inspect();
    await C.ls.exec({ path: "/dir1/d?rB?", list: true });
    inspect.restore();
    assertConsole(inspect, [
      formatResult("dirB1/"),
      formatResult("dirB2/"),
      formatResult("dorB3/"),
    ]);

    inspect = stdout.inspect();
    await C.ls.exec({ path: "/dir1/dir*", list: true });
    inspect.restore();
    assertConsole(inspect, [
      formatResult("dir2A/"),
      formatResult("dir2B/"),
      formatResult("dirA1/"),
      formatResult("dirA2/"),
      formatResult("dirB1/"),
      formatResult("dirB2/"),
    ]);

    inspect = stdout.inspect();
    await C.ls.exec({ path: "/dir1/dir?1", list: true });
    inspect.restore();
    assertConsole(inspect, [formatResult("dirA1/"), formatResult("dirB1/")]);

    inspect = stdout.inspect();
    await C.ls.exec({ path: "/dir1/dir[AB]*" });
    inspect.restore();
    assert.equal(
      _.trim(
        decolorize(inspect.output)
          .split(/ +/)
          .map((e) => _.trim(e))
          .join(" ")
      ),
      "dirA1/ dirA2/ dirB1/ dirB2/"
    );
  });
});
