# @secrez/prompt

Secrez is the secrets manager for the cryptocurrencies era.

`Prompt` is a small terminal prompt based on [Inquirer 7](https://github.com/SBoudrias/Inquirer.js/tree/v7.3.3). Thank you to [Simon Boudrias](https://github.com/SBoudrias) and the Inquirer contributors: the question flow, confirm and list, and line editing follow that release.

Secrez needs only a subset of those functions: `input`, `password`, `confirm`, `list`, and a command line. The current [Inquirer](https://github.com/SBoudrias/Inquirer.js) is version 14, and that line keeps growing an API that Secrez does not need, so this package keeps the Inquirer 7 subset and maintains it for Secrez.

## Usage

```js
const { Prompt } = require("@secrez/prompt");

const prompt = new Prompt({
  input: process.stdin,
  output: process.stdout,
  clearScreen: false,
});

const answers = await prompt.ask([
  { type: "input", name: "name", message: "Name", default: "ada" },
  { type: "password", name: "secret", message: "Password" },
  { type: "confirm", name: "ok", message: "Continue?", default: true },
  {
    type: "list",
    name: "field",
    message: "Field",
    choices: ["email", "password"],
    default: "email",
  },
]);
```

`ask(questions, options)` takes one question or a list. Each question has `name` and `message`. `type` defaults to `input`. The result maps each `name` to its answer. A confirm answer is a boolean. Ctrl-c rejects with `User force closed the prompt`.

`options.skipClear` defaults to `true`.

### input

Reads one line. Enter on an empty line returns `default`, or `""` when `default` is omitted. `validate(value)` returns `true` to accept the line, or a string to print before asking again. Any other result prints `Please enter a value.`

Left, right, Home, End, Ctrl-a, Ctrl-e, Backspace, and Delete edit the line.

### password

Same as `input`, but every character is drawn as `*`. The answer is the text that was typed.

### confirm

Accepts `y`, `yes`, `n`, and `no`, in either case. The hint is `(Y/n)` when `default` is `true`, and `(y/N)` otherwise. Enter on an empty line uses `default`. An omitted `default` means `false`. Anything else prints `Please answer y or n.` and asks again.

### list

Draws `choices` and moves with the up and down arrows, wrapping at the ends. Enter selects the current row and returns its value. A choice is a string, or an object `{ name, value }`. A missing `name` is `String(value)`. A missing `value` is `name`. `default` selects that value. An unknown `default` starts on the first row. An empty list resolves to `undefined`.

### command

A shell-style line. `context` names its history and defaults to `_default`.

- Up and down walk that history. Down past the last entry clears the line.
- Tab completes `autoCompletion`, an array of strings or `async (line) => string[]`. A shared prefix is written into the line. Several matches are listed. The first array item may be `{ filter(value) }`, which rewrites a completed line.
- `short(line, matches)` can replace the list that is printed. `autocompletePrompt` replaces the `Available commands` heading. `ellipsize`, `ellipsis`, and `maxSize` shape that list.
- Shift+Right prints the history. Ctrl+Shift+Right jumps to the numeric index currently on the line.
- Ctrl+End calls `onCtrlEnd(line)` from `setConfig`, or clears the line when that function is absent.
- `onBeforeKeyPress(key)` runs before the key is handled. `onBeforeRewrite(line)` can change a line written by history, completion, or Ctrl+End. It must return a string. `onClose` runs after a successful answer.
- `prefix` is printed before `message`. `validate` works as it does for `input`.

### Clear screen

`clearScreen` defaults to `false`. While it is false, the clear timer is never started. Set it to `true` to clear a TTY after `clearScreenTimeout` seconds of idle time. The default timeout is 180. `ask` suspends the timer while a question is open. Pass `{ skipClear: false }` to leave it running, which is the idle command prompt.

`onClear` replaces the default `Screen cleared...` text. `holdClear` and `releaseClear` are counted, so overlapping questions do not restart the timer early. `armClear` starts the timer when nothing is holding it. `paintClear` writes the clear text at once.

### useEditor

```js
const text = await prompt.useEditor({ content: "hello" });

const saved = await prompt.useEditor({ filePath: "notes.txt" });
```

`content` edits that text in memory. Nothing is written to disk. This is the Secrez case. Other fields, including a vault `path`, are left untouched.

`filePath` edits a file on disk. The editor opens with the file's text, or empty when the file does not exist yet. Ctrl-d writes the buffer back to that file, creating it when it is new. Ctrl-c leaves the disk untouched, and a new file is not created. Pass `content` or `filePath`, not both.

Ctrl-d saves and resolves the text. Ctrl-c, or Escape, aborts and resolves `undefined`. Enter splits the line. The arrows move, Backspace deletes, Ctrl-k deletes the line, Ctrl-a and Ctrl-e move to the ends of the line, and Ctrl-g restores the original text.

`useEditor` suspends the clear while the editor is open, the same way `ask` does. Pass `{ skipClear: false }` to leave the timer running. `onEditorReady({ abort, setText })` runs once the editor is on screen. `abort()` closes it. `setText(value)` replaces the buffer.

Pass `editor(options)` on the call, or to `new Prompt`, to replace the built-in editor. The function receives the same options and its return value is the result of `useEditor`.

### History API

`setConfig({ history: { limit, blacklist }, onCtrlEnd })` configures the command history. `limit` defaults to 100. The same command is not stored twice in a row, and a blacklisted command is not stored.

`getHistories()` returns `{ histories }`. `getHistories(true)` returns a copy cut to `limit`. `setHistory({ histories })` restores that object. `addToHistory(context, value)` appends one entry. `getRl()` is the active line editor while a question is open (`rl.line` reads and writes the line) and `null` after it closes.

### API

- `new Prompt({ clearScreen, clearScreenTimeout, onClear, input, output, editor })`
- `ask(questions, { skipClear })`
- `useEditor({ content, filePath, editor, onEditorReady, skipClear })`
- `setConfig(config)`
- `getHistories(useLimit)`
- `setHistory({ histories })`
- `addToHistory(context, value)`
- `getRl()`
- `armClear()`
- `holdClear()`
- `releaseClear()`
- `paintClear()`
- `formatColumns(items, maxSize, ellipsize, ellipsis)` draws a padded list for the terminal width

Question fields: `type`, `name`, `message`, `default`, `prefix`, `validate`, `choices`, `autoCompletion`, `short`, `autocompletePrompt`, `ellipsize`, `ellipsis`, `maxSize`, `context`, `onBeforeKeyPress`, `onBeforeRewrite`, `onClose`.

## History

**1.0.0**

- prompt types `input`, `password`, `confirm`, `list`, and `command`
- in-memory editor through `useEditor({ content })`, and file editing through `useEditor({ filePath })`
- optional idle screen clear, suspended while a question or the editor is open

## Test coverage

```
  59 passing (180ms)

-------------|---------|----------|---------|---------|---------------------------------------------
File         | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                           
-------------|---------|----------|---------|---------|---------------------------------------------
All files    |   97.85 |    86.08 |   98.18 |   99.83 |                                             
 complete.js |     100 |       96 |     100 |     100 | 7                                           
 editor.js   |   97.45 |    83.19 |   97.72 |    99.5 | 122                                         
 index.js    |   97.67 |    86.49 |     100 |     100 | ...-237,251-252,270,298,301,358,389,392-396 
 keys.js     |     100 |       75 |     100 |     100 | 7-24,28                                     
 line.js     |   97.11 |    86.84 |   94.44 |     100 | 5,18-36,59-66,93,127                        
 text.js     |     100 |       90 |     100 |     100 | 2-6,27                                      
-------------|---------|----------|---------|---------|---------------------------------------------
```

## Copyright

(c) 2026-present [Francesco Sullo](https://francesco.sullo.co) (<francesco@sullo.co>)

## Licence

MIT
