
// (c) 2017 Francesco Sullo, francesco@sullo.co

// thanks to Allen Kim (https://github.com/allenhwkim)
// https://github.com/SBoudrias/Inquirer.js/issues/306#issuecomment-252516909

const util = require('util');
const InputPrompt = require('inquirer/lib/prompts/input');

const histories = [];
const indexes = [];
let autoComplete;

module.exports = CommandPrompt;

function CommandPrompt() {
  return InputPrompt.apply(this, arguments);
}
util.inherits(CommandPrompt, InputPrompt);

CommandPrompt.prototype.onKeypress = function (e) {

  let context = typeof this.opt.context !== 'number' ? this.opt.context : 0

  if (!histories[context]) {
    histories[context] = []
    indexes[context] = 0
  }

  /** go up commands history */
  if (e.key.name === 'up') {
    if (indexes[context] > 0) {
      indexes[context]--;
      this.rl.line = histories[context][indexes[context]];
      this.rl.write(null, {ctrl: true, name: 'e'});
    }
  }
  /** go down commands history */
  else if (e.key.name === 'down') {
    if (histories[context][indexes[context]+1]) {
      indexes[context]++;
      this.rl.line = histories[context][indexes[context]];
      this.rl.write(null, {ctrl: true, name: 'e'});
    }
  }
  /** search for matching history
   * if nothing's found, it looks at an autoComplete option
   * which can be an array or a function which returns an array
   * */
  else if (e.key.name === 'tab') {
    var matchingHistory = histories[context].find(el => {
      return el.match(new RegExp(`^${this.rl.line.replace(/\t/,'')}`));
    });
    if (!matchingHistory) {
      if (!autoComplete) {
        if (typeof this.opt.autoComplete === 'function') {
          autoComplete = this.opt.autoComplete
        } else if (Array.isArray(this.opt.autoComplete)) {
          autoComplete = () => this.opt.autoComplete
        } else {
          autoComplete = () => []
        }
      }
      matchingHistory = autoComplete().find(el => {
        return el.match(new RegExp(`^${this.rl.line.replace(/\t/,'')}`));
      });
    }
    if (matchingHistory) {
      this.rl.line = matchingHistory;
      this.rl.write(null, {ctrl: true, name: 'e'});
    }
  }
  this.render();
};

CommandPrompt.prototype.run = function () {
  return new Promise(function (resolve) {
    this._run(function (value) {
      histories[context].push(value);
      indexes[context]++;
      resolve(value);
    });
  }.bind(this));
};
