"use strict";

/* istanbul ignore file -- interactive TUI editor; tests use prompt.editorProvider */

// In-memory terminal editor vendored from tiny-cli-editor (ISC) and prompt-skeleton.
// https://github.com/derhuerst/tiny-cli-editor

const { PassThrough } = require("stream");
const { EventEmitter } = require("events");
const esc = require("ansi-escapes");
const onKeypress = require("./onKeypress");

const insert = (s, x, c) => s.slice(0, x) + c + s.slice(x);

const EDITOR_STATUS =
  "Ctrl-d save · Ctrl-c abort · Ctrl-k del line · Ctrl-a home · Ctrl-e end · Ctrl-g reset";

// ansi-escapes `clearScreen` is RIS (\u001bc). Terminal.app answers that
// reset with a blue background and a foreground that does not contrast, so
// the file text is drawn and then invisible. Erase the viewport, home the
// cursor, and restore the default colors before painting the buffer.
function clearViewport() {
  return "\u001b[0m" + esc.eraseScreen + esc.cursorTo(0, 0);
}

function terminalRows() {
  return process.stdout.rows || 24;
}

function terminalColumns() {
  return Math.max(2, process.stdout.columns || 80);
}

// The footer is drawn on its own rows, one column short of the edge.
// A character in the last column wraps, and a wrap on the last row scrolls
// the viewport, which moves the text above the footer.
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
    this.lines = this.initialLines;
    this.cursorX = 0;
    this.cursorY = 0;
    this.update();
    this.render();
  },

  abort(c) {
    this.done = true;
    this.aborted = !(c.ctrl && c.name === "d");
    this.out.write(clearViewport());
    this.close();
  },

  submit() {
    const line = this.lines[this.cursorY];
    this.lines.splice(
      this.cursorY,
      1,
      line.slice(0, this.cursorX),
      line.slice(this.cursorX)
    );
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
      return;
    }
    this.cursorX--;
    this.update();
    this.render();
  },

  right() {
    const line = this.lines[this.cursorY];
    if (this.cursorX === line.length) {
      if (this.cursorY === this.lines.length - 1) return;
      this.cursorY++;
      this.cursorX = 0;
      return;
    }
    this.cursorX++;
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
    this.out.write(esc.beep);
  },

  render() {
    const rows = terminalRows();
    const columns = terminalColumns();
    const chunks = statusChunks(EDITOR_STATUS, columns);
    const statusTop = Math.max(0, rows - chunks.length);
    const { lines, cursorX, cursorY } = this;
    let out = clearViewport() + lines.join("\n");
    chunks.forEach((chunk, i) => {
      out +=
        esc.cursorTo(0, statusTop + i) +
        esc.eraseLine +
        "\x1b[2m" +
        chunk +
        "\x1b[0m";
    });
    const cursorRow = Math.min(cursorY, Math.max(0, statusTop - 1));
    const cursorCol = Math.min(cursorX, columns - 1);
    out += esc.cursorTo(cursorCol, cursorRow);
    this.out.write(out);
  },
};

function createEditor(text) {
  if (typeof text !== "string") {
    throw new Error("Text must be string.");
  }

  const emitter = new EventEmitter();
  const p = Object.assign(Object.create(Editor), {
    lines: [],
    initialLines: [],
    cursorX: 0,
    cursorY: 0,
    done: false,
    aborted: false,
    value: "",
    out: new PassThrough(),
  });

  const lb = /\r?\n/;
  p.initialLines = text.split(lb);
  p.lines = text.split(lb);
  p.out.pipe(process.stdout);

  p.emit = () => {
    emitter.emit("change", {
      value: p.value,
      aborted: !!p.aborted,
    });
  };

  if (typeof p._ !== "function") {
    p._ = () => p.bell();
  }

  let offKeypress;
  const pause = () => {
    if (!offKeypress) return;
    offKeypress();
    offKeypress = null;
  };

  const resume = () => {
    if (offKeypress) return;
    offKeypress = onKeypress(process.stdin, (key) => {
      const action = keyAction(key);
      if (action === false) {
        p._(key.raw);
      } else if (action in p) {
        p[action](key);
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
    p.out.unpipe(process.stdout);
    process.stdout.write(esc.cursorShow);
    if (p.aborted) {
      emitter.emit("abort", p.value);
    } else {
      emitter.emit("submit", p.value);
    }
    emitter.emit("close");
  };

  resume();
  p.update();
  p.render();

  emitter.pause = pause;
  emitter.resume = resume;
  emitter.setText = (nextText) => {
    p.lines = nextText.split(lb);
    if (!p.lines[p.cursorY]) {
      p.cursorY = p.lines.length - 1;
    }
    p.cursorX = Math.min(p.cursorX, p.lines[p.cursorY].length);
    p.update();
    p.render();
  };

  return emitter;
}

function editInMemory(text) {
  return new Promise((resolve) => {
    const editor = createEditor(text);
    const finish = (value) => {
      editor.pause();
      resolve(value);
    };
    editor.on("submit", finish);
    editor.on("abort", () => finish(undefined));
  });
}

module.exports = {
  createEditor,
  editInMemory,
};
