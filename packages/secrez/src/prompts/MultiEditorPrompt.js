const editAsync = require("external-editor").editAsync;
const EditorPrompt = require("inquirer/lib/prompts/editor");
const chalk = require("chalk");

class MultiEditorPrompt extends EditorPrompt {
  render(error) {
    var bottomContent = "";
    var message = this.getQuestion();

    if (this.status === "answered") {
      message += chalk.dim("Received");
    } else {
      message += this.opt.extraMessage || "";
    }
    if (error) {
      bottomContent = chalk.red(">> ") + error;
    }
    this.screen.render(message, bottomContent);
  }

  async startExternalEditor() {
    this.rl.pause();
    editAsync(
      this.currentText,
      this.endExternalEditor.bind(this),
      this.opt.tempDir
        ? {
            dir: this.opt.tempDir,
          }
        : undefined
    );
  }

  close() {
    if (this.opt.onClose) {
      this.opt.onClose();
    }
  }
}

module.exports = MultiEditorPrompt;
