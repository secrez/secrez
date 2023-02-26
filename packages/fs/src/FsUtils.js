const _ = require("lodash");
const path = require("path");
const utils = require("@secrez/utils");

const commandLineArgs = require("command-line-args");

class FsUtils {
  static preParseCommandLine(commandLine) {
    let argv = [];
    let k = 0;
    let sep;
    commandLine = _.trim(commandLine);
    for (let i = 0; i < commandLine.length; i++) {
      let c = commandLine[i];
      if (!sep && /("|')/.test(c)) {
        sep = c;
      } else if (sep && c === sep) {
        sep = null;
      } else if (
        !sep &&
        c === "\\" &&
        commandLine[i + 1] &&
        commandLine[i + 1] !== "\\"
      ) {
        utils.addTo(argv, k, commandLine[i + 1]);
        i++;
      } else if (!sep && c === " ") {
        k++;
      } else {
        utils.addTo(argv, k, c);
      }
    }
    return argv;
  }

  static parseCommandLine(definitions, commandLine) {
    if (definitions && definitions.length) {
      let argv = {
        partial: true,
        camelCase: true,
      };
      if (commandLine) {
        argv.argv = this.preParseCommandLine(commandLine);
      }
      return commandLineArgs(definitions, argv);
    }
    return {};
  }

  static async filterLs(options = {}, list = []) {
    if (typeof options === "string") {
      options = { path: options };
    }
    let file = options.path || "";
    let bn = file ? path.basename(file) : "";
    if (bn === "." || bn === "..") {
      bn = "";
    }
    if (bn && list.includes(bn)) {
      return [bn];
    } else if (bn) {
      bn = bn
        .replace(/\./g, "\\.")
        .replace(/\*/g, ".*")
        .replace(/\?/g, ".{1}}");
      let re = RegExp(bn);
      list = _.filter(list, (e) => re.test(e));
    }
    return list.map((f) => {
      f = f.split("/");
      let l = f.length - 1;
      if (f[l]) {
        return f[l];
      } else {
        return f[l - 1] + "/";
      }
    });
  }
}

module.exports = FsUtils;
