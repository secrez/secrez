const Prompt = require("./prompts/Prompt");

class PreCommand {
  sessionPrompts() {
    if (this.prompt && this.prompt.prompts) return this.prompt.prompts;
    if (!this._prompts) this._prompts = new Prompt(this.prompt || {});
    return this._prompts;
  }

  useEditor(options) {
    return this.sessionPrompts().useEditor(options);
  }

  useSelect(options) {
    return this.sessionPrompts().useSelect(options);
  }

  useConfirm(options) {
    return this.sessionPrompts().useConfirm(options);
  }

  useInput(options) {
    return this.sessionPrompts().useInput(options);
  }
}

module.exports = PreCommand;
