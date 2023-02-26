class Leave extends require("../../Command") {
  setHelpAndCompletion() {
    this.cliConfig.chatCompletion.leave = {
      _func: this.selfCompletion(this),
      _self: this,
    };
    this.cliConfig.chatCompletion.help.leave = true;
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
      description: ["Leaves a room"],
      examples: ["leave"],
    };
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp();
    }
    if (this.prompt.environment.room) {
      this.prompt.environment.chatPrompt.onBeforeClose();
    }
    await this.prompt.run();
  }
}

module.exports = Leave;
