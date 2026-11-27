const { EventEmitter } = require("events");
const chai = require("chai");
const assert = chai.assert;
const { Prompt } = require("../src");
const { complete } = require("../src/complete");
const { formatList, ellipsize, columnsOf } = require("../src/text");
const { formatColumns } = require("../src");
const { listen } = require("../src/keys");

function harness(options) {
  const input = new EventEmitter();
  const chunks = [];
  const output = {
    isTTY: true,
    columns: 80,
    write(text) {
      chunks.push(String(text));
    },
    cursorTo() {},
  };
  const prompt = new Prompt(
    Object.assign({ input, output, clearScreenTimeout: 60 }, options)
  );
  return { input, output, chunks, prompt };
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

function enter(input) {
  press(input, "return");
}

describe("@secrez/prompt", function () {
  const timers = [];

  const originalError = console.error;

  afterEach(function () {
    console.error = originalError;
    while (timers.length) clearTimeout(timers.pop());
  });

  function track(prompt) {
    if (prompt.timeoutId) timers.push(prompt.timeoutId);
  }

  it("should answer a confirm with y", async function () {
    const { input, prompt } = harness();
    const pending = prompt.ask([
      { type: "confirm", name: "ok", message: "Go?", default: false },
    ]);
    press(input, "y");
    enter(input);
    const answers = await pending;
    assert.strictEqual(answers.ok, true);
    track(prompt);
  });

  it("should use the confirm default when the answer is empty", async function () {
    const { input, prompt } = harness();
    const pending = prompt.ask({
      type: "confirm",
      name: "ok",
      message: "Go?",
      default: true,
    });
    enter(input);
    const answers = await pending;
    assert.strictEqual(answers.ok, true);
    track(prompt);
  });

  it("should reject a confirm answer that is not y or n", async function () {
    const { input, chunks, prompt } = harness();
    const pending = prompt.ask([
      { type: "confirm", name: "ok", message: "Go?" },
    ]);
    press(input, "q");
    enter(input);
    await new Promise((resolve) => setTimeout(resolve, 20));
    press(input, "backspace");
    press(input, "n");
    enter(input);
    const answers = await pending;
    assert.strictEqual(answers.ok, false);
    assert.match(chunks.join(""), /Please answer y or n/);
    track(prompt);
  });

  it("should select the next list item", async function () {
    const { input, prompt } = harness();
    const pending = prompt.ask([
      {
        type: "list",
        name: "field",
        message: "Field",
        choices: ["email", "password"],
      },
    ]);
    press(input, "down");
    enter(input);
    const answers = await pending;
    assert.equal(answers.field, "password");
    track(prompt);
  });

  it("should hide a password", async function () {
    const { input, chunks, prompt } = harness();
    const pending = prompt.ask([
      { type: "password", name: "secret", message: "Password:" },
    ]);
    press(input, "x");
    press(input, "y");
    enter(input);
    const answers = await pending;
    assert.equal(answers.secret, "xy");
    const painted = chunks.join("");
    assert.match(painted, /\*\*/);
    assert.notMatch(painted, /xy/);
    track(prompt);
  });

  it("should recall the previous command", async function () {
    const { input, prompt } = harness();
    prompt.setHistory({ histories: { _default: ["cat a", "ls"] } });
    const pending = prompt.ask(
      [{ type: "command", name: "cmd", message: "$" }],
      { skipClear: false }
    );
    press(input, "up");
    enter(input);
    const answers = await pending;
    assert.equal(answers.cmd, "ls");
    assert.deepEqual(prompt.getHistories().histories._default.slice(-2), [
      "cat a",
      "ls",
    ]);
    track(prompt);
  });

  it("should complete a command on tab", async function () {
    const { input, prompt } = harness();
    const pending = prompt.ask([
      {
        type: "command",
        name: "cmd",
        message: "$",
        autoCompletion: () => ["help", "ls", "lcat"],
      },
    ]);
    press(input, "l");
    press(input, "s");
    press(input, "tab", { str: "\t" });
    enter(input);
    const answers = await pending;
    assert.equal(answers.cmd, "ls");
    track(prompt);
  });

  it("should not arm the clear when clearScreen is off", async function () {
    const { input, prompt } = harness({ clearScreen: false });
    let during;
    const original = prompt.askOne.bind(prompt);
    prompt.askOne = async (question) => {
      during = prompt.clearHolds;
      return original(question);
    };
    const pending = prompt.ask([
      { type: "input", name: "name", message: "Name" },
    ]);
    press(input, "a");
    enter(input);
    await pending;
    assert.equal(during, 0);
    assert.isNull(prompt.timeoutId);
  });

  it("should suspend the clear while a question is open", async function () {
    const { input, prompt } = harness({ clearScreen: true });
    let during;
    const original = prompt.askOne.bind(prompt);
    prompt.askOne = async (question) => {
      during = prompt.clearHolds;
      assert.isNull(prompt.timeoutId);
      return original(question);
    };
    const pending = prompt.ask([
      { type: "input", name: "name", message: "Name" },
    ]);
    press(input, "a");
    enter(input);
    await pending;
    assert.equal(during, 1);
    assert.equal(prompt.clearHolds, 0);
    track(prompt);
  });

  it("should keep the clear armed for the idle command prompt", async function () {
    const { input, prompt } = harness({ clearScreen: true });
    let during;
    const original = prompt.askOne.bind(prompt);
    prompt.askOne = async (question) => {
      during = prompt.clearHolds;
      return original(question);
    };
    const pending = prompt.ask(
      [{ type: "input", name: "name", message: "Name" }],
      {
        skipClear: false,
      }
    );
    press(input, "a");
    enter(input);
    await pending;
    assert.equal(during, 0);
    assert.ok(prompt.timeoutId);
    track(prompt);
  });

  it("should not restart the clear while another hold is open", function () {
    const { prompt } = harness({ clearScreen: true });
    prompt.holdClear();
    prompt.holdClear();
    prompt.releaseClear();
    assert.equal(prompt.clearHolds, 1);
    assert.isNull(prompt.timeoutId);
    prompt.releaseClear();
    assert.equal(prompt.clearHolds, 0);
    track(prompt);
  });

  it("should call onClear when the timer fires", async function () {
    let cleared = false;
    const { prompt } = harness({
      clearScreen: true,
      clearScreenTimeout: 0.02,
      onClear() {
        cleared = true;
      },
    });
    prompt.armClear();
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.isTrue(cleared);
  });

  it("should edit a line and accept an input default", async function () {
    const { input, prompt } = harness();
    const pending = prompt.ask([
      { type: "input", name: "name", message: "Name", default: "ada" },
    ]);
    press(input, "b");
    press(input, "left");
    press(input, "z", { str: "z" });
    press(input, "right");
    press(input, "home");
    press(input, "end");
    press(input, "backspace");
    press(input, "delete");
    enter(input);
    const typed = await pending;

    const pendingDefault = prompt.ask([
      { type: "input", name: "name", message: "Name", default: "ada" },
    ]);
    enter(input);
    const fallback = await pendingDefault;
    assert.equal(fallback.name, "ada");
    assert.equal(typed.name.length > 0, true);
    track(prompt);
  });

  it("should cancel with ctrl-c", async function () {
    const { input, prompt } = harness();
    const pending = prompt.ask([
      { type: "input", name: "name", message: "Name" },
    ]);
    press(input, "c", { ctrl: true, str: "c" });
    try {
      await pending;
      assert.fail("should reject");
    } catch (err) {
      assert.match(err.message, /force closed/);
    }
  });

  it("should walk history and rewrite the command line", async function () {
    const { input, chunks, prompt } = harness();
    let closed = false;
    let seen;
    prompt.setConfig({
      history: { limit: 2, blacklist: ["nope"] },
      onCtrlEnd() {
        return "go<";
      },
    });
    prompt.setHistory({ histories: { main: ["echo"] } });
    const pending = prompt.ask([
      {
        type: "command",
        name: "cmd",
        message: "$",
        context: "main",
        onBeforeKeyPress(key) {
          seen = key.name;
        },
        onBeforeRewrite(line) {
          return line.replace(/</g, "");
        },
        onClose() {
          closed = true;
        },
        autoCompletion: ["foo", "bar"],
        short(line, matches) {
          return matches;
        },
        ellipsize: true,
        maxSize: 8,
      },
    ]);
    press(input, "up");
    press(input, "down");
    press(input, "tab", { str: "\t" });
    press(input, "h");
    press(input, "tab", { str: "\t" });
    press(input, "right", { shift: true });
    press(input, "0");
    press(input, "right", { shift: true, ctrl: true });
    press(input, "end", { ctrl: true });
    enter(input);
    const answers = await pending;
    assert.equal(seen, "return");
    assert.equal(closed, true);
    assert.equal(answers.cmd, "go");
    assert.match(chunks.join("\n"), /History/);
    prompt.addToHistory("main", "nope");
    assert.deepEqual(
      prompt.getHistories(true).histories.main.includes("nope"),
      false
    );
    track(prompt);
  });

  it("should list choices with a default and move up", async function () {
    const { input, prompt } = harness();
    const pending = prompt.ask([
      {
        type: "list",
        name: "field",
        message: "Field",
        default: "b",
        choices: [
          { name: "A", value: "a" },
          { name: "B", value: "b" },
        ],
      },
    ]);
    press(input, "up");
    enter(input);
    const answers = await pending;
    assert.equal(answers.field, "a");
    track(prompt);
  });

  it("should reject an unknown prompt type", async function () {
    const { prompt } = harness();
    try {
      await prompt.ask([{ type: "checkbox", name: "x" }]);
      assert.fail("should throw");
    } catch (err) {
      assert.match(err.message, /Unknown prompt type/);
    }
  });

  it("should paint the default clear text", function () {
    const { chunks, prompt } = harness({ clearScreen: true });
    prompt.paintClear();
    assert.match(chunks.join(""), /Screen cleared/);
  });

  it("should complete shared prefixes and ignore a bad completer", function () {
    assert.equal(complete("he", ["help", "hello"]).match, "hel");
    assert.deepEqual(complete("z", ["help"]).match, "z");
    assert.equal(
      complete("a", [{ filter: (value) => value.toUpperCase() }, "ab"]).match,
      "AB"
    );
    assert.equal(complete("a", [{}, "ab"]).match, "ab");
    assert.ok(complete("a", [null, "ab"]).match);
    assert.ok(complete("a", ["a", "ab"]).matches);
    assert.ok(complete("a", ["ab", "ac"]).matches);
  });

  it("should format a narrow completion list", function () {
    const text = formatList(
      ["a-very-long-command-name"],
      { columns: 20 },
      8,
      true,
      ".."
    );
    assert.ok(text.length > 0);
    assert.equal(ellipsize("short", 10), "short");
    assert.equal(ellipsize("abcdef", 1, "…"), "…");
    assert.equal(columnsOf(null), process.stdout.columns || 80);
    assert.match(formatColumns(["ab", "cd"], 4, false), /ab +cd/);
    const row = formatList(["ab", "cd"], { columns: 80 }, 4, false);
    assert.match(row, /ab +cd/);
    const wrapped = formatList(["a", "b", "c", "d"], { columns: 10 }, 4, false);
    assert.match(wrapped, /\n/);
  });

  it("should attach and detach a raw key listener", function () {
    const events = new EventEmitter();
    let raw = false;
    const input = Object.assign(events, {
      isRaw: false,
      setRawMode(value) {
        if (value && raw) throw new Error("already raw");
        raw = value;
        this.isRaw = value;
      },
      resume() {},
      removeListener: EventEmitter.prototype.removeListener,
    });
    delete input.off;
    let seen = 0;
    const stop = listen(input, () => {
      seen += 1;
    });
    input.emit("keypress", "a", { name: "a" });
    stop();
    input.emit("keypress", "b", { name: "b" });
    assert.equal(seen, 1);
    assert.equal(raw, false);
  });

  it("should restore history, jump to an entry, and clear a bad completer", async function () {
    console.error = () => {};
    const { input, prompt } = harness();
    prompt.setHistory({ histories: { main: ["ls", "cat"] } });
    prompt.setConfig({ history: null });
    const pending = prompt.ask([
      {
        type: "command",
        name: "cmd",
        message: "$",
        prefix: "main:",
        context: "main",
        short: ["kept"],
        autoCompletion(line) {
          if (String(line).startsWith("x")) return ["xa", "xb"];
          throw new Error("nope");
        },
      },
    ]);
    press(input, "up");
    press(input, "up");
    press(input, "down");
    press(input, "tab", { str: "\t" });
    press(input, "end", { ctrl: true });
    press(input, "x");
    press(input, "tab", { str: "\t" });
    press(input, "end", { ctrl: true });
    enter(input);
    const answers = await pending;
    assert.equal(answers.cmd, "");
    const once = prompt.getHistories().histories.main.length;
    prompt.addToHistory("main", "pwd");
    prompt.addToHistory("main", "pwd");
    assert.equal(prompt.getHistories().histories.main.length, once + 1);
    prompt.setConfig({ history: { limit: 1 } });
    prompt.addToHistory("main", "one");
    prompt.addToHistory("main", "two");
    assert.deepEqual(prompt.getHistories(true).histories.main, ["two"]);
    prompt.setHistory({
      get histories() {
        throw new Error("bad");
      },
    });
    track(prompt);
  });

  it("should answer yes and cancel a list", async function () {
    const { input, prompt } = harness();
    const pending = prompt.ask({
      type: "confirm",
      name: "ok",
      message: "Go",
      default: true,
    });
    press(input, "y");
    press(input, "e");
    press(input, "s");
    enter(input);
    const yes = await pending;
    assert.equal(yes.ok, true);

    const list = prompt.ask([
      { type: "list", name: "field", message: "Field", choices: ["a"] },
    ]);
    press(input, "c", { ctrl: true, str: "c" });
    try {
      await list;
      assert.fail("should reject");
    } catch (err) {
      assert.match(err.message, /force closed/);
    }
    track(prompt);
  });

  it("should submit from a key handler", async function () {
    const { askLine } = require("../src/line");
    const { input, output, prompt } = harness();
    output.cursorTo = () => {};
    const pending = askLine(prompt, {
      message: "> ",
      onKey(state) {
        state.setLine("a");
        state.submit();
        return true;
      },
    });
    press(input, "a");
    assert.equal(await pending, "a");
  });

  it("should reject a key handler that throws", async function () {
    const { askLine } = require("../src/line");
    const { input, prompt } = harness();
    const pending = askLine(prompt, {
      message: "> ",
      onKey() {
        throw new Error("broken key");
      },
    });
    press(input, "a");
    try {
      await pending;
      assert.fail("should reject");
    } catch (err) {
      assert.equal(err.message, "broken key");
    }
  });

  it("should delete the character under the cursor", async function () {
    const { input, prompt } = harness();
    let tries = 0;
    const pending = prompt.ask([
      {
        type: "input",
        name: "name",
        message: "Name",
        validate() {
          tries += 1;
          return tries > 1 ? true : false;
        },
      },
    ]);
    press(input, "a");
    press(input, "left");
    press(input, "delete");
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(prompt.getRl().line, "");
    prompt.getRl().line = "z";
    enter(input);
    enter(input);
    const answers = await pending;
    assert.equal(answers.name, "z");
    track(prompt);
  });

  it("should use removeListener when off is missing", function () {
    const handlers = {};
    const input = {
      on(name, fn) {
        handlers[name] = fn;
      },
      removeListener(name) {
        delete handlers[name];
      },
    };
    const stop = listen(input, () => {});
    stop();
    assert.equal(handlers.keypress, undefined);

    const { PassThrough } = require("stream");
    const raw = new PassThrough();
    raw.isRaw = true;
    raw.setRawMode = () => {
      throw new Error("closed");
    };
    const stopRaw = listen(raw, () => {});
    stopRaw();
    raw.destroy();
  });

  it("should skip the clear when the output is not a tty", function () {
    const { prompt } = harness({ clearScreen: true });
    prompt.output.isTTY = false;
    prompt.armClear();
    prompt.armClear();
    assert.equal(prompt.timeoutId, null);
    prompt.output.isTTY = true;
    prompt.clearScreenTimeout = 10;
    prompt.releaseClear();
    prompt.armClear();
    prompt.armClear();
    prompt.holdClear();
    assert.equal(prompt.timeoutId, null);
    prompt.releaseClear();
    track(prompt);
  });
});
