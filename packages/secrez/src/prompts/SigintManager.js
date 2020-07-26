class SigintManager {

  constructor() {
    this.prompts = []
    this.siginted = false
    this.lastCalled = Date.now()

    if (process.env.NODE_ENV !== 'test') {
      process.on('SIGINT', async () => {
        await this.onSigint()
      })
    }
  }

  async onSigint() {
    this.siginted = true
    // let len = this.prompts.length
    if (Date.now() - this.lastCalled < 500) {
      // eslint-disable-next-line no-process-exit
      process.exit(0)
    }
    const prompt = this.prompts[this.prompts.length - 1]
    // if (prompt.sigintPosition === len - 1) {
      let msg
      if (prompt.context === 'chat') {
        msg = 'To leave the chat, type leave. To exit press ^C two times'
      } else {
        msg = 'To exit, type quit or press ^C two times'
      }
      console.info(msg)
      this.lastCalled = Date.now()
      return prompt.run()
    // }
  }

  async setPosition(prompt) {
    this.prompts.push(prompt)
    let runNow
    if (this.siginted && prompt.context === 0) {
      this.siginted = false
      runNow = true
    }
    return {
      position: this.prompts.length - 1,
      runNow
    }
  }

}

module.exports = new SigintManager

