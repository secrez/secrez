const { sleep } = require("@secrez/utils");

class Validator {
  constructor() {
    this.validated = {};
  }

  isAlreadyValidated(when, signature) {
    when = when.toString();
    if (this.validated[when]) {
      return !!this.validated[when][signature];
    }
    return false;
  }

  setAsValidated(when, signature) {
    when = when.toString();
    if (!this.validated[when]) {
      this.validated[when] = {};
    }
    this.validated[when][signature] = true;
  }

  async purgeOld() {
    const tenMinutes = 10 * 60 * 1000;
    for (let when in this.validated) {
      let ts = parseInt(when);
      if (Math.abs(Date.now() - ts) > tenMinutes) {
        delete this.validated[when];
      }
    }
    await sleep(tenMinutes);
    this.purgeOld();
  }
}

const validator = new Validator();
validator.purgeOld();

module.exports = validator;
