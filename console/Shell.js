/* globals Promise */

const readline = require('readline')
const util = require('util')
const colors = require('colors')
const clear = require('clear')
const figlet = require('figlet')
const utils = require('readline-utils')

// readline.emitKeypressEvents(process.stdin);
// process.stdin.setRawMode(true);

let rl
let self

class Shell {

  constructor(caller) {

    this.options = caller.options

    self = this

    rl = utils.createInterface(process.stdin, process.stdout, this.options.completer)

    if (this.options.onKeyPress) {
      rl.input.on('keypress', this.options.onKeyPress)
      console.log('yes keypress')
    } else {
      console.log('no keypress')
    }


    // rl = readline.createInterface(process.stdin, process.stdout, this.completer)
    rl
        .on('line', (cmd) => {
          this.options.start(cmd.trim())
        })
        .on('SIGINT', () => {
          rl.question('Are you sure you want to exit? ', (answer) => {
            if (answer.match(/^y(es)?$/i)) rl.pause();
            else rl.prompt();
          })
        })
        .on('close', () => {
          // only gets triggered by ^C or ^D
          process.exit(0)
        })

    process.on('uncaughtException', function (e) {
      console.log(e.stack.red);
      rl.prompt();
    });

    // process.stdin.on('keypress', this.options.onKeyPress)

  }

  mask(mask = '.') {
    utils.left(rl, 1)
    rl.write(mask)
  }

  log(text, color, style) {
    text = text[color]
    if (style) {
      text = text[style]
    }
    console.log(text)
  }

  question(q, validate, onKeyPress) {

    return new Promise(resolve => {
      rl.question(q + ' ',
          answer => {
            if (validate(answer)) resolve(answer)
            else resolve(this.question(q, validate))
          })
    })
  }

  clear() {
    clear()
  }

  flush(callback) {
    if (process.stdout.write('')) {
      callback();
    } else {
      process.stdout.once('drain', function () {
        callback();
      });
    }
  }

  update(options) {
    for (let option of options) {
      this.options[option] = options[option]
    }
  }

  completer(line) {
    // var completions = '.help .error .exit .quit .q'.split(' ')
    let completions = self.options.allCommands[self.options.context]
    let hits = completions.filter(c => {
      if (c.indexOf(line) == 0) {
        // console.log('bang! ' + c);
        return c;
      }
    });
    return [hits && hits.length ? hits : completions, line];
  }

  prompt(arrow = '> ') {
    let length = arrow.length
    rl.setPrompt(arrow.grey, length)
    rl.prompt()
  }

}
module.exports = Shell