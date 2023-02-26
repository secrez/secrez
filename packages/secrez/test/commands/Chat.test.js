const chai = require("chai");
const assert = chai.assert;
const stdout = require("test-console").stdout;

const fs = require("fs-extra");
const path = require("path");

const { sleep } = require("@secrez/utils");
const { createServer } = require("@secrez/hub");
const { Config, Server } = require("@secrez/courier");

const MainPrompt = require("../../src/prompts/MainPromptMock");
const ChatPrompt = require("../../src/prompts/ChatPromptMock");

const { noPrint, decolorize } = require("@secrez/test-helpers");

const { password, iterations } = require("../fixtures");

describe("#Chat", function () {
  let prompt;
  let hubPort = 4433;
  let testDir = path.resolve(__dirname, "../../tmp/test");
  let rootDir = path.resolve(testDir, "secrez");
  let courierRoot = path.resolve(testDir, "secrez-courier");
  let localDomain = "127zero0one.com";
  let inspect;
  let C;
  let config;
  let server;
  let secrez;
  let hubServer;

  let options = {
    container: rootDir,
    localDir: __dirname,
  };

  const startHub = async () => {
    hubServer = await createServer({
      secure: false,
      domain: localDomain,
      max_tcp_sockets: 4,
      port: hubPort,
    });
    await new Promise((resolve) => {
      hubServer.listen(hubPort, () => {
        resolve();
      });
    });
  };

  beforeEach(async function () {
    await fs.emptyDir(testDir);
    await startHub();
    prompt = new MainPrompt();
    await prompt.init(options);
    C = prompt.commands;
    await prompt.secrez.signup(password, iterations);
    secrez = prompt.secrez;
    config = new Config({
      root: courierRoot,
      hub: `http://${localDomain}:${hubPort}`,
      owner: secrez.getPublicKey(),
    });
    server = new Server(config);
    await server.start();
  });

  afterEach(async function () {
    await server.close();
    await new Promise((resolve) => hubServer.close(resolve));
    await sleep(10);
  });

  it("should return the help", async function () {
    inspect = stdout.inspect();
    await C.cd.exec({ help: true });
    inspect.restore();
    let output = inspect.output.map((e) => decolorize(e));
    assert.isTrue(/-h, --help/.test(output[4]));
  });

  it("should run the chat if the courier is ready", async function () {
    await noPrint(
      C.courier.courier({
        port: server.port,
      })
    );

    await C.chat.exec({
      chatPrompt: new ChatPrompt(),
    });

    assert.isTrue(Object.keys(C.chat.chatPrompt.commands).includes("join"));
  });
});
