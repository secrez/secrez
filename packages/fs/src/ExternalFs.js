const fs = require("fs-extra");
const path = require("path");

class ExternalFs {
  constructor(secrez) {
    if (secrez.constructor.name === "Secrez") {
      this.secrez = secrez;
    } else {
      throw new Error(
        "ExternalFs requires a Secrez instance during construction"
      );
    }
  }

  getNormalizedPath(file = "") {
    if (file === "~") {
      file = "";
    } else if (/^~\//.test(file)) {
      file = file.replace(/^~\//, "");
    }
    let resolvedFile = path.resolve(this.secrez.config.localWorkingDir, file);
    return path.normalize(resolvedFile);
  }

  async getFileList(options = {}) {
    try {
      return await this.fileList(options);
    } catch (e) {
      return [];
    }
  }

  async fileList(options = {}) {
    if (typeof options === "string") {
      options = { path: options };
    }
    let [isDir, list] = await this.getDir(
      this.getNormalizedPath(options.path),
      options.forAutoComplete
    );
    list = list.filter((f) => {
      let pre = true;
      if (options.dironly) {
        pre = /\/$/.test(f);
      } else if (options.fileonly) {
        pre = !/\/$/.test(f);
      }
      if (pre && !options.all) {
        pre = !/^\./.test(f);
      }
      return pre;
    });
    if (options.returnIsDir) {
      return [isDir, list];
    } else {
      return list;
    }
  }

  async mapDir(dir) {
    let list = await fs.readdir(dir);
    for (let i = 0; i < list.length; i++) {
      list[i] =
        list[i] + ((await this.isDir(path.join(dir, list[i]))) ? "/" : "");
    }
    return list;
  }

  async getDir(dir, forAutoComplete) {
    let list = [];
    let isDir = await this.isDir(dir);
    if (isDir) {
      list = await this.mapDir(dir);
    } else {
      let fn = path.basename(dir);
      if (fn) {
        if (await this.isFile(dir)) {
          list = [fn];
        } else {
          dir = dir.replace(/\/[^/]+$/, "/");
          if (await this.isDir(dir)) {
            list = await this.mapDir(dir);
          }
          fn =
            "^" +
            fn.replace(/\?/g, ".{1}").replace(/\*/g, ".*") +
            (forAutoComplete ? "" : "(|\\/)$");
          let re = RegExp(fn);
          list = list.filter((e) => {
            return re.test(e);
          });
        }
      }
    }
    return [isDir, list];
  }

  async isDir(dir) {
    if (await fs.pathExists(dir)) {
      return (await fs.lstat(dir)).isDirectory();
    }
    return false;
  }

  async isFile(fn) {
    if (await fs.pathExists(fn)) {
      return (await fs.lstat(fn)).isFile();
    }
    return false;
  }

  async getVersionedBasename(p) {
    p = this.getNormalizedPath(p);
    let dir = path.dirname(p);
    let fn = path.basename(p);
    let name = fn;
    let v = 1;
    for (;;) {
      let filePath = path.join(dir, name);
      if (!(await fs.pathExists(filePath))) {
        return name;
      } else {
        name = fn + "." + ++v;
      }
    }
  }
}

module.exports = ExternalFs;
