const stdout = require("test-console").stdout;
const fs = require("fs-extra");
const path = require("path");
const chai = require("chai");
const assert = chai.assert;
const MainPrompt = require("../../src/prompts/MainPromptMock");
const { decolorize, noPrint, assertConsole } = require("@secrez/test-helpers");

const { password, iterations } = require("../fixtures");

describe("#Ds", function () {
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

  it("should return the help", async function () {
    inspect = stdout.inspect();
    await C.ds.exec({ help: true });
    inspect.restore();
    let output = inspect.output.map((e) => decolorize(e));
    assert.isTrue(/-h, --help/.test(output[4]));
  });

  it("should list all datasets", async function () {
    inspect = stdout.inspect();
    await C.ds.exec({
      list: true,
    });
    inspect.restore();
    assertConsole(inspect, ["main     trash"]);

    inspect = stdout.inspect();
    await C.ds.exec();
    inspect.restore();
    assertConsole(inspect, ["main     trash"]);
  });

  it("should create a new dataset", async function () {
    inspect = stdout.inspect();
    await C.ds.exec({
      create: "archive",
    });
    inspect.restore();
    assertConsole(inspect, ["The dataset archive has been created"]);

    inspect = stdout.inspect();
    await C.ds.exec({
      create: "archive",
    });
    inspect.restore();
    assertConsole(inspect, ["A dataset named archive already exists"]);

    inspect = stdout.inspect();
    await C.ds.exec({
      create: "1old",
    });
    inspect.restore();
    assertConsole(inspect, [
      "Dataset name must be alphanumeric, start with a letter, and at most 16 characters long",
    ]);
  });

  it("should rename a dataset", async function () {
    await noPrint(
      C.ds.exec({
        create: "archive",
      })
    );
    assert.equal(await C.ds.exists("archive"), 2);
    await noPrint(
      C.ds.exec({
        create: "restore",
      })
    );
    assert.equal(await C.ds.exists("restore"), 3);

    inspect = stdout.inspect();
    await C.ds.exec({
      rename: ["archive", "old"],
    });
    inspect.restore();
    assertConsole(inspect, ["The dataset archive has been renamed old"]);
    assert.equal(await C.ds.exists("old"), 2);
    assert.equal(await C.ds.exists("archive"), -1);

    inspect = stdout.inspect();
    await C.ds.exec({
      rename: ["restore", "old"],
    });
    inspect.restore();
    assertConsole(inspect, ["A dataset named old already exists"]);

    inspect = stdout.inspect();
    await C.ds.exec({
      rename: ["trash", "bin"],
    });
    inspect.restore();
    assertConsole(inspect, ["main and trash cannot be renamed"]);

    inspect = stdout.inspect();
    await C.ds.exec({
      rename: "old",
    });
    inspect.restore();
    assertConsole(inspect, [
      "Dataset name must be alphanumeric, start with a letter, and at most 16 characters long",
    ]);

    inspect = stdout.inspect();
    await C.ds.exec({
      bingo: true,
    });
    inspect.restore();
    assertConsole(inspect, ["Wrong parameters"]);
  });

  it("should delete a dataset", async function () {
    await noPrint(
      C.ds.exec({
        create: "archive",
      })
    );

    await noPrint(
      C.use.exec({
        dataset: "archive",
      })
    );

    await noPrint(
      C.touch.exec({
        path: "ciccio",
      })
    );

    await noPrint(
      C.touch.exec({
        path: "ciccio2",
      })
    );

    await noPrint(
      C.mkdir.exec({
        path: "folder",
      })
    );

    await noPrint(
      C.touch.exec({
        path: "folder/ciccio3",
      })
    );

    assert.equal((await C.ds.ds({ list: true })).length, 3);

    inspect = stdout.inspect();
    await C.ds.exec({
      delete: "archive",
    });
    inspect.restore();
    assertConsole(inspect, ["You can not delete the active dataset"]);

    await noPrint(
      C.use.exec({
        dataset: "main",
      })
    );

    inspect = stdout.inspect();
    await C.ds.exec({
      delete: "archive",
    });
    inspect.restore();
    assertConsole(inspect, [
      'The dataset archive has been canceled. Its content has been moved to the "trash" dataset',
    ]);

    inspect = stdout.inspect();
    await C.use.exec({
      dataset: "archive",
    });
    inspect.restore();
    assertConsole(inspect, [
      'The dataset does not exist; add "-c" to create it',
    ]);

    assert.equal((await C.ds.ds({ list: true })).length, 2);
  });
});
