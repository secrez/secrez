const inquirer = require("inquirer");
const { chalk } = require("../utils/Logger");
const Crypto = require("@secrez/crypto");
const { editInMemory } = require("../editor/MemoryEditor");

class Prompt {
  constructor(host = {}) {
    this.host = host;
    this.timeoutId = null;
    this.clearHolds = 0;
  }

  clearScreen() {
    process.stdout.write("\u001b[2J\u001b[0;0H");
    process.stdout.write(
      "Screen cleared. Press any key to reactivate the terminal"
    );
  }

  armClear() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.clearHolds > 0) return;
    if (!process.stdout.isTTY) return;
    const seconds = this.host.clearScreenTimeout || 180;
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null;
      this.clearScreen();
    }, seconds * 1000);
    if (typeof this.timeoutId.unref === "function") {
      this.timeoutId.unref();
    }
  }

  holdClear() {
    this.clearHolds += 1;
    if (this.clearHolds === 1 && this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  releaseClear() {
    this.clearHolds = Math.max(0, this.clearHolds - 1);
    if (this.clearHolds === 0) this.armClear();
  }

  /**
   * skipClear defaults to true: a question on screen suspends the clear.
   * Pass false only for the idle command prompt, where the clear must run.
   */
  async ask(questions, options = {}) {
    const skipClear = options.skipClear !== false;
    if (skipClear) this.holdClear();
    else this.armClear();
    try {
      return await inquirer.prompt(questions);
    } finally {
      if (skipClear) this.releaseClear();
    }
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
    const skipClear = options.skipClear !== false;
    if (skipClear) this.holdClear();
    try {
      if (this.host.editorProvider) {
        return await this.host.editorProvider(options);
      }
      /* istanbul ignore next */
      const stdin = process.stdin;
      const wasRaw = typeof stdin.isRaw === "boolean" ? stdin.isRaw : false;
      try {
        return await editInMemory(options.content || "", {
          onReady: options.onEditorReady,
        });
      } finally {
        if (stdin.isTTY && typeof stdin.setRawMode === "function") {
          try {
            stdin.setRawMode(wasRaw);
          } catch (e) {
            // ignore — stdin may already be in the desired mode
          }
        }
        if (typeof stdin.resume === "function" && stdin.isPaused()) {
          stdin.resume();
        }
      }
    } finally {
      if (skipClear) this.releaseClear();
    }
  }
}

module.exports = Prompt;
