"use strict";

// In-memory terminal editor vendored from tiny-cli-editor (ISC) and prompt-skeleton.
// https://github.com/derhuerst/tiny-cli-editor

const fs = require("fs");
const { listen } = require("./keys");

const insert = (s, x, c) => s.slice(0, x) + c + s.slice(x);

const EDITOR_STATUS =
  "Ctrl-d save · Ctrl-c abort · Ctrl-k del line · Ctrl-a home · Ctrl-e end · Ctrl-g reset";

// ansi-escapes `clearScreen` is RIS (\u001bc). Terminal.app answers that
// reset with a blue background and a foreground that does not contrast, so
// the file text is drawn and then invisible. Erase the viewport, home the
// cursor, and restore the default colors before painting the buffer.
function clearViewport() {
  return "\u001b[0m\u001b[2J\u001b[1;1H";
}

function cursorTo(x, y) {
  return `\u001b[${y + 1};${x + 1}H`;
}

function terminalRows(output) {
  return (output && output.rows) || process.stdout.rows || 24;
}

function terminalColumns(output) {
  return Math.max(2, (output && output.columns) || process.stdout.columns || 80);
}

function statusChunks(status, columns) {
  const width = Math.max(1, columns - 1);
  const chunks = [];
  for (let i = 0; i < status.length; i += width) {
    chunks.push(status.slice(i, i + width));
  }
  return chunks.length ? chunks : [""];
}

function keyAction(key) {
  if (key.ctrl) {
    if (key.name === "a") return "first";
    if (key.name === "c") return "abort";
    if (key.name === "d") return "abort";
    if (key.name === "e") return "last";
    if (key.name === "g") return "reset";
    if (key.name === "k") return "deleteLine";
  }
  if (key.name === "return" || key.name === "enter") return "submit";
  if (key.name === "backspace") return "delete";
  if (key.name === "abort" || key.name === "escape") return "abort";
  if (key.name === "up") return "up";
  if (key.name === "down") return "down";
  if (key.name === "right") return "right";
  if (key.name === "left") return "left";
  return false;
}

const Editor = {
  update() {
    this.value = this.lines.join("\n");
    this.emit();
  },

  reset() {
    this.lines = this.initialLines.slice();
    this.cursorX = 0;
    this.cursorY = 0;
    this.update();
    this.render();
  },

  abort(c) {
    this.done = true;
    this.aborted = !(c && c.ctrl && c.name === "d");
    this.write(clearViewport());
    this.close();
  },

  submit() {
    const line = this.lines[this.cursorY];
    this.lines.splice(this.cursorY, 1, line.slice(0, this.cursorX), line.slice(this.cursorX));
    this.cursorY++;
    this.cursorX = 0;
    this.update();
    this.render();
  },

  up() {
    if (this.cursorY === 0) return;
    this.cursorY--;
    this.cursorX = Math.min(this.cursorX, this.lines[this.cursorY].length);
    this.update();
    this.render();
  },

  down() {
    if (this.cursorY === this.lines.length - 1) return;
    this.cursorY++;
    this.cursorX = Math.min(this.cursorX, this.lines[this.cursorY].length);
    this.update();
    this.render();
  },

  left() {
    if (this.cursorX === 0) {
      if (this.cursorY === 0) return;
      this.cursorY--;
      this.cursorX = this.lines[this.cursorY].length;
    } else {
      this.cursorX--;
    }
    this.update();
    this.render();
  },

  right() {
    const line = this.lines[this.cursorY];
    if (this.cursorX === line.length) {
      if (this.cursorY === this.lines.length - 1) return;
      this.cursorY++;
      this.cursorX = 0;
    } else {
      this.cursorX++;
    }
    this.update();
    this.render();
  },

  first() {
    this.cursorX = 0;
    this.update();
    this.render();
  },

  last() {
    this.cursorX = this.lines[this.cursorY].length;
    this.update();
    this.render();
  },

  _(c) {
    const { lines, cursorX, cursorY } = this;
    lines[cursorY] = insert(lines[cursorY], cursorX, c);
    this.cursorX++;
    this.update();
    this.render();
  },

  delete() {
    const { lines, cursorX, cursorY } = this;
    const line = lines[cursorY];

    if (cursorX > 0) {
      lines[cursorY] = line.slice(0, cursorX - 1) + line.slice(cursorX);
      this.cursorX--;
    } else if (cursorY > 0) {
      const xFromAbove = this.lines[cursorY - 1].length;
      lines.splice(cursorY - 1, 2, lines[cursorY - 1] + lines[cursorY]);
      this.cursorY--;
      this.cursorX = xFromAbove;
    } else {
      return;
    }

    this.update();
    this.render();
  },

  deleteLine() {
    const { lines, cursorY } = this;
    if (lines.length === 1) {
      lines[0] = "";
      this.cursorX = 0;
      this.cursorY = 0;
    } else {
      lines.splice(cursorY, 1);
      if (cursorY >= lines.length) {
        this.cursorY = lines.length - 1;
      }
      this.cursorX = 0;
    }
    this.update();
    this.render();
  },

  bell() {
    this.write("\u0007");
  },

  render() {
    const rows = terminalRows(this.output);
    const columns = terminalColumns(this.output);
    const chunks = statusChunks(EDITOR_STATUS, columns);
    const statusTop = Math.max(0, rows - chunks.length);
    const { lines, cursorX, cursorY } = this;
    let out = clearViewport() + lines.join("\n");
    chunks.forEach((chunk, i) => {
      out += cursorTo(0, statusTop + i) + "\u001b[2K\u001b[2m" + chunk + "\u001b[0m";
    });
    const cursorRow = Math.min(cursorY, Math.max(0, statusTop - 1));
    const cursorCol = Math.min(cursorX, columns - 1);
    out += cursorTo(cursorCol, cursorRow);
    this.write(out);
  },
};

function createEditor(text, hooks = {}) {
  if (typeof text !== "string") {
    throw new Error("Text must be string.");
  }

  const output = hooks.output;
  const input = hooks.input;
  const p = Object.assign(Object.create(Editor), {
    lines: [],
    initialLines: [],
    cursorX: 0,
    cursorY: 0,
    done: false,
    aborted: false,
    value: "",
    output,
    write(chunk) {
      if (output && typeof output.write === "function") output.write(chunk);
    },
  });

  const lb = /\r?\n/;
  p.initialLines = text.split(lb);
  p.lines = text.split(lb);

  const listeners = [];
  const notify = (name, value) => {
    for (const listener of listeners) listener(name, value);
  };

  p.emit = () => {
    notify("change", { value: p.value, aborted: !!p.aborted });
  };

  let stopKeys = () => {};
  let listening = false;
  const pause = () => {
    if (!listening) return;
    listening = false;
    stopKeys();
  };

  const resume = () => {
    if (listening) return;
    listening = true;
    stopKeys = listen(input, (str, key) => {
      const info = key || {};
      const action = keyAction(info);
      if (action && typeof p[action] === "function") {
        p[action](info);
      } else if (str && !info.ctrl && !info.meta) {
        p._(str);
      } else {
        p.bell();
      }
    });
  };

  let isClosed = false;
  p.close = () => {
    if (isClosed) return;
    isClosed = true;
    pause();
    p.write("\u001b[?25h");
    if (p.aborted) notify("abort", p.value);
    else notify("submit", p.value);
    notify("close");
  };

  const editor = {
    on(name, fn) {
      const listener = (event, value) => {
        if (event === name) fn(value);
      };
      listeners.push(listener);
    },
    abort() {
      if (isClosed) return;
      p.abort({});
    },
    pause,
    resume,
    setText(nextText) {
      p.lines = String(nextText).split(lb);
      if (!p.lines[p.cursorY]) p.cursorY = p.lines.length - 1;
      p.cursorX = Math.min(p.cursorX, p.lines[p.cursorY].length);
      p.update();
      p.render();
    },
  };

  resume();
  p.update();
  p.render();
  return editor;
}

async function readEditorText(options = {}) {
  const hasPath = options.path != null;
  const hasContent = Object.prototype.hasOwnProperty.call(options, "content");
  if (hasPath && hasContent) {
    throw new Error("useEditor takes either content or path.");
  }
  if (!hasPath) return options.content || "";
  if (typeof options.path !== "string" || options.path === "") {
    throw new Error("useEditor path must be a file path.");
  }
  try {
    return await fs.promises.readFile(options.path, "utf8");
  } catch (err) {
    if (err && err.code === "ENOENT") return "";
    throw err;
  }
}

function writeEditorText(filePath, text) {
  return fs.promises.writeFile(filePath, text);
}

function editInMemory(text, hooks = {}) {
  return new Promise((resolve, reject) => {
    let editor;
    try {
      editor = createEditor(text, hooks);
    } catch (err) {
      reject(err);
      return;
    }
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      editor.pause();
      resolve(value);
    };
    editor.on("submit", finish);
    editor.on("abort", () => finish(undefined));
    if (typeof hooks.onReady === "function") {
      hooks.onReady({
        abort() {
          editor.abort();
        },
        setText(next) {
          editor.setText(next);
        },
      });
    }
  });
}

module.exports = { editInMemory, createEditor, readEditorText, writeEditorText };
