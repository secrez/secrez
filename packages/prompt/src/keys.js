const readline = require("readline");

function listen(input, onKey) {
  const cleanups = [];
  if (input && typeof input.setRawMode === "function") {
    readline.emitKeypressEvents(input);
    if (typeof input.isRaw === "boolean") {
      const wasRaw = input.isRaw;
      try {
        input.setRawMode(true);
      } catch (e) {
        // stdin may already be closing
      }
      cleanups.push(() => {
        try {
          input.setRawMode(wasRaw);
        } catch (e) {
          // ignore
        }
      });
    }
    if (typeof input.resume === "function") input.resume();
  }
  if (input && typeof input.on === "function") {
    input.on("keypress", onKey);
    cleanups.push(() => {
      if (typeof input.off === "function") input.off("keypress", onKey);
      else if (typeof input.removeListener === "function") {
        input.removeListener("keypress", onKey);
      }
    });
  }
  return function stop() {
    for (const fn of cleanups) fn();
  };
}

module.exports = { listen };
