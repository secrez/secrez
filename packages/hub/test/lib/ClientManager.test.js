const chai = require("chai");
const assert = chai.assert;

const net = require("net");

const ClientManager = require("../../src/lib/ClientManager");

describe("ClientManager", () => {
  let someClientId = "3mqxy5mz917dnhzj4yep1fteu1m1et8zz96n3ce5jzs1a17c7oj044ci";

  it("should construct with no tunnels", () => {
    const manager = new ClientManager();
    assert.equal(manager.stats.tunnels, 0);
  });

  it("should create a new client with random id", async () => {
    const manager = new ClientManager();
    const client = await manager.newClient();
    assert.isTrue(manager.hasClient(client.id));
    manager.removeClient(client.id);
  });

  it("should create a new client with id", async () => {
    const manager = new ClientManager();
    const client = await manager.newClient(someClientId);
    assert.isTrue(!!client);
    assert.isTrue(manager.hasClient(someClientId));
    manager.removeClient(someClientId);
  });

  it("should return a previous client if exists", async () => {
    const manager = new ClientManager();
    const clientA = await manager.newClient(someClientId);
    const clientB = await manager.newClient(someClientId);
    assert.equal(clientA.id, someClientId);
    assert.isTrue(manager.hasClient(clientB.id));
    assert.equal(clientB.id, clientA.id);
    manager.removeClient(clientB.id);
    manager.removeClient(someClientId);
  });

  it("should remove client once it goes offline", async () => {
    const manager = new ClientManager();
    const client = await manager.newClient(someClientId);

    const socket = await new Promise((resolve) => {
      const netClient = net.createConnection({ port: client.port }, () => {
        resolve(netClient);
      });
    });
    const closePromise = new Promise((resolve) =>
      socket.once("close", resolve)
    );
    socket.end();
    await closePromise;

    // should still have client - grace period has not expired
    assert.isTrue(manager.hasClient(someClientId));

    // wait past grace period (1s)
    await new Promise((resolve) => setTimeout(resolve, 1500));
    assert.isTrue(!manager.hasClient(someClientId));
  }).timeout(5000);

  it("should remove correct client once it goes offline", async () => {
    const manager = new ClientManager();
    const clientFoo = await manager.newClient("foo");
    // const clientBar =
    await manager.newClient("bar");

    const socket = await new Promise((resolve) => {
      const netClient = net.createConnection({ port: clientFoo.port }, () => {
        resolve(netClient);
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    // foo should still be ok
    assert.isTrue(manager.hasClient("foo"));

    // clientBar shound be removed - nothing connected to it
    assert.isTrue(!manager.hasClient("bar"));

    manager.removeClient("foo");
    socket.end();
  }).timeout(5000);

  it("should remove clients if they do not connect within 5 seconds", async () => {
    const manager = new ClientManager();
    // const clientFoo =
    await manager.newClient("foo");
    assert.isTrue(manager.hasClient("foo"));

    // wait past grace period (1s)
    await new Promise((resolve) => setTimeout(resolve, 1500));
    assert.isTrue(!manager.hasClient("foo"));
  }).timeout(5000);
});
