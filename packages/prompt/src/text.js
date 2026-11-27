function visibleLength(str) {
  return String(str == null ? "" : str).replace(/\x1b\[[0-9;]*m/g, "").length;
}

function paint(output, text) {
  if (output && typeof output.write === "function") output.write(text);
}

function columnsOf(output) {
  return (output && output.columns) || process.stdout.columns || 80;
}

function ellipsize(str, len, ellipsis) {
  const mark = ellipsis || "…";
  if (str.length <= len) return str;
  const markLen = visibleLength(mark);
  if (len <= markLen) return mark;
  return str.substring(0, len - markLen) + mark;
}

function pad(str, len, useEllipsis, ellipsis) {
  let text = str;
  if (useEllipsis && visibleLength(text) > len - 1) {
    text = ellipsize(text, len - 1, ellipsis);
  }
  const gap = len - visibleLength(text);
  return text + (gap > 0 ? " ".repeat(gap) : "");
}

function formatList(elems, output, maxSize, useEllipsis, ellipsis) {
  const cols = columnsOf(output);
  let width = maxSize || 32;
  const ratio = Math.max(1, Math.floor((cols - 1) / width));
  const remainder = (cols - 1) % width;
  width += Math.floor(remainder / ratio);
  let cell = 0;
  for (const elem of elems) {
    cell = Math.max(cell, visibleLength(elem) + 4);
  }
  if (useEllipsis && cell > width) cell = width;
  const columns = Math.max(1, Math.floor(cols / cell));
  let str = "";
  let c = 1;
  for (const elem of elems) {
    str += pad(elem, cell, useEllipsis, ellipsis);
    if (c === columns) {
      str += "\n";
      c = 1;
    } else {
      c += 1;
    }
  }
  return str;
}

function formatColumns(elems, maxSize, useEllipsis, ellipsis) {
  return formatList(elems, process.stdout, maxSize, useEllipsis, ellipsis);
}

module.exports = {
  visibleLength,
  paint,
  columnsOf,
  ellipsize,
  formatList,
  formatColumns,
};
