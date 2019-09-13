const editAsync = require('external-editor').editAsync
const prompt = require('inquirer/lib/prompts/editor')
const chalk = require('chalk')

class EditorPrompt extends prompt {

  render(error) {
    var bottomContent = ''
    var message = this.getQuestion()

    if (this.status === 'answered') {
      message += chalk.dim('Received')
    } else {
      message +=  (this.opt.extraMessage || '')
    }
    if (error) {
      bottomContent = chalk.red('>> ') + error
    }
    this.screen.render(message, bottomContent)
  }

  async startExternalEditor() {
    this.rl.pause()
    editAsync(this.currentText, this.endExternalEditor.bind(this), {dir: this.opt.tempDir})
  }

  close() {
    if (this.opt.onClose) {
      this.opt.onClose()
    }
  }

}

module.exports = EditorPrompt

