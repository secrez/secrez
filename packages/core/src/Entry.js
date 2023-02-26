const { removeNotPrintableChars } = require("@secrez/utils");

class Entry {
  isValid(option) {
    return Entry.validOptions.includes(option);
  }

  constructor(options) {
    this.set(options);
  }

  get(options = Entry.validOptions) {
    let obj = {};
    for (let o of options) {
      if (this.isValid(o) && typeof this[o] !== "undefined") {
        obj[o] = this[o];
      }
    }
    return obj;
  }

  set(key, value) {
    let options = {};
    if (typeof key === "object") {
      options = key;
    } else {
      options[key] = value;
    }
    if (options.name) {
      options.name = Entry.sanitizeName(options.name);
    }
    for (let o in options) {
      if (this.isValid(o) && typeof options[o] !== "undefined") {
        this[o] = options[o];
      }
    }
  }

  unset(options = []) {
    if (!Array.isArray(options)) {
      options = [options];
    }
    for (let o of options) {
      if (this.isValid(o) && typeof this[o] !== "undefined") {
        delete this[o];
      }
    }
  }

  static sanitizeName(name, subst = "") {
    // removes character forbidden by operating systems
    // eslint-disable-next-line no-useless-escape
    return removeNotPrintableChars(name).replace(
      /[\\\/\>\<\|\:\&\?\*\^\$]/gi,
      subst
    );
  }

  static sanitizePath(p, subst) {
    if (typeof p === "string") {
      // removes character forbidden by operating systems
      // eslint-disable-next-line no-useless-escape
      return p
        .split("/")
        .map((e) => Entry.sanitizeName(e, subst))
        .join("/");
    } else {
      throw new Error("Path must be a string");
    }
  }
}

Entry.validOptions = [
  "type",
  "id",
  "ts",
  // 'scrambledTs',
  "name",
  "content",
  "encryptedName",
  "encryptedContent",
  "microseconds",
  "extraName",
  "nameId",
  "nameTs",
  "preserveContent",
  "parent",
  "treeIndex",
];

module.exports = Entry;
