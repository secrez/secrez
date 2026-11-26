const { chalk } = require("./utils/Logger");
const Crypto = require("@secrez/crypto");
const { editInMemory } = require("./editor/MemoryEditor");

class PreCommand {
  async useEditor(options) {
    if (this.prompt.editorProvider) {
      return this.prompt.editorProvider(options);
    } /* istanbul ignore next */ else {
      // Do not pause/resume inquirer-command-prompt's cached rl: after the user
      // submits `edit …`, that Interface is already closed. On Node 24+,
      // rl.pause()/resume() on a closed Interface throw ERR_USE_AFTER_CLOSE
      // ("readline was closed"). Even on Node 22, pause/resume on the dead
      // Interface still toggles process.stdin and races the next prompt.
      // MemoryEditor owns stdin directly instead.
      const stdin = process.stdin;
      const wasRaw = typeof stdin.isRaw === "boolean" ? stdin.isRaw : false;

      try {
        return await editInMemory(options.content || "");
      } finally {
        if (stdin.isTTY && typeof stdin.setRawMode === "function") {
          try {
            stdin.setRawMode(wasRaw);
          } catch (e) {
            // ignore — stdin may already be in the desired mode
          }
        }
        // Ensure stdin is flowing again for the next inquirer/command prompt
        if (typeof stdin.resume === "function" && stdin.isPaused()) {
          stdin.resume();
        }
      }
    }
  }

  async useSelect(options) {
    let cancel = "(cancel)";
    if (!options.dontCancel) {
      options.choices = options.choices.concat([cancel]);
    }
    let { result } = await this.prompt.inquirer.prompt([
      {
        type: "list",
        name: "result",
        message: options.message,
        choices: options.choices,
      },
    ]);
    if (result === cancel) {
      return;
    } else {
      return result;
    }
  }

  async useConfirm(options) {
    let { result } = await this.prompt.inquirer.prompt([
      {
        type: "confirm",
        name: "result",
        message: options.message,
        default: options.default,
      },
    ]);
    return result;
  }

  async useInput(options) {
    let prompt = this.prompt;
    let exitCode = Crypto.getRandomBase58String(2);
    let { result } = await prompt.inquirer.prompt([
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
    ]);
    if (result !== exitCode) {
      return result;
    }
  }
}

module.exports = PreCommand;
