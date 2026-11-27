const chai = require("chai");
const assert = chai.assert;
const Crypto = require("@secrez/crypto");
const PreCommand = require("../src/PreCommand");
const Prompt = require("../src/prompts/Prompt");

describe("#PreCommand", function () {
  let cmd;
  let host;

  beforeEach(function () {
    cmd = new PreCommand();
    host = {
      getRl() {
        return { pause() {}, resume() {} };
      },
    };
    host.prompts = new Prompt(host);
    cmd.prompt = host;
  });

  function stubAsk(answer) {
    return async (questions) => {
      host.questions = questions;
      return answer;
    };
  }

  describe("#useConfirm", function () {
    it("should return the confirm result", async function () {
      host.prompts.ask = stubAsk({ result: true });
      assert.isTrue(await cmd.useConfirm({ message: "Sure?", default: false }));
    });
  });

  describe("#useSelect", function () {
    it("should return the selected choice", async function () {
      host.prompts.ask = stubAsk({ result: "alpha" });
      assert.equal(
        await cmd.useSelect({ message: "Pick", choices: ["alpha", "beta"] }),
        "alpha"
      );
    });

    it("should return undefined when cancelled", async function () {
      host.prompts.ask = stubAsk({ result: "(cancel)" });
      assert.isUndefined(
        await cmd.useSelect({ message: "Pick", choices: ["alpha"] })
      );
    });

    it("should not add cancel when dontCancel is set", async function () {
      host.prompts.ask = stubAsk({ result: "only" });
      await cmd.useSelect({
        message: "Pick",
        choices: ["only"],
        dontCancel: true,
      });
      assert.deepEqual(host.questions[0].choices, ["only"]);
    });
  });

  describe("#useInput", function () {
    it("should return the typed value", async function () {
      host.prompts.ask = stubAsk({ result: "hello" });
      assert.equal(
        await cmd.useInput({ message: "Name", name: "name" }),
        "hello"
      );
    });

    it("should return undefined when the user cancels with the exit code", async function () {
      const exitCode = "ZZ";
      const original = Crypto.getRandomBase58String;
      Crypto.getRandomBase58String = () => exitCode;
      host.prompts.ask = stubAsk({ result: exitCode });
      try {
        assert.isUndefined(
          await cmd.useInput({ message: "Name", name: "name" })
        );
      } finally {
        Crypto.getRandomBase58String = original;
      }
    });

    it("should run custom validate", async function () {
      host.prompts.ask = stubAsk({ result: "valid" });
      assert.equal(
        await cmd.useInput({
          message: "Code",
          validate: (v) => v === "valid",
        }),
        "valid"
      );
    });
  });

  describe("#useEditor", function () {
    it("should use editorProvider when set", async function () {
      host.editorProvider = async (opts) => `edited:${opts.content}`;
      assert.equal(await cmd.useEditor({ content: "start" }), "edited:start");
    });
  });
});
