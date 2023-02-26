const http = require("http");
const https = require("https");
const path = require("path");
const chai = require("chai");
const fs = require("fs-extra");
const assert = chai.assert;
const request = require("superagent");
const Secrez = require("@secrez/core").Secrez(Math.random());
const { TLS } = require("@secrez/tls");
const { sleep } = require("@secrez/utils");
const { createServer, utils: hubUtils } = require("@secrez/hub");
const { isValidRandomId, setPayloadAndSignIt } = hubUtils;

const localDomain = "127zero0one.com"; // '127zero0one.com'

const localtunnel = require("../index");

describe("tunnel", async function () {
  let destination = path.resolve(__dirname, "../tmp/test/certs");
  let localPort;
  let expected = "Hello";
  let host = `http://${localDomain}:4433`;

  let localServer;
  let localHttpsServer;
  let hubServer;
  let tunnel;

  let rootDir = path.resolve(__dirname, "../tmp/test/.secrez");
  let secrez = new Secrez();

  function setPayloadAndSignature(id = 0) {
    return setPayloadAndSignIt(secrez, {
      id,
    });
  }

  // process.env.AS_DEV = true

  process.env.DBDIR = path.resolve(__dirname, "../tmp/test/db");

  before(async function () {
    await fs.emptyDir(rootDir);
    await secrez.init(rootDir);
    await secrez.signup("password", 1000);
  });

  const startHub = async () => {
    await fs.emptyDir(process.env.DBDIR);

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

  const startHttpServer = async () => {
    localServer = http.createServer();
    localServer.on("request", (req, res) => {
      res.write(expected || req.headers.host);
      res.end();
    });
    return new Promise((resolve) => {
      localServer.listen(() => {
        const { port } = localServer.address();
        localPort = port;
        resolve();
      });
    });
  };

  const startHttpsServer = async (options = {}) => {
    localHttpsServer = https.createServer(options);
    localHttpsServer.on("request", (req, res) => {
      res.write(expected || req.headers.host);
      res.end();
    });
    return new Promise((resolve) => {
      localHttpsServer.listen(() => {
        const { port } = localHttpsServer.address();
        localPort = port;
        resolve();
      });
    });
  };

  beforeEach(async function () {
    await fs.emptyDir(process.env.DBDIR);
    await startHttpServer();
    await startHub();
  });

  afterEach(async function () {
    await new Promise((resolve) => hubServer.close(resolve));
    await new Promise((resolve) => localServer.close(resolve));
    await hubUtils.resetDb();
    await sleep(10);
  });

  it("query localtunnel server", async function () {
    const { payload, signature } = setPayloadAndSignature();

    tunnel = await localtunnel({ host, port: localPort, payload, signature });

    let result = tunnel.url.split("//")[1].split(".");

    assert.isTrue(
      await isValidRandomId(result[0], JSON.parse(payload).publicKey)
    );
    assert.equal(result[1], localDomain.split(".")[0]);

    let res = await request.get(tunnel.url);
    assert.equal(res.text, expected);

    expected = "Come on!";

    res = await request.get(tunnel.url);
    assert.equal(res.text, expected);

    tunnel.close();
  });

  it.skip("query localtunnel server resetting id", async function () {
    const { payload, signature } = setPayloadAndSignature();
    tunnel = await localtunnel({ host, port: localPort, payload, signature });
    const url = tunnel.url;
    tunnel.close();

    const { payload: payload2, signature: signature2 } =
      setPayloadAndSignature();
    tunnel = await localtunnel({
      host,
      port: localPort,
      payload: payload2,
      signature: signature2,
    });
    const url2 = tunnel.url;
    tunnel.close();

    assert.equal(url, url2);

    const { payload: payload3, signature: signature3 } =
      setPayloadAndSignature();
    tunnel = await localtunnel({
      host,
      port: localPort,
      payload: payload3,
      signature: signature3,
      reset: true,
    });
    const url3 = tunnel.url;

    assert.notEqual(url, url3);

    tunnel.close();
  });

  it("query localtunnel server from an SSL localhost", async function () {
    await fs.emptyDir(destination);

    let tls = new TLS({
      destination,
      // name: local_host
    });
    assert.isTrue(await tls.generateCertificates());
    assert.isTrue(await tls.certificatesExist());

    let opts = {
      key: await tls.getKey(),
      cert: await tls.getCert(),
      ca: await tls.getCa(),
    };

    await startHttpsServer(opts);

    expected = "Azzo";

    const { payload, signature } = setPayloadAndSignature();

    tunnel = await localtunnel({
      host,
      port: localPort,
      payload,
      signature,
      local_https: true,
      local_cert: opts.cert,
      local_key: opts.key,
      local_ca: opts.ca,
      allow_invalid_cert: false,
    });

    const res = await request.get(tunnel.url);
    assert.equal(res.text, expected);

    tunnel.close();
    await new Promise((resolve) => localHttpsServer.close(resolve));
  });

  it("override Host header with local-host", async function () {
    expected = undefined;

    const { payload, signature } = setPayloadAndSignature();

    tunnel = await localtunnel({
      host,
      port: localPort,
      payload,
      signature,
      local_host: "127.0.0.1",
    });

    let res = await request.get(tunnel.url);
    assert.equal(res.text, "127.0.0.1");

    tunnel.close();
  });

  it("send chunked request", async function () {
    expected = "ciao";

    const { payload, signature } = setPayloadAndSignature();

    tunnel = await localtunnel({ host, port: localPort, payload, signature });
    let res = await request.get(tunnel.url).set("Transfer-Encoding", "chunked");

    assert.equal(res.text, expected);

    tunnel.close();
  });
});
