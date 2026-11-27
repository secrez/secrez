const { EventEmitter } = require("events");
const chai = require("chai");
const assert = chai.assert;
const Prompt = require("../src/prompts/Prompt");

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

describe("#Prompt", function () {
  const timers = [];

  afterEach(function () {
    while (timers.length) clearTimeout(timers.pop());
  });

  function harness() {
    const input = new EventEmitter();
    const output = {
      isTTY: true,
      columns: 80,
      write() {},
      cursorTo() {},
    };
    const prompt = new Prompt({ clearScreenTimeout: 1, input, output });
    return { input, prompt };
  }

  it("should suspend the clear while a question is open", async function () {
    const { input, prompt } = harness();
    const pending = prompt.useConfirm({ message: "Sure?", default: true });
    assert.equal(prompt.clearHolds, 1);
    press(input, "return");
    assert.isTrue(await pending);
    assert.equal(prompt.clearHolds, 0);
    if (prompt.timeoutId) timers.push(prompt.timeoutId);
  });

  it("should keep the clear armed for the command prompt", async function () {
    const { input, prompt } = harness();
    const pending = prompt.ask([{ type: "input", name: "cmd", message: "$" }], {
      skipClear: false,
    });
    press(input, "a");
    press(input, "return");
    await pending;
    assert.equal(prompt.clearHolds, 0);
    assert.ok(prompt.timeoutId);
    timers.push(prompt.timeoutId);
  });

  it("should edit the loaded text when a vault path is also set", async function () {
    const { input, prompt } = harness();
    const pending = prompt.useEditor({
      content: "vita",
      path: "/vault/carmela.yml",
    });
    press(input, "d", { ctrl: true });
    assert.equal(await pending, "vita");
  });

  it("should not restart the clear while another question is still open", function () {
    const { prompt } = harness();
    prompt.holdClear();
    prompt.holdClear();
    prompt.releaseClear();
    assert.equal(prompt.clearHolds, 1);
    assert.isNull(prompt.timeoutId);
    prompt.releaseClear();
    assert.equal(prompt.clearHolds, 0);
    if (prompt.timeoutId) timers.push(prompt.timeoutId);
  });
});
