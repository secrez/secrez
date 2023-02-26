const https = require("https");
const localtunnel = require("@secrez/tunnel");
const { Debug } = require("@secrez/utils");
const { TLS } = require("@secrez/tls");
const Db = require("./Db");

const debug = Debug("courier:server");
const App = require("./App");

class Server {
  constructor(config) {
    if (config.constructor.name === "Config") {
      this.config = config;
    } else {
      throw new Error("Server requires a Config instance during construction");
    }
    this.options = config.options;
    this.messages = [];
    this.latest = -1;
    this.tls = new TLS({
      destination: this.options.certsPath,
    });
    this.db = new Db(this.options.dbPath);
    this.tunnelActive = false;
  }

  async publish(payload, signature) {
    if (!this.tunnelActive) {
      let ssl = await this.getCertificates();
      let opts = {
        host: this.options.hub,
        port: this.port,
        payload,
        signature,
        // local_host: '127zero0one.com',
        local_https: true,
        local_cert: ssl.cert,
        local_key: ssl.key,
        local_ca: ssl.ca,
        allow_invalid_cert: false,
        timeout: 5,
      };

      this.tunnel = await localtunnel(opts);

      if (this.tunnel.clientId) {
        this.tunnelActive = true;
        this.tunnel.on("close", this.onTunnelClose);
        return {
          clientId: this.tunnel.clientId,
          url: this.tunnel.url,
        };
      } else {
        this.tunnel.close();
        return {
          error: "Tunnel server offline",
          hub: this.options.hub,
        };
      }
    } else {
      return {
        clientId: this.tunnel.clientId,
        url: this.tunnel.url,
      };
    }
  }

  async onTunnelClose() {
    this.tunnelActive = false;
  }

  async getCertificates() {
    if (!(await this.tls.certificatesExist())) {
      await this.tls.generateCertificates();
    }
    return {
      key: await this.tls.getKey(),
      cert: await this.tls.getCert(),
      ca: await this.tls.getCa(),
    };
  }

  async setOwner() {
    let owner = await this.db.getValueFromConfig("owner");
    if (!owner) {
      if (this.options.owner) {
        await this.db.saveKeyValueToConfig("owner", this.options.owner);
        owner = this.options.owner;
      } else {
        throw new Error(
          "The public key of the secrez account using the courier is required"
        );
      }
    } else if (this.options.owner && owner !== this.options.owner) {
      throw new Error("This courier has been set up by someone else");
    }
    this.options.owner = owner;
  }

  async start(prefix) {
    await this.db.init();
    if (this.options.owner) {
      await this.setOwner();
    }

    let port = this.options.port;
    if (!port) {
      port = await this.db.getValueFromConfig("port");
    }
    if (this.options.newRandomPort) {
      port = undefined;
    }

    const options = await this.getCertificates();
    const app = new App(this);

    this.httpsServer = https.createServer(options, app.app);
    this.port = await new Promise((resolve) => {
      const onListen = () => {
        const { port } = this.httpsServer.address();
        resolve(port);
      };
      let params = [port ? port : onListen];
      if (port) {
        params.push(onListen);
      }
      this.httpsServer.listen(...params);
    });

    await this.db.saveKeyValueToConfig("port", this.port);

    this.localhost = `https://localhost:${this.port}`;

    this.httpsServer.on("error", (error) => {
      if (error.syscall !== "listen") {
        throw error;
      }
      const bind =
        typeof port === "string" ? "Pipe " + this.port : "Port " + this.port;
      switch (error.code) {
        case "EACCES":
          debug(bind + " requires elevated privileges");
          // eslint-disable-next-line no-process-exit
          process.exit(1);
        case "EADDRINUSE":
          debug(bind + " is already in use");
          // eslint-disable-next-line no-process-exit
          process.exit(1);
        default:
          throw error;
      }
    });

    this.httpsServer.on("listening", () => {
      const addr = this.httpsServer.address();
      const bind =
        typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
      debug("Listening on " + bind);
    });

    if (process.env.NODE_ENV !== "test") {
      process.on("SIGINT", () => {
        debug("SIGINT signal received.");
        // eslint-disable-next-line no-process-exit
        process.exit(0);
      });

      process.on("exit", () => {
        debug("Closing connections...");
        if (this.tunnelActive) {
          this.tunnel.close();
        }
        debug("Closed.");
      });
    }
  }

  async close() {
    if (this.tunnel) {
      this.tunnel.close();
    }
    await new Promise((resolve) => this.httpsServer.close(resolve));
  }
}

module.exports = Server;
