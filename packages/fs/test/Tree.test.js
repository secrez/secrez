const chai = require("chai");
const assert = chai.assert;
const fs = require("fs-extra");
const path = require("path");
const Secrez = require("@secrez/core").Secrez(Math.random());
const Node = require("../src/Node");
const Tree = require("../src/Tree");
const InternalFs = require("../src/InternalFs");

const { sleep } = require("@secrez/test-helpers");

const { password, iterations } = require("./fixtures");

describe("#Tree", function () {
  let rootDir = path.resolve(__dirname, "../tmp/test/.secrez");
  let secrez;
  let tree;
  let internalFs;

  describe("#constructor", async function () {
    before(async function () {
      await fs.emptyDir(path.resolve(__dirname, "../tmp/test"));
      secrez = new Secrez();
      await secrez.init(rootDir);
    });

    it("should instantiate the Tree", async function () {
      tree = new Tree(secrez);
      assert.equal(tree.status, Tree.statutes.UNLOADED);
    });

    it("should throw if passing not an Secrez instance", async function () {
      try {
        new Tree(new Object());
        assert.isFalse(true);
      } catch (e) {
        assert.equal(
          e.message,
          "Tree requires a Secrez instance during construction"
        );
      }
    });
  });

  describe("#load", async function () {
    before(async function () {
      await fs.emptyDir(path.resolve(__dirname, "../tmp/test"));
      secrez = new Secrez();
      await secrez.init(rootDir);
    });

    it("should load an empty Tree", async function () {
      tree = new Tree(secrez);
      await tree.load();
      assert.equal(tree.status, Tree.statutes.LOADED);
      assert.equal(Node.isRoot(tree.root), true);
    });

    it("should do nothing if already loaded", async function () {
      tree = new Tree(secrez);
      await tree.load(rootDir);
      await tree.load(rootDir);
      assert.equal(tree.status, Tree.statutes.LOADED);
    });
  });

  describe("getEntryDetails", async function () {
    beforeEach(async function () {
      await fs.emptyDir(path.resolve(__dirname, "../tmp/test"));
      secrez = new Secrez();
      await secrez.init(rootDir);
      await secrez.signup(password, iterations);
      internalFs = new InternalFs(secrez);
      await internalFs.init();
    });

    it("should return the entry details of a node", async function () {
      let content = "PIN: 1234";
      let file2 = await internalFs.make({
        path: "file2",
        type: secrez.config.types.TEXT,
        content,
      });

      let id = file2.id;
      let file2Entry = await internalFs.tree.getEntryDetails(file2);
      assert.equal(file2Entry.content, content);

      let versionedName = await internalFs.tree.getVersionedBasename(
        file2.getPath()
      );
      assert.equal(versionedName, file2.getName() + ".2");

      internalFs = new InternalFs(secrez);
      await internalFs.init();

      file2 = internalFs.tree.root.findChildById(id);
      file2Entry = await internalFs.tree.getEntryDetails(file2);
      assert.equal(file2Entry.content, content);
    });
  });

  describe("#Fix", function () {
    let rootDir = path.resolve(__dirname, "../tmp/test/.secrez");

    beforeEach(async function () {
      await fs.emptyDir(path.resolve(__dirname, "../tmp/test"));
    });

    let signedUp = false;

    async function startTree() {
      secrez = new Secrez();
      await secrez.init(rootDir);
      if (signedUp) {
        await secrez.signin(password, iterations);
      } else {
        await secrez.signup(password, iterations);
        signedUp = true;
      }
      internalFs = new InternalFs(secrez);
      await internalFs.init();
      tree = internalFs.tree;
      return {
        secrez,
        tree,
        internalFs,
      };
    }

    it("should load a tree with tags", async function () {
      signedUp = false;

      let { secrez, tree, internalFs } = await startTree();

      let a = await internalFs.make({
        path: "/a",
        type: secrez.config.types.DIR,
      });

      let b = await internalFs.make({
        path: "/b",
        type: secrez.config.types.DIR,
      });

      let c = await internalFs.make({
        path: "/c",
        type: secrez.config.types.TEXT,
        content: "some a",
      });

      await tree.addTag(a, ["web"]);
      tree.disableSave();

      await tree.addTag(b, ["web", "wob"]);
      await tree.addTag(c, ["wib", "wob"]);

      tree.enableSave();
      await tree.saveTags();

      let list = tree.listTags();
      assert.equal(list[0], "web (2)");
      assert.equal(list[1], "wib (1)");
      assert.equal(list[2], "wob (2)");

      await tree.removeTag(b, ["web"]);
      list = tree.listTags();
      assert.equal(list[0], "web (1)");

      let tagged = tree.getNodesByTag(["wob"]);
      assert.equal(tagged[0][0], "/b");
      assert.equal(tagged[0][1], "wob");
      assert.equal(tagged[1][0], "/c");
      assert.equal(tagged[1][1], "wib wob");

      tagged = tree.getNodesByTag(["wob", "wib"]);
      assert.equal(tagged[0][0], "/c");
      assert.equal(tagged[0][1], "wib wob");

      let aid = a.id;
      let bid = b.id;
      let cid = c.id;

      await startTree();

      assert.isTrue(tree.tags.content["web"].includes(aid));
      assert.isTrue(tree.tags.content["wob"].includes(bid));
      assert.isTrue(tree.tags.content["wob"].includes(cid));
      assert.isTrue(tree.tags.content["wib"].includes(cid));
    });

    it("should simulate a conflict in the repo and recover lost entries", async function () {
      await sleep(1000);

      signedUp = false;

      let { secrez, internalFs } = await startTree();

      let files0 = await fs.readdir(`${rootDir}/data`);
      assert.equal(files0.length, 0);

      let backup = path.resolve(__dirname, "../tmp/test/backup");
      await fs.emptyDir(backup);

      await internalFs.make({
        path: "/A/M",
        type: secrez.config.types.DIR,
      });
      await internalFs.make({
        path: "/A/C",
        type: secrez.config.types.DIR,
      });

      await internalFs.make({
        path: "/A/a",
        type: secrez.config.types.TEXT,
        content: "some a",
      });

      await internalFs.make({
        path: "/B/b",
        type: secrez.config.types.TEXT,
        content: "some b",
      });

      let files1 = await fs.readdir(`${rootDir}/data`);
      assert.equal(files1.length, 7);

      await sleep(200);

      let tmp = await startTree();
      secrez = tmp.secrez;
      tree = tmp.tree;
      internalFs = tmp.internalFs;

      await internalFs.change({
        path: "/B/b",
        newPath: "/B/b",
        content: "some new B",
      });

      await internalFs.make({
        path: "/B/D/g",
        type: secrez.config.types.TEXT,
        content: "some g",
      });

      await internalFs.make({
        path: "/E/c",
        type: secrez.config.types.TEXT,
        content: "some c",
      });

      await internalFs.make({
        path: "/E/L/N",
        type: secrez.config.types.DIR,
      });

      let files2 = await fs.readdir(`${rootDir}/data`);
      assert.equal(files2.length, 15);

      let files3 = [];

      for (let f of files2) {
        if (!files1.includes(f)) {
          files3.push(f);
          await fs.move(`${rootDir}/data/${f}`, `${backup}/${f}`);
        }
      }

      await sleep(200);

      tmp = await startTree();
      secrez = tmp.secrez;
      internalFs = tmp.internalFs;

      await internalFs.make({
        path: "/B/D/g",
        type: secrez.config.types.TEXT,
        content: "some g2",
      });

      await internalFs.make({
        path: "/E/F/d",
        type: secrez.config.types.TEXT,
        content: "some d",
      });

      await internalFs.make({
        path: "/E/c",
        type: secrez.config.types.TEXT,
        content: "some c",
      });

      for (let f of files3) {
        await fs.move(`${backup}/${f}`, `${rootDir}/data/${f}`);
      }

      // jlog(Object.keys(tree.root.flat()))

      await sleep(300);

      tmp = await startTree();
      tree = tmp.tree;
      internalFs = tmp.internalFs;

      assert.equal(tree.alerts.length, 5);
      assert.equal(tree.alerts[1], "/B/D/g");
      assert.equal(tree.alerts[2], "/B/b");
      assert.equal(tree.alerts[3], "/E/L/N");
      assert.equal(tree.alerts[4], "/E/c");

      // jlog(Object.keys(tree.root.flat()))

      await internalFs.mountTrash();
      const deleteds = internalFs.trees[1].root.children;
      assert.equal(Object.keys(deleteds).length, 1);
    });

    it.skip("should simulate a lost index in the repo and recover the entries", async function () {
      signedUp = false;

      let { secrez, tree, internalFs } = await startTree();

      await internalFs.make({
        path: "/A/M",
        type: secrez.config.types.DIR,
      });
      await internalFs.make({
        path: "/A/C",
        type: secrez.config.types.DIR,
      });

      await internalFs.make({
        path: "/A/a",
        type: secrez.config.types.TEXT,
        content: "some a",
      });

      await internalFs.make({
        path: "/B/b",
        type: secrez.config.types.TEXT,
        content: "some b",
      });

      let files1 = await fs.readdir(`${rootDir}/data`);
      for (let file of files1) {
        if (/^0/.test(file)) {
          await fs.unlink(path.join(tree.dataPath, file));
        }
      }

      let tmp = await startTree();
      tree = tmp.tree;

      assert.equal(tree.alerts.length, 7);
      assert.isTrue(tree.alerts[1].indexOf("/b") !== -1);
      assert.isTrue(tree.alerts[2].indexOf("/B") !== -1);
      assert.isTrue(tree.alerts[3].indexOf("/a") !== -1);
      assert.isTrue(tree.alerts[4].indexOf("/C") !== -1);
      assert.isTrue(tree.alerts[5].indexOf("/M") !== -1);
      assert.isTrue(tree.alerts[6].indexOf("/A") !== -1);

      function findRecovered(root) {
        let recovered;
        for (let c in root.children) {
          let child = root.children[c];
          if (/^REC_\d{14}$/.test(child.getName())) {
            recovered = child;
            break;
          }
        }
        return recovered;
      }

      let recovered = findRecovered(tree.root);
      assert.equal(Object.keys(recovered.children).length, 6);

      tree = (await startTree()).tree;

      recovered = findRecovered(tree.root);
      assert.equal(Object.keys(recovered.children).length, 6);
    });
  });

  describe("Multi data sets", async function () {
    let rootDir = path.resolve(__dirname, "../tmp/test/.secrez");
    let secrez;
    let internalFs;

    beforeEach(async function () {
      await fs.emptyDir(path.resolve(__dirname, "../tmp/test"));
      if (!secrez) {
        secrez = new Secrez();
        await secrez.init(rootDir);
        await secrez.signup(password, iterations);
      }
      internalFs = new InternalFs(secrez);
      await internalFs.init();
      tree = internalFs.tree;
    });

    it("should load the trees of two data sets", async function () {
      assert.equal(internalFs.tree.name, "main");

      await internalFs.make({
        path: "/a",
        type: secrez.config.types.DIR,
      });

      await internalFs.make({
        path: "/b",
        type: secrez.config.types.DIR,
      });

      await internalFs.mountTree(2, true);
      await internalFs.tree.nameDataset("archive");
      assert.equal(internalFs.tree.name, "archive");

      await internalFs.make({
        path: "/d",
        type: secrez.config.types.DIR,
      });

      await internalFs.make({
        path: "/e",
        type: secrez.config.types.DIR,
      });

      let files = (await internalFs.getFileList()).sort();
      assert.equal(files.length, 5);
      assert.equal(files[0], "archive:/");
      assert.equal(files[1], "d");
      assert.equal(files[2], "e");
      assert.equal(files[3], "main:/");
      assert.equal(files[4], "trash:/");

      await internalFs.mountTree(0, true);

      files = (await internalFs.getFileList()).sort();
      assert.equal(files.length, 5);
      assert.equal(files[0], "a");
      assert.equal(files[1], "archive:/");
      assert.equal(files[2], "b");
      assert.equal(files[3], "main:/");
      assert.equal(files[4], "trash:/");

      await internalFs.mountTree(2, true);
      assert.equal(internalFs.tree.name, "archive");
    });
  });
});
