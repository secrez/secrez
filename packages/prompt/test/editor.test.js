const { EventEmitter } = require("events");
const fs = require("fs");
const os = require("os");
const path = require("path");
const chai = require("chai");
const assert = chai.assert;
const { Prompt } = require("../src");

function harness(options) {
  const input = new EventEmitter();
  const chunks = [];
  const output = {
    isTTY: true,
    columns: 80,
    rows: 24,
    write(text) {
      chunks.push(String(text));
    },
  };
  const prompt = new Prompt(Object.assign({ input, output }, options));
  return { input, chunks, output, prompt };
}

function press(input, name, extra) {
  const key = Object.assign({ name }, extra);
  const str =
    extra && extra.str !== undefined
      ? extra.str
      : name.length === 1
      ? name
      : "";
  input.emit("keypress", str, key);
}

function save(input) {
  press(input, "d", { ctrl: true, str: "" });
}

describe("@secrez/prompt editor", function () {
  const timers = [];

  afterEach(function () {
    while (timers.length) clearTimeout(timers.pop());
  });

  it("should save text typed in the editor", async function () {
    const { input, output, prompt } = harness();
    output.columns = 4;
    const pending = prompt.useEditor({ content: "hi" });
    press(input, "left");
    press(input, "up");
    press(input, "right");
    press(input, "right");
    press(input, "backspace");
    press(input, "backspace");
    press(input, "y");
    press(input, "o");
    press(input, "return");
    press(input, "tab", { str: "" });
    save(input);
    assert.equal(await pending, "yo\n");
  });

  it("should delete the only line and move inside it", async function () {
    const { input, prompt } = harness();
    const pending = prompt.useEditor({ content: "ab\ncd" });
    press(input, "right");
    press(input, "down");
    press(input, "up");
    press(input, "right");
    press(input, "right");
    press(input, "k", { ctrl: true, str: "" });
    press(input, "k", { ctrl: true, str: "" });
    save(input);
    assert.equal(await pending, "");
  });

  it("should move across lines and restore the original text", async function () {
    const { input, prompt } = harness();
    const pending = prompt.useEditor({ content: "a\nb" });
    press(input, "down");
    press(input, "down");
    press(input, "left");
    press(input, "z");
    press(input, "g", { ctrl: true, str: "" });
    press(input, "e", { ctrl: true, str: "" });
    press(input, "a", { ctrl: true, str: "" });
    press(input, "k", { ctrl: true, str: "" });
    save(input);
    assert.equal(await pending, "b");
  });

  it("should join lines with backspace and abort with ctrl-c", async function () {
    const { input, prompt } = harness();
    const joined = prompt.useEditor({ content: "a\nb" });
    press(input, "down");
    press(input, "backspace");
    save(input);
    assert.equal(await joined, "ab");

    const stayed = prompt.useEditor({ content: "a" });
    press(input, "backspace");
    save(input);
    assert.equal(await stayed, "a");

    const aborted = prompt.useEditor({ content: "keep" });
    press(input, "c", { ctrl: true, str: "" });
    assert.equal(await aborted, undefined);

    const escaped = prompt.useEditor({ content: "keep" });
    press(input, "escape");
    assert.equal(await escaped, undefined);
  });

  it("should abort from onEditorReady and replace the buffer", async function () {
    const cancelled = harness().prompt.useEditor({
      content: "a",
      onEditorReady(api) {
        api.abort();
        api.abort();
      },
    });
    assert.equal(await cancelled, undefined);

    const { input, prompt } = harness();
    let api;
    const pending = prompt.useEditor({
      content: "a\nb",
      onEditorReady(handle) {
        api = handle;
      },
    });
    press(input, "down");
    api.setText("yo");
    save(input);
    assert.equal(await pending, "yo");
  });

  it("should reject a value that is not text", async function () {
    const { prompt } = harness({ clearScreen: true });
    try {
      await prompt.useEditor({ content: 1 });
      assert.fail("should reject");
    } catch (err) {
      assert.match(err.message, /string/);
    }
    assert.equal(prompt.clearHolds, 0);
  });

  it("should use a custom editor and suspend the clear", async function () {
    const { prompt } = harness({
      clearScreen: true,
      editor: async (options) => options.content + "?",
    });
    let during;
    const value = await prompt.useEditor({
      content: "x",
      editor(options) {
        during = prompt.clearHolds;
        return options.content + "!";
      },
    });
    assert.equal(value, "x!");
    assert.equal(during, 1);
    assert.equal(prompt.clearHolds, 0);

    const fallback = await prompt.useEditor({ content: "x" });
    assert.equal(fallback, "x?");

    const idle = prompt.useEditor({ content: "z", skipClear: false });
    if (prompt.timeoutId) timers.push(prompt.timeoutId);
    assert.equal(prompt.clearHolds, 0);
    assert.ok(prompt.timeoutId);
    assert.equal(await idle, "z?");
  });

  describe("file", function () {
    let dir;

    beforeEach(async function () {
      dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "secrez-prompt-"));
    });

    afterEach(async function () {
      await fs.promises.rm(dir, { recursive: true, force: true });
    });

    async function editFile(prompt, input, file, type) {
      let opened;
      const ready = new Promise((resolve) => {
        opened = resolve;
      });
      const pending = prompt.useEditor({
        filePath: file,
        onEditorReady() {
          opened();
        },
      });
      await Promise.race([
        ready,
        pending.then(
          () => {},
          (err) => {
            throw err;
          }
        ),
      ]);
      type(input);
      return pending;
    }

    it("should write the file on save and leave it on abort", async function () {
      const file = path.join(dir, "note.txt");
      await fs.promises.writeFile(file, "old");
      const { input, prompt } = harness();
      const saved = await editFile(prompt, input, file, () => {
        press(input, "right");
        press(input, "right");
        press(input, "right");
        press(input, "!");
        save(input);
      });
      assert.equal(saved, "old!");
      assert.equal(await fs.promises.readFile(file, "utf8"), "old!");

      const aborted = await editFile(prompt, input, file, () => {
        press(input, "x");
        press(input, "c", { ctrl: true, str: "" });
      });
      assert.equal(aborted, undefined);
      assert.equal(await fs.promises.readFile(file, "utf8"), "old!");
    });

    it("should create a missing file only when the edit is saved", async function () {
      const file = path.join(dir, "new.txt");
      const { input, prompt } = harness();
      const aborted = await editFile(prompt, input, file, () => {
        press(input, "a");
        press(input, "escape");
      });
      assert.equal(aborted, undefined);
      assert.equal(fs.existsSync(file), false);

      const saved = await editFile(prompt, input, file, () => {
        press(input, "a");
        save(input);
      });
      assert.equal(saved, "a");
      assert.equal(await fs.promises.readFile(file, "utf8"), "a");
    });

    it("should keep a custom editor off the disk", async function () {
      const file = path.join(dir, "note.txt");
      await fs.promises.writeFile(file, "old");
      const { prompt } = harness();
      const text = await prompt.useEditor({
        filePath: file,
        editor: async () => "other",
      });
      assert.equal(text, "other");
      assert.equal(await fs.promises.readFile(file, "utf8"), "old");
    });

    it("should reject a filePath mixed with content, or a directory", async function () {
      const { prompt } = harness();
      try {
        await prompt.useEditor({
          content: "a",
          filePath: path.join(dir, "note.txt"),
        });
        assert.fail("should reject");
      } catch (err) {
        assert.match(err.message, /either content or filePath/);
      }
      try {
        await prompt.useEditor({ filePath: dir });
        assert.fail("should reject");
      } catch (err) {
        assert.ok(err);
      }
      try {
        await prompt.useEditor({ filePath: "" });
        assert.fail("should reject");
      } catch (err) {
        assert.match(err.message, /file path/);
      }
    });
  });
});
