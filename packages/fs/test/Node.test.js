const assert = require('chai').assert
const fs = require('fs-extra')
const path = require('path')
const {config, Secrez, Crypto} = require('@secrez/core')
const Node = require('../src/Node')
const {compareJson, initRandomNode, setNewNodeVersion, getRoot} = require('./helpers')

const {
  password,
  iterations
} = require('./fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('./helpers/jlog')

describe.only('#Node', function () {

  let secrez
  let rootDir = path.resolve(__dirname, '../tmp/test/.secrez')
  const R = config.types.ROOT
  const D = config.types.DIR
  const F = config.types.FILE

  describe('#constructor', async function () {

    it('should instantiate the Node', async function () {

      let root = getRoot()
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

    it('should throw if not passing an object', async function () {

      try {
        new Node()
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Invalid options passed to constructor')
      }

    })

    it('should throw if not passing wrong type', async function () {

      try {
        new Node({
          type: 4,
          name: 'Wrong type'
        })
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Unsupported type')
      }

    })

  })


  describe('#getName && #getFile && getOptions', async function () {

    beforeEach(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
      await secrez.signup(password, iterations)
    })

    it('should get name, file and options', async function () {

      let dir1 = initRandomNode(D, secrez)
      let v = dir1.versions[Object.keys(dir1.versions)[0]]
      assert.equal(dir1.getName(), v.name)
      assert.equal(dir1.getFile(), v.file)
      assert.equal(dir1.getOptions().name, dir1.getName())

      let root = getRoot()
      let options = root.getOptions()
      assert.equal(options.name, undefined)
      assert.equal(options.id, 'rOOt')
    })

    it('should throw if version not found', async function () {

      let dir1 = initRandomNode(D, secrez)

      try {
        dir1.getName('23123213131.2131')
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Version not found')
      }

      try {
        dir1.getFile('23123213131.2131')
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Version not found')
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

      let root = getRoot()
      let dir1 = initRandomNode(D, secrez)
      let dir2 = initRandomNode(D, secrez)
      let file1 = initRandomNode(F, secrez)

      root.add([dir1, dir2])
      assert.equal(root.children[dir1.id].name, dir1.name)
      assert.equal(root.children[dir1.id].id, dir1.id)

      dir1.add(file1)

      assert.equal(root.children[dir1.id].children[file1.id].name, file1.name)
    })

    it('should throw if node is a file', async function () {

      let file1 = initRandomNode(F, secrez)
      let dir1 = initRandomNode(D, secrez)

      try {
        file1.add(dir1)
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'This item does not represent a folder')
      }

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

      let root = getRoot()
      let file1 = initRandomNode(F, secrez)

      root.add(file1)
      let item = setNewNodeVersion({name: 'Some name'}, file1, secrez)
      file1.move(item)
      assert.isTrue(Object.keys(file1.versions).includes(item.ts))
    })

    it('should move a node', async function () {

      let root = getRoot()
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

    it('should throw trying to move root', async function () {

      let root = getRoot()
      let dir1 = initRandomNode(D, secrez)
      let dir2 = initRandomNode(D, secrez)
      root.add(dir1)
      dir1.add(dir2)

      try {
        root.move({
          parent: dir2
        })
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'You cannot modify a root node')
      }

    })

    it('should throw trying to modify a node with different id', async function () {

      let root = getRoot()
      let file1 = initRandomNode(F, secrez)

      root.add(file1)
      let item = setNewNodeVersion({name: 'Some name'}, file1, secrez)
      item.id = Crypto.getRandomId()

      try {
        file1.move(item)
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Id does not match')
      }

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

      let root = getRoot()
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

      let root = getRoot()
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

    it('should build an index from a json file', async function () {

      let root = getRoot()
      let dir1 = initRandomNode(D, secrez)
      let dir2 = initRandomNode(D, secrez)
      let dir3 = initRandomNode(D, secrez)
      let dir4 = initRandomNode(D, secrez)
      let file1 = initRandomNode(F, secrez)
      let file2 = initRandomNode(F, secrez)
      let file3 = initRandomNode(F, secrez)

      root.add([dir1, dir2])
      dir1.add(file1)
      dir2.add(dir3)
      dir3.add([dir4, file2])
      dir4.add(file3)

      let item = setNewNodeVersion({name: 'Some name'}, file1, secrez)
      file1.move(item)

      let json = root.toJSON()
      let allFiles = root.getAllFiles()
      let root2 = Node.fromJSON(json, secrez, allFiles)
      let json2 = root2.toJSON()

      // let's scramble the order because that can be randomly different
      let child = json2.c[0]
      json2.c[0] = json2.c[1]
      json2.c[1] = child

      assert.isTrue(compareJson(root.toJSON(), json2))

    })
  })


  describe('#getChildFromPath', async function () {

    beforeEach(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
      await secrez.signup(password, iterations)
    })

    it('should find a node starting from a path', async function () {

      let root = getRoot()
      let dir1 = initRandomNode(D, secrez)
      let dir2 = initRandomNode(D, secrez)
      let dir3 = initRandomNode(D, secrez)
      let dir4 = initRandomNode(D, secrez)
      let file1 = initRandomNode(F, secrez)
      let file2 = initRandomNode(F, secrez)
      let file3 = initRandomNode(F, secrez)

      root.add([dir1, dir2])
      dir1.add(file1)
      dir2.add(dir3)
      dir3.add([dir4, file2])
      dir4.add(file3)

      let p

      p = ['', dir2.getName(), dir3.getName(), file2.getName()].join('/')
      assert.equal(dir3.getChildFromPath(p).getName(), file2.getName())

      p = [dir3.getName(), dir4.getName(), '', file3.getName()].join('/')
      assert.equal(dir2.getChildFromPath(p).getName(), file3.getName())

      p = ['..', dir1.getName(), file1.getName()].join('/')
      assert.equal(dir2.getChildFromPath(p).getName(), file1.getName())

      p = ['.', dir3.getName(), dir4.getName(), '..'].join('/')
      assert.equal(dir2.getChildFromPath(p).getName(), dir3.getName())

      p = ['', dir2.getName(), dir3.getName(), dir4.getName(), '..', file2.getName()].join('/')
      assert.equal(root.getChildFromPath(p).getName(), file2.getName())

      p = ['..', dir2.getName(),'.',  dir3.getName()].join('/')
      assert.equal(root.getChildFromPath(p).getName(), dir3.getName())

      p = [dir4.getName(), '..', file2.getName()].join('/')
      assert.equal(dir3.getChildFromPath(p).getName(), file2.getName())

      p = ['..', '..', '..'].join('/')
      assert.equal(dir1.getChildFromPath(p).type, config.types.ROOT)


    })

    it('should throw if the path is incorrect or does not exist', async function () {

      let root = getRoot()
      let dir1 = initRandomNode(D, secrez)
      let dir2 = initRandomNode(D, secrez)
      let dir3 = initRandomNode(D, secrez)
      let dir4 = initRandomNode(D, secrez)
      let file1 = initRandomNode(F, secrez)
      let file2 = initRandomNode(F, secrez)
      let file3 = initRandomNode(F, secrez)

      root.add([dir1, dir2])
      dir1.add(file1)
      dir2.add(dir3)
      dir3.add([dir4, file2])
      dir4.add(file3)

      let p
      try {
        p = [dir2.getName()].join('/')
        dir3.getChildFromPath(p)
        assert.isTrue(false)
      } catch (e) {
        assert.equal(e.message, 'Path does not exist')
      }
      try {
        p = ['', dir1.getName(), '~'].join('/')
        root.getChildFromPath(p)
        assert.isTrue(false)
      } catch (e) {
        assert.equal(e.message, 'Path does not exist')
      }
      try {
        p = ['', dir1.getName(), file1.getName(), dir2.getName()].join('/')
        root.getChildFromPath(p)
        assert.isTrue(false)
      } catch (e) {
        assert.equal(e.message, 'Path does not exist')
      }
      try {
        p = ['', dir3.getName(), dir2.getName()].join('/')
        dir3.getChildFromPath(p)
        assert.isTrue(false)
      } catch (e) {
        assert.equal(e.message, 'Path does not exist')
      }
      try {
        p = [dir3.getName(), dir2.getName(), '..', dir1.getName()].join('/')
        dir3.getChildFromPath(p)
        assert.isTrue(false)
      } catch (e) {
        assert.equal(e.message, 'Path does not exist')
      }

    })


  })


})
