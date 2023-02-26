const path = require("path");
const chai = require("chai");
const fs = require("fs-extra");
const assert = chai.assert;
const superagent = require("superagent");
const Secrez = require("@secrez/core").Secrez(Math.random());
const Secrez2 = require("@secrez/core").Secrez(Math.random());
const { sleep } = require("@secrez/utils");
const { createServer, utils: hubUtils } = require("@secrez/hub");
const { setPayloadAndSignIt } = hubUtils;
const Config = require("../src/Config");
const Server = require("../src/Server");

const { sendMessage } = require("@secrez/test-helpers");
const { publicKey1 } = require("./fixtures");

describe("Server", async function () {
  let localDomain = "127zero0one.com";
  let courierRoot = path.resolve(__dirname, "../tmp/test/secrez-courier");
  let courierRoot2 = path.resolve(__dirname, "../tmp/test/secrez-courier2");
  let secrezDir1 = path.resolve(__dirname, "../tmp/test/secrez1");
  let secrezDir2 = path.resolve(__dirname, "../tmp/test/secrez2");
  let config;
  let config2;
  let secrez1 = new Secrez();
  let secrez2 = new Secrez2();
  let server;
  let server2;
  let hubServer;
  let hubServer2;

  // process.env.AS_DEV = true

  const startHub = async () => {
    hubServer = await createServer({
      secure: false,
      domain: localDomain,
      max_tcp_sockets: 4,
      port: 4433,
    });
    await new Promise((resolve) => {
      hubServer.listen(4433, () => {
        resolve();
      });
    });
  };

  const startHub2 = async () => {
    hubServer2 = await createServer({
      secure: false,
      domain: localDomain,
      max_tcp_sockets: 4,
      port: 3344,
    });
    await new Promise((resolve) => {
      hubServer2.listen(3344, () => {
        resolve();
      });
    });
  };

  beforeEach(async function () {
    await fs.emptyDir(secrezDir1);
    await secrez1.init(secrezDir1);
    await secrez1.signup("password1", 8);
    await fs.emptyDir(secrezDir2);
    await secrez2.init(secrezDir2);
    await secrez2.signup("password2", 9);
    await fs.emptyDir(courierRoot);
    await fs.emptyDir(courierRoot2);
    await startHub();
    await startHub2();
    config = new Config({
      root: courierRoot,
      hub: `http://${localDomain}:4433`,
      owner: secrez1.getPublicKey(),
    });
    server = new Server(config);
    await server.start();
    config2 = new Config({
      root: courierRoot2,
      hub: `http://${localDomain}:3344`,
      owner: secrez2.getPublicKey(),
    });
    server2 = new Server(config2);
    await server2.start();
  });

  afterEach(async function () {
    await server.close();
    await server2.close();
    await new Promise((resolve) => hubServer.close(resolve));
    await new Promise((resolve) => hubServer2.close(resolve));
    await sleep(10);
  });

  it("should build an instance and start the server", async function () {
    assert.equal(
      server.localhost.replace(/localhost/, "127zero0one.com"),
      `https://${localDomain}:${server.port}`
    );
    let res = await superagent
      .get(`${server.localhost}`)
      .set("Accept", "application/json")
      .ca(await server.tls.getCa());
    assert.equal(res.body.hello, "world");
  });

  it("should accept /admin requests", async function () {
    const { payload, signature } = setPayloadAndSignIt(secrez1, {
      some: "thing",
    });

    try {
      await superagent
        .get(`${server.localhost}/admin`)
        .set("Accept", "application/json")
        .query({ payload, signature })
        .ca(await server.tls.getCa());
      assert.isTrue(false);
    } catch (e) {
      assert.equal(e.message, "Bad Request");
    }
  });

  it("should say if is ready", async function () {
    const { payload, signature } = setPayloadAndSignIt(secrez1, {
      action: {
        name: "ready",
      },
    });
    const res = await superagent
      .get(`${server.localhost}/admin`)
      .set("Accept", "application/json")
      .query({ payload, signature })
      .ca(await server.tls.getCa());

    assert.isTrue(res.body.success);
  });

  it("should publish to the hub", async function () {
    const { payload, signature } = setPayloadAndSignIt(secrez1, {
      action: {
        name: "publish",
      },
    });

    const res = await superagent
      .get(`${server.localhost}/admin`)
      .set("Accept", "application/json")
      .query({ payload, signature })
      .ca(await server.tls.getCa());

    assert.isTrue(await hubUtils.isValidUrl(res.body.info.url));
  });

  it("should change the listening port if requested", async function () {
    let firstPort = server.port;

    await server.close();
    config = new Config({
      root: courierRoot,
      hub: `http://${localDomain}:4433`,
      owner: secrez1.getPublicKey(),
    });
    server = new Server(config);
    await server.start();

    assert.equal(firstPort, server.port);

    await server.close();
    config = new Config({
      root: courierRoot,
      hub: `http://${localDomain}:4433`,
      port: 9876,
    });
    server = new Server(config);
    await server.start();

    assert.equal(9876, server.port);
  });

  it("should add a publickey to the trusted circle", async function () {
    const { payload, signature } = setPayloadAndSignIt(secrez1, {
      action: {
        name: "add",
        publicKey: publicKey1,
        url: "https://example.com",
      },
    });

    const res = await superagent
      .get(`${server.localhost}/admin`)
      .set("Accept", "application/json")
      .query({ payload, signature })
      .ca(await server.tls.getCa());

    assert.isTrue(res.body.success);
  });

  it("should receive a message from a public key in the trusted circle", async function () {
    this.timeout(5000);

    const { payload, signature } = setPayloadAndSignIt(secrez1, {
      action: {
        name: "publish",
      },
    });

    await superagent
      .get(`${server.localhost}/admin`)
      .set("Accept", "application/json")
      .query({ payload, signature })
      .ca(await server.tls.getCa());

    const publicKey1 = secrez1.getPublicKey();
    const publicKey2 = secrez2.getPublicKey();

    const { payload: payload1, signature: signature1 } = setPayloadAndSignIt(
      secrez1,
      {
        action: {
          name: "add",
          publicKey: secrez2.getPublicKey(),
        },
      }
    );

    await superagent
      .get(`${server.localhost}/admin`)
      .set("Accept", "application/json")
      .query({ payload: payload1, signature: signature1 })
      .ca(await server.tls.getCa());

    let message = "Hello, my friend.";

    let res = await sendMessage(message, publicKey1, secrez2, server);
    assert.isTrue(res.body.success);

    await sendMessage("Ciao bello", publicKey1, secrez2, server);
    await sendMessage("How is it going?", publicKey1, secrez2, server);

    const { payload: payload2, signature: signature2 } = setPayloadAndSignIt(
      secrez1,
      {
        publickey: publicKey2,
      }
    );

    res = await superagent
      .get(`${server.localhost}/messages`)
      .set("Accept", "application/json")
      .query({ payload: payload2, signature: signature2 })
      .ca(await server.tls.getCa());

    let encryptedMessage = JSON.parse(res.body.result[0].payload).message;

    assert.equal(
      message,
      secrez2.decryptSharedData(encryptedMessage, publicKey1)
    );

    const { payload: payload3, signature: signature3 } = setPayloadAndSignIt(
      secrez1,
      {
        publickey: publicKey2,
      }
    );

    res = await superagent
      .get(`${server.localhost}/messages`)
      .set("Accept", "application/json")
      .query({ payload: payload3, signature: signature3 })
      .ca(await server.tls.getCa());
    encryptedMessage = JSON.parse(res.body.result[0].payload).message;

    assert.equal(res.body.result.length, 3);
    assert.equal(
      message,
      secrez2.decryptSharedData(encryptedMessage, publicKey1)
    );

    const { payload: payload4, signature: signature4 } = setPayloadAndSignIt(
      secrez1,
      {
        minTimestamp: Date.now() - 1000,
      }
    );

    res = await superagent
      .get(`${server.localhost}/messages`)
      .set("Accept", "application/json")
      .query({ payload: payload4, signature: signature4 })
      .ca(await server.tls.getCa());

    encryptedMessage = JSON.parse(res.body.result[0].payload).message;

    assert.equal(res.body.result.length, 3);
    assert.equal(
      message,
      secrez2.decryptSharedData(encryptedMessage, publicKey1)
    );

    await sleep(1000);

    await sendMessage("And what?", publicKey1, secrez2, server);

    const { payload: payload5, signature: signature5 } = setPayloadAndSignIt(
      secrez1,
      {
        maxTimestamp: Date.now() - 1000,
      }
    );

    res = await superagent
      .get(`${server.localhost}/messages`)
      .set("Accept", "application/json")
      .query({ payload: payload5, signature: signature5 })
      .ca(await server.tls.getCa());

    encryptedMessage = JSON.parse(res.body.result[0].payload).message;

    assert.equal(res.body.result.length, 3);
    assert.equal(
      message,
      secrez2.decryptSharedData(encryptedMessage, publicKey1)
    );
  });

  it("should send a message to a public key in the trusted circle", async function () {
    this.timeout(10000);

    const publicKey1 = secrez1.getPublicKey();
    const publicKey2 = secrez2.getPublicKey();

    const { payload, signature } = setPayloadAndSignIt(secrez1, {
      action: {
        name: "publish",
      },
    });

    let res = await superagent
      .get(`${server.localhost}/admin`)
      .set("Accept", "application/json")
      .query({ payload, signature })
      .ca(await server.tls.getCa());

    const { payload: payload0, signature: signature0 } = setPayloadAndSignIt(
      secrez2,
      {
        action: {
          name: "publish",
        },
      }
    );

    res = await superagent
      .get(`${server2.localhost}/admin`)
      .set("Accept", "application/json")
      .query({ payload: payload0, signature: signature0 })
      .ca(await server2.tls.getCa());

    let info2 = res.body.info;

    const { payload: payload1, signature: signature1 } = setPayloadAndSignIt(
      secrez1,
      {
        action: {
          name: "add",
          publicKey: publicKey2,
          url: info2.url,
        },
      }
    );

    await superagent
      .get(`${server.localhost}/admin`)
      .set("Accept", "application/json")
      .query({ payload: payload1, signature: signature1 })
      .ca(await server.tls.getCa());

    let message = "Ciao amico mio";

    let encryptedMessage = secrez1.encryptSharedData(message, publicKey2);

    const { payload: payloadMessage, signature: signatureMessage } =
      setPayloadAndSignIt(secrez1, {
        message: encryptedMessage,
      });

    const { payload: payload2, signature: signature2 } = setPayloadAndSignIt(
      secrez1,
      {
        action: {
          name: "send",
          recipient: publicKey2,
          message: {
            payload: payloadMessage,
            signature: signatureMessage,
          },
        },
      }
    );

    res = await superagent
      .get(`${server.localhost}/admin`)
      .set("Accept", "application/json")
      .query({ payload: payload2, signature: signature2 })
      .ca(await server.tls.getCa());

    assert.isTrue(res.body.success);

    const { payload: payload3, signature: signature3 } = setPayloadAndSignIt(
      secrez2,
      {
        from: publicKey1,
      }
    );

    res = await superagent
      .get(`${server2.localhost}/messages`)
      .set("Accept", "application/json")
      .query({ payload: payload3, signature: signature3 })
      .ca(await server2.tls.getCa());

    encryptedMessage = JSON.parse(res.body.result[0].payload).message;
    assert.equal(
      message,
      secrez2.decryptSharedData(encryptedMessage, publicKey1)
    );
  });

  it("should throw if calling /admin from another secrez account", async function () {
    try {
      const { payload, signature } = setPayloadAndSignIt(secrez1, {
        action: {
          name: "ready",
        },
      });
      await superagent
        .get(`${server2.localhost}/admin`)
        .set("Accept", "application/json")
        .query({ payload, signature })
        .ca(await server2.tls.getCa());
      assert.isTrue(false);
    } catch (e) {
      assert.equal(e.message, "Unauthorized");
    }
  });
});
