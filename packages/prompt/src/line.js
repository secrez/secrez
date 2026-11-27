const { listen } = require("./keys");
const { paint, visibleLength } = require("./text");

function askLine(session, options) {
  const { message = "", mute = false, validate, onKey, defaultValue } = options;
  const input = session.input;
  const output = session.output;

  return new Promise((resolve, reject) => {
    let line = "";
    let cursor = 0;
    let stopped = false;
    let stop = () => {};

    const render = () => {
      const shown = mute ? "*".repeat(line.length) : line;
      paint(output, `\r\x1b[2K${message}${shown}`);
      if (output && typeof output.cursorTo === "function") {
        output.cursorTo(
          visibleLength(message) + Math.min(cursor, shown.length)
        );
      }
    };

    const close = (fn) => {
      if (stopped) return;
      stopped = true;
      stop();
      session.rl = null;
      fn();
    };

    let finishing = false;

    const finish = async (value) => {
      if (stopped || finishing) return;
      finishing = true;
      if (validate) {
        const result = await validate(value);
        if (result !== true) {
          finishing = false;
          paint(
            output,
            `\n${
              typeof result === "string" ? result : "Please enter a value."
            }\n`
          );
          render();
          return;
        }
      }
      close(() => {
        paint(output, "\n");
        resolve(value);
      });
    };

    const setLine = (next, nextCursor) => {
      line = next == null ? "" : String(next);
      cursor = nextCursor == null ? line.length : nextCursor;
      render();
    };

    const onPress = async (str, key) => {
      if (stopped) return;
      const info = key || {};
      if (info.ctrl && info.name === "c") {
        close(() => {
          paint(output, "\n");
          reject(new Error("User force closed the prompt"));
        });
        return;
      }
      if (onKey) {
        const consumed = await onKey({
          str,
          key: info,
          get line() {
            return line;
          },
          setLine,
          submit: () => finish(line),
        });
        if (consumed) return;
      }
      if (info.name === "return" || info.name === "enter") {
        let value = line;
        if (!value && defaultValue != null) value = String(defaultValue);
        await finish(value);
        return;
      }
      if (info.name === "backspace") {
        if (cursor > 0) {
          line = line.slice(0, cursor - 1) + line.slice(cursor);
          cursor -= 1;
          render();
        }
        return;
      }
      if (info.name === "delete") {
        if (cursor < line.length) {
          line = line.slice(0, cursor) + line.slice(cursor + 1);
          render();
        }
        return;
      }
      if (info.name === "left" && !info.shift) {
        cursor = Math.max(0, cursor - 1);
        render();
        return;
      }
      if (info.name === "right" && !info.shift && !info.ctrl) {
        cursor = Math.min(line.length, cursor + 1);
        render();
        return;
      }
      if (info.name === "home" || (info.ctrl && info.name === "a")) {
        cursor = 0;
        render();
        return;
      }
      if (info.name === "end" || (info.ctrl && info.name === "e")) {
        cursor = line.length;
        render();
        return;
      }
      if (str && !info.ctrl && !info.meta) {
        line = line.slice(0, cursor) + str + line.slice(cursor);
        cursor += str.length;
        render();
      }
    };

    session.rl = {
      get line() {
        return line;
      },
      set line(value) {
        setLine(value);
      },
    };

    let chain = Promise.resolve();
    stop = listen(input, (str, key) => {
      chain = chain
        .then(() => onPress(str, key))
        .catch((err) => {
          close(() => reject(err));
        });
    });
    render();
  });
}

module.exports = { askLine };
