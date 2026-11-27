const crypto = require("crypto");
const _ = require("lodash");
const fs = require("fs-extra");
const isBinaryFile = require("isbinaryfile").isBinaryFile;
const YAML = require("yaml");
const path = require("path");
const { spawn } = require("child_process");
const parse = require("csv-parse/lib/sync");
const Case = require("case");
const util = require("util");
const Base58 = require("base58");
const player = require("play-sound")();

const UglyDate = require("./UglyDate");

function walkYaml(node, visit) {
  if (!node) return;
  if (node.items) {
    node.items.forEach((item) => walkYaml(item, visit));
    return;
  }
  if (node.key) {
    walkYaml(node.key, visit);
    walkYaml(node.value, visit);
    return;
  }
  visit(node);
}

function plainNumberSource(str, node) {
  if (
    !node ||
    node.type !== "PLAIN" ||
    typeof node.value !== "number" ||
    !node.range
  ) {
    return null;
  }
  const raw = str.slice(node.range[0], node.range[1]);
  if (raw === String(node.value)) return null;
  return { start: node.range[0], end: node.range[1], raw };
}

function yamlDocument(str) {
  const doc = YAML.parseDocument(str);
  if (doc.errors && doc.errors.length) {
    throw new Error("Cannot parse a malformed yaml");
  }
  return doc;
}

const utils = {
  yamlParse(str) {
    // workaround to avoid parsing ETH addresses and private keys
    if (/: 0x[a-fA-F0-9]+(\n|$)/.test(str)) {
      str = str.replace(/: (0x[a-fA-F0-9]+)(\n|$)/g, ": '$1'$2");
    }
    try {
      const doc = yamlDocument(str);
      // 0002 is not the number 2. Keep the digits the author wrote.
      walkYaml(doc.contents, (node) => {
        const odd = plainNumberSource(str, node);
        if (odd) node.value = odd.raw;
      });
      return doc.toJSON();
    } catch (e) {
      throw new Error("Cannot parse a malformed yaml");
    }
  },

  // Quote plain numbers whose text is not the canonical number, so the next
  // parse still sees a string. 234 stays 234. 0002 becomes "0002".
  yamlQuoteNumbers(str) {
    const text = String(str);
    let doc;
    try {
      doc = yamlDocument(text);
    } catch (e) {
      return text;
    }
    const replacements = [];
    walkYaml(doc.contents, (node) => {
      const odd = plainNumberSource(text, node);
      if (odd) replacements.push(odd);
    });
    let out = text;
    replacements.sort((a, b) => b.start - a.start);
    for (const item of replacements) {
      out =
        out.slice(0, item.start) +
        JSON.stringify(item.raw) +
        out.slice(item.end);
    }
    return out;
  },

  yamlStringify(obj) {
    return YAML.stringify(obj);
  },

  isYaml(filepath) {
    try {
      let ext = path.extname(filepath);
      return /^\.y(a|)ml$/i.test(ext);
    } catch (e) {
      return false;
    }
  },

  fromCsvToJson(csv, delimiter = ",", skipEmpty = true) {
    csv = csv.split("\n");
    let firstLine = csv[0];
    try {
      firstLine = parse(firstLine)[0].map((e) => Case.snake(_.trim(e)));
    } catch (e) {
      throw new Error("The CSV is malformed");
    }
    for (let e of firstLine) {
      if (!/^[a-z]{1}[a-z0-9_]*$/.test(e)) {
        throw new Error("The header of the CSV looks wrong");
      }
    }
    csv[0] = firstLine.join(",");
    csv = csv.join("\n");
    let json = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      delimiter,
      skip_lines_with_error: true,
      trim: true,
    });
    if (skipEmpty) {
      json = json.map((e) => {
        let elem = {};
        for (let key in e) {
          if (e[key]) {
            elem[key] = e[key];
          }
        }
        return elem;
      });
    }
    return json;
  },

  fromSimpleYamlToJson(yml) {
    yml = yml.split("\n").map((e) => e.split(": "));
    let json = {};
    for (let y of yml) {
      json[y[0]] = y[1];
    }
    return json;
  },

  getCols() {
    return process.env.NODE_ENV === "test" ? 80 : process.stdout.columns || 80;
  },

  TRUE: () => true,

  sleep: async (millis) => {
    return new Promise((resolve) => setTimeout(resolve, millis));
  },

  async execAsync(cmd, cwd, params) {
    return new Promise((resolve) => {
      let json = {};
      // Use spawn instead of execSync to avoid deprecation warnings
      // spawn with shell:false (default) safely handles arguments without concatenation
      const child = spawn(cmd, params, { cwd });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString("utf8");
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString("utf8");
      });

      child.on("exit", (code) => {
        if (code === 0) {
          json.message = _.trim(stdout);
          json.code = 0;
        } else {
          json.error = _.trim(stderr || stdout);
          json.code = code;
        }
        resolve(json);
      });

      child.on("error", (error) => {
        json.error = _.trim(error.message);
        json.code = 1;
        resolve(json);
      });
    });
  },

  capitalize(str) {
    if (typeof str === "string" && str.length > 0) {
      return str[0].toUpperCase() + str.substring(1).toLowerCase();
    } else {
      throw new Error("Not a string");
    }
  },

  sortKeys(obj) {
    return _(obj).toPairs().sortBy(0).fromPairs().value();
  },

  isIp(ip) {
    return /^\b(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\b$/.test(
      "" + ip
    );
  },

  intToBase58(v, size) {
    try {
      if (typeof v === "number") {
        let ret = Base58.int_to_base58(v);
        if (size) {
          while (ret.length < size) {
            ret = "0" + ret;
          }
        }
        return ret;
      } else throw new Error();
    } catch (e) {
      throw new Error("Invalid format");
    }
  },

  base58ToInt(v) {
    try {
      v = v.replace(/^0+/, "");
      return Base58.base58_to_int(v);
    } catch (e) {
      throw new Error("Invalid format");
    }
  },

  toExponentialString(num) {
    try {
      num = `${num}`;
      if (parseInt(num).toString() !== num) {
        throw new Error();
      }
      let str = num.replace(/0+$/, "");
      return str + "e" + (num.length - str.length);
    } catch (e) {
      throw new Error("Invalid format");
    }
  },

  fromExponentialString(str) {
    try {
      str = `${str}`.split("e");
      if (str.length === 2) {
        return parseInt(str[0] + "0".repeat(parseInt(str[1])));
      } else {
        throw new Error();
      }
    } catch (e) {
      throw new Error("Invalid format");
    }
  },

  addTo(arr, index, data) {
    if (
      Array.isArray(arr) &&
      typeof index === "number" &&
      index >= 0 &&
      parseInt(index) === index &&
      data
    ) {
      if (!arr[index]) arr[index] = "";
      arr[index] += data;
    } else {
      throw new Error("Invalid parameters");
    }
  },

  getKeyValue(obj, key) {
    return {
      key: key,
      value: obj[key],
    };
  },

  secureCompare(a, b) {
    if (a == null || b == null) {
      return false;
    }
    const bufA = Buffer.isBuffer(a) ? a : Buffer.from(a);
    const bufB = Buffer.isBuffer(b) ? b : Buffer.from(b);
    if (bufA.length !== bufB.length) {
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  },

  async isBinary(fileFullPath) {
    if (/\/$/.test(fileFullPath)) {
      return false;
    }
    if (await fs.pathExists(fileFullPath)) {
      const stat = await fs.lstat(fileFullPath);
      if (stat.isDirectory()) {
        return false;
      }
      const data = await fs.readFile(fileFullPath);
      return await isBinaryFile(data, stat.size);
    } else {
      return false;
    }
  },

  removeNotPrintableChars(str) {
    // eslint-disable-next-line no-control-regex
    return str.replace(/[\x00\x08\x0B\x0C\x0E-\x1F]+/g, "");
  },

  Debug(prefix) {
    return (...content) => {
      if (process.env.AS_DEV || /dev/i.test(process.env.NODE_ENV)) {
        console.debug(prefix, ">>", util.format(...content));
      }
    };
  },

  async playMp3(mp3AbsolutePath) {
    return new Promise((resolve, reject) => {
      player.play(mp3AbsolutePath, function (err) {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  },

  decolorize(str, noTrim) {
    if (!noTrim) {
      str = _.trim(str);
    }
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1b\[[0-9;]*m/g, "");
  },
};

module.exports = utils;
module.exports.UglyDate = UglyDate;
