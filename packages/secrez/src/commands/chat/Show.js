const { UglyDate } = require("@secrez/utils");

class Show extends require("../../Command") {
  setHelpAndCompletion() {
    this.cliConfig.chatCompletion.show = {
      _func: this.selfCompletion(this),
      _self: this,
    };
    this.cliConfig.chatCompletion.help.show = true;
    this.optionDefinitions = [
      {
        name: "help",
        alias: "h",
        type: Boolean,
      },
      {
        name: "from",
        alias: "f",
        type: String,
        multiple: true,
      },
      {
        name: "to",
        alias: "t",
        type: String,
        multiple: true,
      },
      {
        name: "verbose",
        type: Boolean,
      },
    ];
  }

  help() {
    return {
      description: ["Show chat history in a room"],
      examples: [
        [
          "show -f 2 days -t an hour",
          "after joining someone, shows all the messages from 2 days ago to 1 hour ago",
        ],
        ["show", "in the joined context, shows all the messages"],
        ["show -f 1596129722352", "shows all the messages since the timestamp"],
        [
          "show -f 2020-07-06 -t 1 hour ago",
          "shows all the messages since the 6th of July to an hour ago",
        ],
        [
          "show -f 3d -t 1h",
          "shows all the messages since 3 days ago to an hour ago",
        ],
        ["show -f 1M", "shows all the messages since a month ago (30 days)"],
        [
          "show -f 2h --verbose",
          "shows the messages with exact dates and times",
        ],
      ],
    };
  }

  getTimestamp(date, param) {
    if (!this.uglyDate) {
      this.uglyDate = new UglyDate();
    }
    let timestamp;
    try {
      timestamp = this.uglyDate.uglify(date);
    } catch (e) {
      if (/^[0-9]+$/.test(date)) {
        timestamp = parseInt(date);
      }
      if (!timestamp || isNaN(timestamp)) {
        try {
          let d = new Date(date);
          timestamp = d.getUTCDate().getTime();
        } catch (e) {
          throw new Error(`Bad or unsupported date format for "--${param}"`);
        }
      }
    }
    return timestamp;
  }

  async show(options) {
    if (!this.prompt.environment.room) {
      throw new Error('You must join a conversation to use "show"');
    }
    if (options.from) {
      options.minTimestamp = this.getTimestamp(options.from.join(" "), "from");
    }
    if (options.to) {
      options.maxTimestamp = this.getTimestamp(options.to.join(" "), "to");
    }
    return this.prompt.environment.readHistoryMessages(options);
  }

  async exec(options = {}) {
    if (options.help) {
      return this.showHelp();
    }
    try {
      this.validate(options);
      await this.show(options);
    } catch (e) {
      this.Logger.red(e.message);
    }
    await this.prompt.run();
  }
}

module.exports = Show;
