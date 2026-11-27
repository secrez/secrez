function escapeRegExp(str) {
  return String(str).replace(/[\\.+*?^$[\](){}|'#:!=/]/g, "\\$&");
}

function complete(line, cmds) {
  let options = { filter: (str) => str };
  let list = cmds || [];
  if (list.length && typeof list[0] === "object" && list[0] !== null) {
    if (typeof list[0].filter === "function") options.filter = list[0].filter;
    list = list.slice(1);
  }

  let max = 0;
  const sanitized = escapeRegExp(line);
  const matches = [];
  for (const el of list) {
    if (new RegExp(`^${sanitized}`).test(el)) {
      matches.push(el);
      max = Math.max(max, el.length);
    }
  }

  if (matches.length > 1) {
    let common = "";
    LOOP: for (let i = line.length; i < max; i++) {
      let c = null;
      for (const item of matches) {
        if (!item[i]) break LOOP;
        if (!c) c = item[i];
        else if (c !== item[i]) break LOOP;
      }
      common += c;
    }
    if (common) return { match: options.filter(line + common) };
    return { matches };
  }
  if (matches.length === 1) return { match: options.filter(matches[0]) };
  return { match: options.filter(line) };
}

async function resolveCompletion(line, autoCompletion) {
  let cmds = autoCompletion;
  if (typeof autoCompletion === "function") {
    cmds = await autoCompletion(line);
  }
  return complete(line, cmds);
}

module.exports = { complete, resolveCompletion };
