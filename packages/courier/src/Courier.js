const Server = require("./Server");
const Config = require("./Config");

class Courier {
  constructor(options = {}) {
    this.config = new Config(options);
    this.server = new Server(this.config);
  }

  async start(force) {
    return this.server.start();
  }
}

module.exports = Courier;
