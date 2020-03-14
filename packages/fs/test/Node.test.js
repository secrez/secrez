const chai = require('chai')
const assert = chai.assert
const fs = require('fs-extra')
const path = require('path')
const {config, Secrez, Crypto} = require('@secrez/core')
const Node = require('../src/Node')

const {
  password,
  iterations
} = require('./fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('./helpers/jlog')

function initRandomNode(type, secrez, getItem) {
  let item = {
    id: Crypto.getRandomId(),
    name: Crypto.getRandomId() + Crypto.getRandomId(),
    type,
    preserveContent: true
  }
  item = secrez.encryptItem(item)
  item.ts = Crypto.unscrambleTimestamp(item.scrambledTs, item.pseudoMicroseconds)
  if (getItem) {
    return [item, new Node(item)]
  }
  return new Node(item)
}

function setNewNodeVersion(item, node, secrez) {
  item.id = node.id
  item.type = node.type
  item.preserveContent = true
  item.lastTs = node.lastTs
  item = secrez.encryptItem(item)
  item.ts = Crypto.unscrambleTimestamp(item.scrambledTs, item.pseudoMicroseconds)
  return item
}

describe.only('#Node', function () {

  let secrez
  let rootDir = path.resolve(__dirname, '../tmp/test/.secrez')
  const I = config.types.INDEX
  const D = config.types.DIR
  const F = config.types.FILE

  describe('#constructor', async function () {

    it('should instantiate the Node', async function () {

      let root = new Node({
        type: I
      })
      assert.equal(root.id, 'rOOt')

    })

    it('should throw if passing a rot without required parameters', async function () {

      try {
        new Node({
          type: D
        })
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Missing parameters')
      }

      try {
        new Node({
          type: D,
          name: 'Some name'
        })
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Missing parameters')
      }

    })

  })

  describe('#add', async function () {

    beforeEach(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
      await secrez.signup(password, iterations)
    })

    it('should add children to root', async function () {

      let root = new Node({
        type: config.types.INDEX
      })
      let dir1 = initRandomNode(D, secrez)
      let dir2 = initRandomNode(D, secrez)
      let file1 = initRandomNode(F, secrez)

      root.add([dir1, dir2])
      assert.equal(root.children[dir1.id].name, dir1.name)
      assert.equal(root.children[dir1.id].id, dir1.id)

      dir1.add(file1)

      assert.equal(root.children[dir1.id].children[file1.id].name, file1.name)
    })
  })


  describe('#move', async function () {

    beforeEach(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
      await secrez.signup(password, iterations)
    })

    it('should rename a node', async function () {

      let root = new Node({
        type: config.types.INDEX
      })
      let file1 = initRandomNode(F, secrez)

      root.add(file1)
      let item = setNewNodeVersion({name: 'Some name'}, file1, secrez)
      file1.move(item)
      assert.isTrue(Object.keys(file1.versions).includes(item.ts))
    })

    it('should move a node', async function () {

      let root = new Node({
        type: config.types.INDEX
      })
      let dir1 = initRandomNode(D, secrez)
      let dir2 = initRandomNode(D, secrez)
      let file1 = initRandomNode(F, secrez)

      root.add([dir1, dir2])
      dir1.add(file1)

      assert.isTrue(!!dir1.children[file1.id])

      let options = file1.getOptions()
      options.parent = dir2
      file1.move(options)
      assert.isTrue(!dir1.children[file1.id])
      assert.isTrue(!!dir2.children[file1.id])
    })

  })

  describe('#remove', async function () {

    beforeEach(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
      await secrez.signup(password, iterations)
    })

    it('should remove a node', async function () {

      let root = new Node({
        type: config.types.INDEX
      })
      let dir1 = initRandomNode(D, secrez)
      let file1 = initRandomNode(F, secrez)

      root.add(dir1)
      dir1.add(file1)

      assert.isTrue(!!dir1.children[file1.id])
      dir1.remove(file1)
      assert.isTrue(!dir1.children[file1.id])
    })

  })

  describe('#toJSON && Node#fromJSON', async function () {

    beforeEach(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
      await secrez.signup(password, iterations)
    })

    it('should prepare a json for saving', async function () {

      let root = new Node({
        type: config.types.INDEX
      })
      let dir1 = initRandomNode(D, secrez)
      let dir2 = initRandomNode(D, secrez)
      let dir3 = initRandomNode(D, secrez)
      let file1 = initRandomNode(F, secrez)
      let file2 = initRandomNode(F, secrez)

      root.add([dir1, dir2])
      dir1.add(file1)
      dir2.add(dir3)
      dir3.add(file2)

      let item = setNewNodeVersion({name: 'Some name'}, file1, secrez)
      file1.move(item)

      let json = root.toJSON()
      let minSize = json.c[0].v[0].length
      let v = file1.versions
      assert.equal(
          v[Object.keys(v)[0]].file.substring(0, minSize),
          json.c[0].c[0].v[0]
      )
    })

    it.only('should build an index from a json file', async function () {

      let root = new Node({
        type: config.types.INDEX
      })
      let dir1 = initRandomNode(D, secrez)
      let dir2 = initRandomNode(D, secrez)
      let dir3 = initRandomNode(D, secrez)
      let file1 = initRandomNode(F, secrez)
      let file2 = initRandomNode(F, secrez)

      root.add([dir1, dir2])
      dir1.add(file1)
      dir2.add(dir3)
      dir3.add(file2)

      let item = setNewNodeVersion({name: 'Some name'}, file1, secrez)
      file1.move(item)

      let json = root.toJSON()
      jlog(json)

      let allFiles = root.getAllFiles()

      let root2 = Node.fromJSON(json, secrez, allFiles)


    })
  })


})
