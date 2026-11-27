const chai = require("chai");
const assert = chai.assert;
const inquirer = require("inquirer");
const Prompt = require("../src/prompts/Prompt");

describe("#Prompt", function () {
  let originalPrompt;

  beforeEach(function () {
    originalPrompt = inquirer.prompt;
  });

  afterEach(function () {
    inquirer.prompt = originalPrompt;
  });

  it("should suspend the clear while a question is open", async function () {
    const prompt = new Prompt({ clearScreenTimeout: 1 });
    let during;
    inquirer.prompt = async () => {
      during = prompt.clearHolds;
      return { result: true };
    };

    assert.isTrue(await prompt.useConfirm({ message: "Sure?" }));
    assert.equal(during, 1);
    assert.equal(prompt.clearHolds, 0);
    if (prompt.timeoutId) clearTimeout(prompt.timeoutId);
  });

  it("should keep the clear armed for the command prompt", async function () {
    const prompt = new Prompt({ clearScreenTimeout: 1 });
    let during;
    inquirer.prompt = async () => {
      during = prompt.clearHolds;
      return { cmd: "ls" };
    };

    await prompt.ask([{ type: "command", name: "cmd" }], { skipClear: false });
    assert.equal(during, 0);
    if (prompt.timeoutId) clearTimeout(prompt.timeoutId);
  });

  it("should not restart the clear while another question is still open", function () {
    const prompt = new Prompt({});
    prompt.holdClear();
    prompt.holdClear();
    prompt.releaseClear();
    assert.equal(prompt.clearHolds, 1);
    assert.isNull(prompt.timeoutId);
    prompt.releaseClear();
    assert.equal(prompt.clearHolds, 0);
    if (prompt.timeoutId) clearTimeout(prompt.timeoutId);
  });
});
