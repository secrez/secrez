const path = require("path");
const _ = require("lodash");
const utils = require("@secrez/utils");
const fs = require("fs-extra");
const pkg = require("../../package");
const config = require(".");

class ConfigUtils {
  static isValidType(type) {
    type = parseInt(type);
    return Object.values(config.types).indexOf(type) !== -1;
  }

  static async setSecrez(config, container, localWorkingDir) {
    config = _.clone(config);
    config.container = container;
    config.root = path.basename(container);
    config.dataPath = path.join(container, "data");
    config.workingDir = "/";
    config.localWorkingDir = localWorkingDir;
    config.keysDataPath = path.join(container, "keys");
    config.keysPath = path.join(config.keysDataPath, "default.json");
    config.oldKeysPath = path.join(container, "keys.json");
    config.localDataPath = path.join(container, "local");
    config.tmpPath = path.join(container, "tmp");

    await fs.ensureDir(config.dataPath);
    await fs.ensureDir(config.keysDataPath);
    await fs.ensureDir(config.localDataPath);

    await fs.emptyDir(config.tmpPath);

    if (!(await fs.pathExists(config.oldKeysPath))) {
      await fs.writeFile(
        path.join(container, "keys.json"),
        JSON.stringify(
          {
            data: {
              why: "This file is here to cause an error in old versions of Secrez during login, and avoid that Secrez thinks the db is empty and reset it.",
            },
          },
          null,
          2
        )
      );
    }

    let oldEnvPath = path.join(container, "env.json");
    let oldHistoryPath = path.join(container, "history");

    config.envPath = path.join(config.localDataPath, "env.json");
    config.historyPath = path.join(config.localDataPath, "mainHistory");

    /* istanbul ignore if  */
    if (await fs.pathExists(oldEnvPath)) {
      await fs.move(oldEnvPath, config.envPath);
    }
    /* istanbul ignore if  */
    if (await fs.pathExists(oldHistoryPath)) {
      await fs.move(oldHistoryPath, config.historyPath);
    }
    let readmePath = path.join(container, "README");
    if (!(await fs.pathExists(readmePath))) {
      await fs.writeFile(
        readmePath,
        `
This folder has been generated by ${utils.capitalize(pkg.name)} v${pkg.version}.
It contains your secret database. 
Be very careful, and don't touch anything :o)
`,
        "utf-8"
      );
      await fs.writeFile(config.envPath, "{}");
    }
    let gitignorePath = path.join(container, ".gitignore");
    if (!(await fs.pathExists(gitignorePath))) {
      await fs.writeFile(
        gitignorePath,
        `tmp
env.json
history
local
`,
        "utf-8"
      );
    } else {
      let gitignore = await fs.readFile(gitignorePath, "utf8");
      /* istanbul ignore if  */
      if (!/local/.test(gitignore)) {
        gitignore = _.trim(gitignore) + "\nlocal\n";
        fs.writeFile(gitignorePath, gitignore);
      }
    }
    return config;
  }

  static getDatasetPath(config, index) {
    return config.dataPath + (index > 0 ? `.${index}` : "");
  }

  static setAndGetDataset(config, index) {
    let dataPath = config.dataPath;
    if (
      typeof index === "number" &&
      parseInt(index.toString()) === index &&
      index > 0
    ) {
      dataPath += "." + index;
      if (!fs.existsSync(dataPath)) {
        let lastData = ConfigUtils.getLastDataset(config);
        if (
          lastData ===
          path.basename(config.dataPath) + (index > 1 ? "." + (index - 1) : "")
        ) {
          fs.mkdirSync(dataPath);
        } else {
          throw new Error("Wrong data index");
        }
      }
    }
    return dataPath;
  }

  static deleteDataset(config, index) {
    let dataPath = config.dataPath;
    if (
      typeof index === "number" &&
      parseInt(index.toString()) === index &&
      index > 0
    ) {
      dataPath += "." + index;
      if (fs.existsSync(dataPath)) {
        fs.removeSync(dataPath);
        return true;
      }
    }
    return false;
  }

  static getLastDataset(config) {
    return ConfigUtils.listDatasets(config).pop();
  }

  static listDatasets(config) {
    return fs
      .readdirSync(config.container)
      .sort()
      .filter((e) => /^data/.test(e));
  }

  static async getEnv(config) {
    if (await fs.pathExists(config.envPath)) {
      return JSON.parse((await fs.readFile(config.envPath, "utf8")) || "{}");
    } else {
      return {};
    }
  }

  static async putEnv(config, env) {
    return await fs.writeFile(config.envPath, JSON.stringify(env));
  }
}

module.exports = ConfigUtils;
