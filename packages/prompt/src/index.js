const chalk = require("chalk");
const { askLine } = require("./line");
const { listen } = require("./keys");
const { paint, formatList } = require("./text");
const { resolveCompletion } = require("./complete");
const { editInMemory, readEditorText, writeEditorText } = require("./editor");

const DEFAULT_CLEAR =
  "\u001b[2J\u001b[0;0HScreen cleared. Press any key to reactivate the terminal";

class Prompt {
  constructor(options = {}) {
    this.clearScreenEnabled = options.clearScreen === true;
    this.clearScreenTimeout = options.clearScreenTimeout || 180;
    this.onClear = options.onClear;
    this.input = options.input || process.stdin;
    this.output = options.output || process.stdout;
    this.timeoutId = null;
    this.clearHolds = 0;
    this.histories = {};
    this.historyIndexes = {};
    this.config = { history: { limit: 100 } };
    this.rl = null;
    this.editor = options.editor;
  }

  setConfig(config) {
    if (config && typeof config === "object") {
      this.config = Object.assign({ history: { limit: 100 } }, config);
      if (!this.config.history) this.config.history = { limit: 100 };
    }
  }

  initHistory(context) {
    if (!this.histories[context]) {
      this.histories[context] = [];
      this.historyIndexes[context] = 0;
    }
  }

  addToHistory(context, value) {
    this.initHistory(context);
    const list = this.histories[context];
    const blacklist = (this.config.history && this.config.history.blacklist) || [];
    if (list[list.length - 1] === value || blacklist.includes(value)) return;
    list.push(value);
    const limit = this.config.history && this.config.history.limit;
    if (limit && list.length > limit) {
      this.histories[context] = list.slice(list.length - limit);
    }
    this.historyIndexes[context] = this.histories[context].length;
  }

  getHistories(useLimit) {
    if (!useLimit) return { histories: this.histories };
    const limit = this.config.history && this.config.history.limit;
    const histories = {};
    for (const key of Object.keys(this.histories)) {
      const list = this.histories[key];
      histories[key] =
        limit && list.length > limit ? list.slice(list.length - limit) : list.slice();
    }
    return { histories };
  }

  setHistory(previous) {
    try {
      const histories = (previous && previous.histories) || {};
      this.histories = histories;
      this.historyIndexes = {};
      for (const key of Object.keys(histories)) {
        this.historyIndexes[key] = histories[key].length;
      }
    } catch (e) {
      console.error("prompt ERROR: Invalid history.");
    }
  }

  getRl() {
    return this.rl;
  }

  paintClear() {
    if (typeof this.onClear === "function") {
      this.onClear();
      return;
    }
    paint(this.output, DEFAULT_CLEAR);
  }

  armClear() {
    if (!this.clearScreenEnabled) return;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.clearHolds > 0) return;
    if (!this.output || !this.output.isTTY) return;
    const seconds = this.clearScreenTimeout || 180;
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null;
      this.paintClear();
    }, seconds * 1000);
    if (typeof this.timeoutId.unref === "function") this.timeoutId.unref();
  }

  holdClear() {
    if (!this.clearScreenEnabled) return;
    this.clearHolds += 1;
    if (this.clearHolds === 1 && this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  releaseClear() {
    if (!this.clearScreenEnabled) return;
    this.clearHolds = Math.max(0, this.clearHolds - 1);
    if (this.clearHolds === 0) this.armClear();
  }

  async ask(questions, options = {}) {
    const list = Array.isArray(questions) ? questions : [questions];
    const skipClear = options.skipClear !== false;
    if (this.clearScreenEnabled) {
      if (skipClear) this.holdClear();
      else this.armClear();
    }
    const answers = {};
    try {
      for (const question of list) {
        answers[question.name] = await this.askOne(question || {});
      }
      return answers;
    } finally {
      if (this.clearScreenEnabled && skipClear) this.releaseClear();
    }
  }

  async useEditor(options = {}) {
    const skipClear = options.skipClear !== false;
    if (this.clearScreenEnabled) {
      if (skipClear) this.holdClear();
      else this.armClear();
    }
    try {
      const run = options.editor || this.editor;
      if (typeof run === "function") return await run(options);
      const hooks = {
        input: options.input || this.input,
        output: options.output || this.output,
        onReady: options.onEditorReady,
      };
      if (options.path == null) {
        return await editInMemory(options.content || "", hooks);
      }
      const content = await readEditorText(options);
      const text = await editInMemory(content, hooks);
      if (text !== undefined) await writeEditorText(options.path, text);
      return text;
    } finally {
      if (this.clearScreenEnabled && skipClear) this.releaseClear();
    }
  }

  askOne(question) {
    const type = question.type || "input";
    if (type === "confirm") return this.askConfirm(question);
    if (type === "password") return this.askText(question, true);
    if (type === "list") return this.askList(question);
    if (type === "command") return this.askCommand(question);
    if (type === "input") return this.askText(question, false);
    throw new Error(`Unknown prompt type: ${type}`);
  }

  messageOf(question, extra) {
    const prefix = question.prefix ? `${question.prefix} ` : "";
    return `${prefix}${question.message || ""}${extra || ""}`;
  }

  askText(question, mute) {
    return askLine(this, {
      message: this.messageOf(question, " "),
      mute,
      defaultValue: question.default,
      validate: question.validate,
    });
  }

  askConfirm(question) {
    const yesDefault = question.default !== false && question.default !== undefined
      ? question.default === true
      : false;
    const hint = yesDefault ? " (Y/n) " : " (y/N) ";
    return askLine(this, {
      message: this.messageOf(question, hint),
      validate: async (value) => {
        const text = String(value || "").trim().toLowerCase();
        if (!text) return true;
        if (text === "y" || text === "yes" || text === "n" || text === "no") {
          return true;
        }
        return "Please answer y or n.";
      },
    }).then((value) => {
      const text = String(value || "").trim().toLowerCase();
      if (!text) return yesDefault;
      return text === "y" || text === "yes";
    });
  }

  askList(question) {
    const choices = (question.choices || []).map((choice) => {
      if (typeof choice === "string") return { name: choice, value: choice };
      return {
        name: choice.name || String(choice.value),
        value: choice.value === undefined ? choice.name : choice.value,
      };
    });
    const output = this.output;
    let index = Math.max(0, choices.findIndex((choice) => choice.value === question.default));
    if (index < 0) index = 0;
    let drawn = 0;

    const draw = () => {
      const lines = [question.message || ""];
      choices.forEach((choice, i) => {
        const mark = i === index ? chalk.cyan("> ") : "  ";
        lines.push(mark + choice.name);
      });
      if (drawn) paint(output, `\x1b[${drawn}A`);
      paint(output, `${lines.join("\n")}\n`);
      drawn = lines.length;
    };

    draw();
    return new Promise((resolve, reject) => {
      let stopped = false;
      const stop = listen(this.input, (str, key) => {
        if (stopped) return;
        const info = key || {};
        if (info.ctrl && info.name === "c") {
          stopped = true;
          stop();
          paint(output, "\n");
          reject(new Error("User force closed the prompt"));
          return;
        }
        if (info.name === "up") {
          index = (index - 1 + choices.length) % Math.max(choices.length, 1);
          draw();
          return;
        }
        if (info.name === "down") {
          index = (index + 1) % Math.max(choices.length, 1);
          draw();
          return;
        }
        if (info.name === "return" || info.name === "enter") {
          stopped = true;
          stop();
          const selected = choices[index];
          paint(output, `${selected ? selected.name : ""}\n`);
          resolve(selected ? selected.value : undefined);
        }
      });
      this.rl = null;
    });
  }

  async askCommand(question) {
    const context = question.context || "_default";
    this.initHistory(context);
    const message = this.messageOf(question, " ");
    const value = await askLine(this, {
      message,
      validate: question.validate,
      onKey: async (state) => {
        if (typeof question.onBeforeKeyPress === "function") {
          question.onBeforeKeyPress(state.key);
        }
        const key = state.key;
        const rewrite = (next) => {
          let value = next == null ? "" : String(next);
          if (typeof question.onBeforeRewrite === "function") {
            const updated = question.onBeforeRewrite(value);
            if (typeof updated === "string") value = updated;
          }
          state.setLine(value);
        };
        if (key.name === "up") {
          if (this.historyIndexes[context] > 0) {
            this.historyIndexes[context] -= 1;
            rewrite(this.histories[context][this.historyIndexes[context]]);
          }
          return true;
        }
        if (key.name === "down") {
          const next = this.histories[context][this.historyIndexes[context] + 1];
          if (next) {
            this.historyIndexes[context] += 1;
            rewrite(next);
          } else {
            rewrite("");
          }
          return true;
        }
        if (key.name === "tab") {
          await this.completeCommand(question, state, rewrite);
          return true;
        }
        if (key.name === "right" && key.shift) {
          this.showOrJumpHistory(state, context, key.ctrl, rewrite);
          return true;
        }
        if (key.name === "end" && key.ctrl) {
          if (this.config && typeof this.config.onCtrlEnd === "function") {
            rewrite(this.config.onCtrlEnd(state.line));
          } else {
            rewrite("");
          }
          return true;
        }
        return false;
      },
    });
    this.addToHistory(context, value);
    if (typeof question.onClose === "function") question.onClose();
    return value;
  }

  async completeCommand(question, state, rewrite) {
    const line = String(state.line || "").replace(/^ +/, "").replace(/\t/g, "").replace(/ +/g, " ");
    try {
      const found = await resolveCompletion(line, question.autoCompletion);
      if (found.match) {
        rewrite(found.match);
        return;
      }
      if (found.matches) {
        const shown = question.short
          ? typeof question.short === "function"
            ? question.short(line, found.matches.slice())
            : found.matches
          : found.matches;
        paint(this.output, "\n");
        paint(
          this.output,
          (question.autocompletePrompt ||
            chalk.red(">> ") + chalk.grey("Available commands:")) + "\n"
        );
        paint(
          this.output,
          formatList(shown, this.output, question.maxSize, question.ellipsize, question.ellipsis) +
            "\n"
        );
        rewrite(line);
      }
    } catch (err) {
      console.error(err);
      rewrite(line);
    }
  }

  showOrJumpHistory(state, context, jump, rewrite) {
    const history = this.histories[context] || [];
    if (jump) {
      const i = parseInt(state.line, 10);
      rewrite(!isNaN(i) && history[i] ? history[i] : "");
      return;
    }
    const limit = (this.config.history && this.config.history.limit) || history.length || 1;
    const width = String(limit).length;
    paint(this.output, `\n${chalk.bold("History")}\n`);
    history.forEach((entry, i) => {
      const index = String(i).padStart(width, " ");
      paint(this.output, `${chalk.grey(index)}  ${entry}\n`);
    });
    rewrite("");
  }
}

module.exports = { Prompt };
