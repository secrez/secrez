const { spawn } = require("child_process");
const { chalk } = require("./utils/Logger");
const Logger = require("./utils/Logger");
const cliConfig = require("./cliConfig");
const PreCommand = require("./PreCommand");

class Command extends PreCommand {
  constructor(prompt) {
    super();
    this.prompt = prompt;
    this.secrez = prompt.secrez;
    this.optionDefinitions = [];
    this.cliConfig = cliConfig;
    this.internalFs = prompt.internalFs;
    this.externalFs = prompt.externalFs;
    this.Logger = Logger;
    this.chalk = chalk;
  }

  help() {}

  showHelp() {
    let command = this.constructor.name.toLowerCase();
    this.prompt.commands.help.exec({ command });
  }

  setHelpAndCompletion() {}

  getCompletionType(option) {
    if (!this.completionTypes) {
      this.completionTypes = {};
      for (let item of this.optionDefinitions) {
        this.completionTypes[item.name] = item.completionType;
      }
    }
    return this.completionTypes[option];
  }

  selfCompletion(self, extraOptions = {}) {
    return async (options, originalLine, currentOption) => {
      options = Object.assign(options, extraOptions);
      options.forAutoComplete = true;
      let completionType = this.getCompletionType(currentOption);
      /* istanbul ignore if  */
      if (this.customCompletion) {
        let extra = await this.customCompletion(
          options,
          originalLine,
          currentOption
        );
        if (extra) {
          return extra;
        }
      }
      if (completionType === "dataset") {
        let datasetsInfo = await this.internalFs.getDatasetsInfo();
        options.forAutoComplete = true;
        if (options.dataset) {
          return datasetsInfo
            .map((e) => e.name)
            .filter((e) => RegExp("^" + options.dataset).test(e));
        } else {
          return datasetsInfo.map((e) => e.name);
        }
      }
      if (
        (process.env.NODE_ENV === "test" && currentOption === "path") ||
        completionType === "file"
      ) {
        if (options[currentOption] === null) {
          delete options[currentOption];
        }
        if (currentOption !== "path") {
          options.path = options[currentOption];
        }
        if (
          self.prompt.cache &&
          self.prompt.cache.findResult &&
          /^(#|£)\d+$/.test(options.path)
        ) {
          return [
            options.path +
              self.prompt.cache.findResult[
                options.path.replace(/^(#|£)/, "")
              ][1] || undefined,
          ];
        }
        // Handle < syntax for last path
        if (
          self.prompt.cache &&
          self.prompt.cache.lastPath &&
          options.path === "<"
        ) {
          return [options.path + self.prompt.cache.lastPath[0]];
        }
        return await self.prompt[
          extraOptions.external ? "externalFs" : "internalFs"
        ].getFileList(options, true);
      } else {
        return [];
      }
    };
  }

  threeRedDots(large) {
    return chalk.cyan(large ? "•••" : "···");
  }

  checkPath(options) {
    if (typeof options.path !== "string" || !options.path) {
      throw new Error("A valid path is required");
    }
  }

  validate(options, mandatoryOptions) {
    if (options._unknown) {
      throw new Error(
        `Unknown option: ${options._unknown} ` +
          chalk.grey(
            `(run "${this.constructor.name.toLowerCase()} -h" for help)`
          )
      );
    }
    if (
      options.path &&
      (/^(#|£)\d+\//.test(options.path) || /^(#|£)\d+\w+:\//.test(options.path))
    ) {
      options.path = options.path.replace(/^(#|£)\d+/, "");
    }
    if (mandatoryOptions) {
      let err = "";
      let prefix = "Missing options: ";
      for (let o in mandatoryOptions) {
        if (!options[o]) {
          err += (err ? ", " : "") + o;
        }
      }
      if (err) {
        throw new Error(prefix + err);
      }
    }
  }

  /**
   * Fetch git status without prompting. `checkFailed` means the caller may proceed.
   */
  async readGitConflictStatus() {
    try {
      return await this.internalFs.checkGitSyncStatus();
    } catch (e) {
      return { hasRisk: false, checkFailed: true };
    }
  }

  canFastForward(conflictCheck) {
    if (!conflictCheck || conflictCheck.riskType !== "behind_remote") {
      return false;
    }
    const status = conflictCheck.status;
    if (!status) return false;
    return (
      (status.behind || 0) > 0 &&
      (status.ahead || 0) === 0 &&
      (status.uncommitted || 0) === 0
    );
  }

  async offerRestart() {
    if (!this.prompt || !this.prompt.inquirer) return false;
    const restart = await this.useConfirm({
      message: "Do you want Secrez to update the repo and restart?",
      default: true,
    });
    if (!restart) return false;
    await this.realignAndRelaunch({ pull: false });
    return true;
  }

  async handleHardBlock(conflictCheck) {
    const checker = this.internalFs && this.internalFs.gitConflictChecker;
    if (!checker || !checker.sessionBlockAnnounced) {
      this.Logger.yellow(conflictCheck.message);
      if (checker) checker.sessionBlockAnnounced = true;
    }
    if (await this.offerRestart()) return;
    this.Logger.red(
      "Operation blocked for data integrity. Quit Secrez, sync the repo by hand, then start Secrez again."
    );
  }

  async askToBypassGitConflict(conflictCheck, options = {}) {
    if (!options.skipMessage) {
      this.Logger.yellow(conflictCheck.message);
    }
    const shouldContinue = await this.useInput({
      type: "confirm",
      message: "Do you want to continue anyway?",
      default: false,
    });
    if (!shouldContinue) {
      if (!options.reopenEditor) {
        this.Logger.grey("Operation cancelled.");
      }
      return false;
    }
    return true;
  }

  /**
   * Before a write: offer a fast-forward realign, or keep the current warning.
   * Returns "proceed", "stop", or "reopen" (edit should show the draft again).
   */
  async resolveGitConflict(conflictCheck, options = {}) {
    if (!conflictCheck.allowBypass) {
      await this.handleHardBlock(conflictCheck);
      return "stop";
    }

    const offer = this.canFastForward(conflictCheck);
    const manual =
      conflictCheck.riskType === "behind_remote" && !offer;

    if (offer || manual) {
      this.Logger.yellow(conflictCheck.message);
    }
    if (manual) {
      this.Logger.red(
        "Secrez cannot realign this repo automatically. Quit Secrez and align it by hand."
      );
    }
    if (offer) {
      this.Logger.yellow(
        "You can quit Secrez and run git pull in the container.\nOr Secrez can pull for you. The next question is the confirmation: yes exits, pulls, and restarts; no leaves the repo as it is."
      );
      const realign = await this.useConfirm({
        message: options.reopenEditor
          ? "Do you want Secrez to pull the repo now? Unsaved text will be discarded."
          : "Do you want Secrez to pull the repo now?",
        default: true,
      });
      if (realign) {
        await this.realignAndRelaunch({ pull: true });
        return "stop";
      }
    }

    const shouldContinue = await this.askToBypassGitConflict(conflictCheck, {
      reopenEditor: options.reopenEditor,
      skipMessage: offer || manual,
    });
    if (shouldContinue) return "proceed";
    return options.reopenEditor ? "reopen" : "stop";
  }

  /**
   * After login the fingerprint is already known. Ask once, before the prompt,
   * when the repo is behind. No means enter anyway.
   */
  async offerUpdateAfterLogin(conflictCheck) {
    if (
      !conflictCheck ||
      !conflictCheck.hasRisk ||
      conflictCheck.riskType !== "behind_remote" ||
      !this.prompt ||
      !this.prompt.inquirer
    ) {
      return;
    }

    this.Logger.yellow(conflictCheck.message);
    if (!this.canFastForward(conflictCheck)) {
      this.Logger.red(
        "Secrez cannot realign this repo automatically. Quit Secrez and align it by hand."
      );
      return;
    }

    const update = await this.useConfirm({
      message: "Do you want Secrez to update the repo and restart?",
      default: true,
    });
    if (update) {
      await this.realignAndRelaunch({ pull: true });
    }
  }

  releasePromptInput() {
    try {
      const rl = this.prompt && this.prompt.getRl && this.prompt.getRl();
      if (rl) {
        rl.removeAllListeners();
        if (typeof rl.pause === "function") rl.pause();
      }
    } catch (e) {
      // The prompt may already be closed.
    }
  }

  runGit(args) {
    const containerPath = this.secrez.config.container;
    return new Promise((resolve) => {
      const child = spawn("git", args, {
        cwd: containerPath,
        stdio: "inherit",
      });
      child.on("exit", (code) => resolve(code == null ? 1 : code));
      child.on("error", () => resolve(1));
    });
  }

  relaunchSecrez() {
    const child = spawn(process.execPath, process.argv.slice(1), {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });
    child.on("exit", (code) => {
      process.exit(code == null ? 1 : code);
    });
    child.on("error", (error) => {
      this.Logger.red(error.message);
      process.exit(1);
    });
  }

  async realignAndRelaunch({ pull }) {
    if (process.env.NODE_ENV === "test") {
      this.Logger.reset(
        pull ? "Would realign and relaunch." : "Would relaunch."
      );
      return;
    }

    const wasLoggedIn = Boolean(this.secrez.masterKeyHash);
    if (wasLoggedIn) {
      await this.prompt.saveHistory();
      this.secrez.signout();
    }
    this.releasePromptInput();

    if (pull) {
      this.Logger.reset("Pulling the repo...");
      const code = await this.runGit(["pull", "--ff-only"]);
      if (code !== 0) {
        this.Logger.red(
          "git pull failed. Align the repo by hand, then start Secrez again."
        );
        process.exit(1);
      }
    }

    this.Logger.reset("Restarting Secrez...");
    this.relaunchSecrez();
    await new Promise(() => {});
  }

  /**
   * Check for git conflicts before performing data-changing operations
   * Returns true if the operation should proceed, false if it should be cancelled
   */
  async checkGitConflictsBeforeOperation() {
    const conflictCheck = await this.readGitConflictStatus();

    if (conflictCheck.checkFailed) {
      this.Logger.yellow(
        "Warning: Could not check git status. Proceeding anyway."
      );
      return true;
    }

    if (!conflictCheck.hasRisk) {
      return true;
    }

    const decision = await this.resolveGitConflict(conflictCheck);
    return decision === "proceed";
  }
}

module.exports = Command;
