const { EventEmitter } = require("events");
const chai = require("chai");
const assert = chai.assert;
const { Prompt } = require("../src");

function harness() {
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
  const prompt = new Prompt({ input, output });
  return { input, chunks, prompt };
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

function type(input, text) {
  for (const char of text) press(input, char);
}

function enter(input) {
  press(input, "return");
}

function wait() {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

describe("@secrez/prompt basics", function () {
  describe("input", function () {
    it("should return the typed text", async function () {
      const { input, prompt } = harness();
      const pending = prompt.ask([
        { type: "input", name: "name", message: "Name" },
      ]);
      type(input, "ada");
      enter(input);
      assert.deepEqual(await pending, { name: "ada" });
    });

    it("should treat a missing type as input", async function () {
      const { input, prompt } = harness();
      const pending = prompt.ask([
        { name: "first", message: "First" },
        { name: "second", message: "Second" },
      ]);
      type(input, "a");
      enter(input);
      await wait();
      type(input, "b");
      enter(input);
      assert.deepEqual(await pending, { first: "a", second: "b" });
    });

    it("should return an empty string when there is no default", async function () {
      const { input, prompt } = harness();
      const pending = prompt.ask([
        { type: "input", name: "name", message: "Name" },
      ]);
      enter(input);
      assert.deepEqual(await pending, { name: "" });
    });

    it("should use the default when the line is empty", async function () {
      const { input, prompt } = harness();
      const pending = prompt.ask([
        { type: "input", name: "name", message: "Name", default: "ada" },
      ]);
      enter(input);
      assert.deepEqual(await pending, { name: "ada" });
    });

    it("should insert, move, and delete inside the line", async function () {
      const { input, prompt } = harness();
      const pending = prompt.ask([
        { type: "input", name: "name", message: "Name" },
      ]);
      type(input, "ac");
      press(input, "left");
      type(input, "b");
      enter(input);
      assert.deepEqual(await pending, { name: "abc" });

      const removed = prompt.ask([
        { type: "input", name: "name", message: "Name" },
      ]);
      type(input, "ab");
      press(input, "backspace");
      press(input, "left");
      press(input, "delete");
      enter(input);
      assert.deepEqual(await removed, { name: "" });
    });

    it("should move to the ends of the line", async function () {
      const { input, prompt } = harness();
      const pending = prompt.ask([
        { type: "input", name: "name", message: "Name" },
      ]);
      type(input, "ab");
      press(input, "a", { ctrl: true, str: "" });
      type(input, "z");
      enter(input);
      assert.deepEqual(await pending, { name: "zab" });

      const atEnd = prompt.ask([
        { type: "input", name: "name", message: "Name" },
      ]);
      type(input, "ab");
      press(input, "home");
      press(input, "e", { ctrl: true, str: "" });
      type(input, "z");
      enter(input);
      assert.deepEqual(await atEnd, { name: "abz" });
    });

    it("should show a validation message and ask again", async function () {
      const { input, chunks, prompt } = harness();
      let tries = 0;
      const pending = prompt.ask([
        {
          type: "input",
          name: "name",
          message: "Name",
          validate(value) {
            tries += 1;
            if (tries === 1) return false;
            return value === "ada" ? true : "Use ada.";
          },
        },
      ]);
      enter(input);
      await wait();
      type(input, "no");
      enter(input);
      await wait();
      press(input, "backspace");
      press(input, "backspace");
      type(input, "ada");
      enter(input);
      assert.deepEqual(await pending, { name: "ada" });
      const painted = chunks.join("");
      assert.match(painted, /Please enter a value/);
      assert.match(painted, /Use ada/);
    });
  });

  describe("password", function () {
    it("should return the secret and print stars", async function () {
      const { input, chunks, prompt } = harness();
      const pending = prompt.ask([
        { type: "password", name: "secret", message: "Password" },
      ]);
      type(input, "ab");
      press(input, "backspace");
      type(input, "c");
      enter(input);
      assert.deepEqual(await pending, { secret: "ac" });
      const painted = chunks.join("");
      assert.match(painted, /\*/);
      assert.notMatch(painted, /ac/);
    });

    it("should use the password default when the line is empty", async function () {
      const { input, prompt } = harness();
      const pending = prompt.ask([
        {
          type: "password",
          name: "secret",
          message: "Password",
          default: "hidden",
        },
      ]);
      enter(input);
      assert.deepEqual(await pending, { secret: "hidden" });
    });
  });

  describe("confirm", function () {
    async function confirm(answer, options) {
      const { input, prompt } = harness();
      const pending = prompt.ask([
        Object.assign({ type: "confirm", name: "ok", message: "Go?" }, options),
      ]);
      if (answer) type(input, answer);
      enter(input);
      return (await pending).ok;
    }

    it("should accept yes in either case", async function () {
      assert.strictEqual(await confirm("y", { default: false }), true);
      assert.strictEqual(await confirm("yes", { default: false }), true);
      assert.strictEqual(await confirm("Y", { default: false }), true);
    });

    it("should accept no in either case", async function () {
      assert.strictEqual(await confirm("n", { default: true }), false);
      assert.strictEqual(await confirm("no", { default: true }), false);
      assert.strictEqual(await confirm("N", { default: true }), false);
    });

    it("should use the default when the answer is empty", async function () {
      assert.strictEqual(await confirm("", { default: true }), true);
      assert.strictEqual(await confirm("", { default: false }), false);
      assert.strictEqual(await confirm(""), false);
    });
  });

  describe("list", function () {
    it("should select the first choice on enter", async function () {
      const { input, chunks, prompt } = harness();
      const pending = prompt.ask([
        {
          type: "list",
          name: "field",
          message: "Field",
          choices: ["email", "password"],
        },
      ]);
      enter(input);
      assert.deepEqual(await pending, { field: "email" });
      assert.match(chunks.join(""), /email/);
    });

    it("should wrap at both ends", async function () {
      const { input, prompt } = harness();
      const up = prompt.ask([
        {
          type: "list",
          name: "field",
          message: "Field",
          choices: ["a", "b", "c"],
        },
      ]);
      press(input, "up");
      enter(input);
      assert.deepEqual(await up, { field: "c" });

      const down = prompt.ask([
        {
          type: "list",
          name: "field",
          message: "Field",
          choices: ["a", "b", "c"],
        },
      ]);
      press(input, "down");
      press(input, "down");
      press(input, "down");
      enter(input);
      assert.deepEqual(await down, { field: "a" });
    });

    it("should honor a default and object choices", async function () {
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
            { value: 3 },
          ],
        },
      ]);
      enter(input);
      assert.deepEqual(await pending, { field: "b" });

      const fallback = prompt.ask([
        {
          type: "list",
          name: "field",
          message: "Field",
          default: "missing",
          choices: [{ value: 3 }],
        },
      ]);
      enter(input);
      assert.deepEqual(await fallback, { field: 3 });
    });

    it("should resolve an empty list as undefined", async function () {
      const { input, prompt } = harness();
      const pending = prompt.ask([
        { type: "list", name: "field", message: "Field", choices: [] },
      ]);
      enter(input);
      assert.deepEqual(await pending, { field: undefined });
    });
  });

  describe("command", function () {
    it("should keep history for context 0", async function () {
      const { input, prompt } = harness();
      prompt.setHistory({ histories: { 0: ["ls"] } });
      const pending = prompt.ask([
        { type: "command", name: "cmd", message: "$", context: 0 },
      ]);
      press(input, "up");
      enter(input);
      assert.deepEqual(await pending, { cmd: "ls" });
    });

    it("should walk history and clear it past the end", async function () {
      const { input, prompt } = harness();
      prompt.setHistory({ histories: { _default: ["ls"] } });
      const pending = prompt.ask([
        { type: "command", name: "cmd", message: "$" },
      ]);
      press(input, "up");
      press(input, "down");
      enter(input);
      assert.deepEqual(await pending, { cmd: "" });
    });

    it("should keep contexts apart and skip a repeated command", async function () {
      const { input, prompt } = harness();
      const first = prompt.ask([
        { type: "command", name: "cmd", message: "$", context: "main" },
      ]);
      type(input, "ls");
      enter(input);
      await first;
      const second = prompt.ask([
        { type: "command", name: "cmd", message: "$", context: "main" },
      ]);
      type(input, "ls");
      enter(input);
      await second;
      const other = prompt.ask([
        { type: "command", name: "cmd", message: "$", context: "other" },
      ]);
      press(input, "up");
      enter(input);
      assert.deepEqual(await other, { cmd: "" });
      assert.deepEqual(prompt.getHistories().histories.main, ["ls"]);
    });

    it("should complete a shared prefix and list several matches", async function () {
      const { input, chunks, prompt } = harness();
      const pending = prompt.ask([
        {
          type: "command",
          name: "cmd",
          message: "$",
          autoCompletion: ["help", "hello", "ls"],
        },
      ]);
      type(input, "he");
      press(input, "tab", { str: "\t" });
      enter(input);
      assert.deepEqual(await pending, { cmd: "hel" });

      const listed = prompt.ask([
        {
          type: "command",
          name: "cmd",
          message: "$",
          autoCompletion: ["foo", "bar"],
        },
      ]);
      press(input, "tab", { str: "\t" });
      enter(input);
      assert.deepEqual(await listed, { cmd: "" });
      assert.match(chunks.join(""), /Available commands/);
    });
  });
});
