const fs = require("fs-extra");
const _ = require("lodash");

class Commands {
  constructor(prompt, config, subfolder) {
    this.prompt = prompt;
    this.config = config;
    this.subfolder = subfolder;
  }

  getCommands(exceptions = [], refresh) {
    if (!this.list || refresh) {
      let folder = __dirname;
      if (this.subfolder) {
        folder += "/" + this.subfolder;
      }
      this.list = _.filter(fs.readdirSync(folder), (e) => e !== "index.js");
      this.commands = {};
      for (let file of this.list) {
        let command = file.split(".")[0];
        if (exceptions.includes(command)) {
          continue;
        }
        try {
          const klass = require(`${folder}/${command}`);
          const instance = new klass(this.prompt, this.config);
          instance.setHelpAndCompletion();
          this.commands[command.toLowerCase()] = instance;
        } catch (e) {
          /* istanbul ignore if  */
          if (process.env.NODE_ENV === "dev") {
            console.error(e);
            console.debug(`${file} is not a command`);
          }
        }
      }
    }
    return this.commands;
  }
}

module.exports = Commands;
