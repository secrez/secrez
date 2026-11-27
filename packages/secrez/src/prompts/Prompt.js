const chalk = require("chalk");
const Crypto = require("@secrez/crypto");
const { Prompt: BasePrompt } = require("@secrez/prompt");

class Prompt extends BasePrompt {
  constructor(host = {}) {
    super({
      clearScreen: true,
      clearScreenTimeout: host.clearScreenTimeout || 180,
      input: host.input,
      output: host.output,
    });
    this.host = host;
  }

  async useConfirm(options = {}) {
    let { result } = await this.ask(
      [
        {
          type: "confirm",
          name: "result",
          message: options.message,
          default: options.default,
        },
      ],
      options
    );
    return result;
  }

  async useSelect(options = {}) {
    let cancel = "(cancel)";
    if (!options.dontCancel) {
      options.choices = options.choices.concat([cancel]);
    }
    let { result } = await this.ask(
      [
        {
          type: "list",
          name: "result",
          message: options.message,
          choices: options.choices,
        },
      ],
      options
    );
    if (result === cancel) {
      return;
    }
    return result;
  }

  async useInput(options = {}) {
    let exitCode = Crypto.getRandomBase58String(2);
    let { result } = await this.ask(
      [
        {
          type: options.type || "input",
          name: "result",
          message: options.message,
          default: options.content,
          choices: options.choices,
          validate: (val) => {
            if (val) {
              if (val === exitCode) {
                return true;
              } else if (options.validate) {
                return options.validate(val, exitCode);
              } else if (val.length) {
                return true;
              }
            }
            return chalk.grey(
              `Please, type the ${options.name}, or cancel typing ${chalk.bold(
                exitCode
              )}`
            );
          },
        },
      ],
      options
    );
    if (result !== exitCode) {
      return result;
    }
  }

  async useEditor(options = {}) {
    if (this.host && typeof this.host.editorProvider === "function") {
      return super.useEditor(
        Object.assign({}, options, {
          editor: (opts) => this.host.editorProvider(opts),
        })
      );
    }
    return super.useEditor(options);
  }
}

module.exports = Prompt;
