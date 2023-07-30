const chalk = require("chalk");

class Whoami extends require("../Command") {
  setHelpAndCompletion() {
    this.cliConfig.completion.whoami = {
      _func: this.selfCompletion(this),
      _self: this,
    };
    this.cliConfig.completion.help.whoami = true;
    this.optionDefinitions = [
      {
        name: "help",
        alias: "h",
        type: Boolean,
      },
    ];
  }

  help() {
    return {
      description: ["Show your Secrez public key"],
      examples: ["whoami"],
    };
  }

  async customCompletion() {
    return [];
  }

  async whoami(options) {
    let result = {
      publicKey: this.secrez.getPublicKey(),
    };
    if (options.asIs) {
      return result;
    }
    this.Logger.reset(chalk.grey("Public key: ") + result.publicKey);
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp();
    }
    try {
      this.validate(options);
      await this.whoami(options);
    } catch (e) {
      this.Logger.red(e.message);
    }
    await this.prompt.run();
  }
}

module.exports = Whoami;
