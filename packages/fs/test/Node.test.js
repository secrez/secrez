const assert = require('chai').assert
const fs = require('fs-extra')
const util = require('util')
const path = require('path')
const {config, Secrez, Crypto, Entry} = require('@secrez/core')
const Node = require('../src/Node')
const {jsonEqual, initRandomNode, setNewNodeVersion, initARootNode} = require('./helpers')
const {ENTRY_EXISTS} = require('../src/Messages')

const {
  password,
  iterations
} = require('./fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('./helpers/jlog')

describe('#Node', function () {

  let secrez
  let rootDir = path.resolve(__dirname, '../tmp/test/.secrez')
  const D = config.types.DIR
  const F = config.types.TEXT

  describe('#constructor', async function () {

    it('should instantiate the Node', async function () {

      let root = initARootNode()
      assert.equal(root.id, config.specialId.ROOT)

    })

    it('should throw if passing a rot without required parameters', async function () {

      try {
        new Node(new Entry({
          type: D
        }))
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Missing parameters')
      }

      try {
        new Node(new Entry({
          type: D,
          name: 'Some name'
        }))
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Missing parameters')
      }

    })

    it('should throw if not passing an object', async function () {

      try {
        new Node(new Object())
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Node constructor expects an Entry instance')
      }

      try {
        new Node()
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Node constructor expects an Entry instance')
      }

    })

    it('should throw if not passing wrong type', async function () {

      try {
        new Node(new Entry({
          type: 99,
          name: 'Wrong type'
        }))
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Unsupported type')
      }

    })

  })


  describe('#getName && #getFile && #getContent && getOptions', async function () {

    beforeEach(async function () {
      await fs.emptyDir(path.resolve(__dirname, '../tmp/test'))
      secrez = new Secrez()
      await secrez.init(rootDir)
      await secrez.signup(password, iterations)
    })

    it('should get name, file and options', async function () {

      let dir1 = initRandomNode(D, secrez)
      let v = dir1.versions[Object.keys(dir1.versions)[0]]
      assert.equal(dir1.getName(), v.name)
      assert.equal(dir1.getFile(), v.file)
      assert.equal(dir1.getContent(), v.content)
      assert.equal(dir1.getOptions().name, dir1.getName())

      let root = initARootNode()
      let options = root.getOptions()
      assert.equal(options.name, undefined)
      assert.equal(options.id, config.specialId.ROOT)
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

      try {
        dir1.getContent('23123213131.2131')
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Version not found')
      }


    })
  })

  describe('#getNames', async function () {

    beforeEach(async function () {
      await fs.emptyDir(path.resolve(__dirname, '../tmp/test'))
      secrez = new Secrez()
      await secrez.init(rootDir)
      await secrez.signup(password, iterations)
    })

    it('should get the names of all children', async function () {

      let root = initARootNode()
      let dir1 = initRandomNode(D, secrez)
      let dir2 = initRandomNode(D, secrez)
      let dir3 = initRandomNode(D, secrez)
      let dir4 = initRandomNode(D, secrez)
      let file1 = initRandomNode(F, secrez)
      let file2 = initRandomNode(F, secrez)
      let file3 = initRandomNode(F, secrez)

      root.add([dir1, dir2])
      dir1.add([dir3, dir4, file1, file2])
      dir4.add(file3)

      let children = dir1.getChildrenNames()
      assert.equal(children.length, 4)
      assert.equal(children.includes(file2.getName()), true)
    })

    it('should throw if trying to get children of a file', async function () {

      let file1 = initRandomNode(F, secrez)

      try {
        file1.getChildrenNames()
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Files do not have children')
      }

    })
  })

  describe('#add', async function () {

    beforeEach(async function () {
      await fs.emptyDir(path.resolve(__dirname, '../tmp/test'))
      secrez = new Secrez()
      await secrez.init(rootDir)
      await secrez.signup(password, iterations)
    })

    it('should add children to root', async function () {

      let root = initARootNode()
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
        assert.equal(e.message, 'This entry does not represent a folder')
      }

    })
  })


  describe('#move', async function () {

    beforeEach(async function () {
      await fs.emptyDir(path.resolve(__dirname, '../tmp/test'))
      secrez = new Secrez()
      await secrez.init(rootDir)
      await secrez.signup(password, iterations)
    })

    it('should rename a node', async function () {

      let root = initARootNode()
      let file1 = initRandomNode(F, secrez)

      root.add(file1)
      let entry = setNewNodeVersion(new Entry({name: 'Some name'}), file1, secrez)
      file1.move(entry)
      assert.isTrue(Object.keys(file1.versions).includes(entry.ts))
    })

    it('should move a node', async function () {

      let root = initARootNode()
      let dir1 = initRandomNode(D, secrez)
      let dir2 = initRandomNode(D, secrez)
      let file1 = initRandomNode(F, secrez)

      root.add([dir1, dir2])
      dir1.add(file1)

      assert.isTrue(!!dir1.children[file1.id])

      let entry = file1.getEntry()
      entry.set({parent: dir2})

      // jlog(root.toCompressedJSON(null, true))

      file1.move(entry)

      // jlog(root.toCompressedJSON(null, true))

      assert.isTrue(!dir1.children[file1.id])
      assert.isTrue(!!dir2.children[file1.id])
    })

    it('should throw trying to move root', async function () {

      let root = initARootNode()
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

      let root = initARootNode()
      let file1 = initRandomNode(F, secrez)

      root.add(file1)
      let entry = setNewNodeVersion(new Entry({name: 'Some name'}), file1, secrez)
      entry.id = Crypto.getRandomId()

      try {
        file1.move(entry)
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Id does not match')
      }

    })

  })

  describe('#remove', async function () {

    beforeEach(async function () {
      await fs.emptyDir(path.resolve(__dirname, '../tmp/test'))
      secrez = new Secrez()
      await secrez.init(rootDir)
      await secrez.signup(password, iterations)
    })

    it('should remove a node', async function () {

      let root = initARootNode()
      let dir1 = initRandomNode(D, secrez)
      let file1 = initRandomNode(F, secrez)

      root.add(dir1)
      dir1.add(file1)

      assert.isTrue(!!dir1.children[file1.id])
      file1.remove()
      assert.isTrue(!dir1.children[file1.id])
    })

    it('should remove itself', async function () {

      let root = initARootNode()
      let file1 = initRandomNode(F, secrez)

      root.add(file1)

      assert.isTrue(!!root.children[file1.id])
      file1.remove()
      assert.isTrue(!root.children[file1.id])
    })

    it('should throw trying to remove root', async function () {

      let root = initARootNode()
      let file1 = initRandomNode(F, secrez)
      root.add(file1)

      try {
        root.remove()
        assert.isFalse(true)
      } catch (e) {
        assert.equal(e.message, 'Root cannot be removed')
      }

    })

  })

  describe('#toCompressedJSON && Node#fromJSON', async function () {

    beforeEach(async function () {
      await fs.emptyDir(path.resolve(__dirname, '../tmp/test'))
      secrez = new Secrez()
      await secrez.init(rootDir)
      await secrez.signup(password, iterations)
    })

    it('should prepare a json for saving', async function () {

      let root = initARootNode()
      let dir1 = initRandomNode(D, secrez)
      let dir2 = initRandomNode(D, secrez)
      let dir3 = initRandomNode(D, secrez)
      let file1 = initRandomNode(F, secrez)
      let file2 = initRandomNode(F, secrez)

      root.add([dir1, dir2])
      dir1.add(file1)
      dir2.add(dir3)
      dir3.add(file2)

      let entry = setNewNodeVersion(new Entry({name: 'Some name'}), file1, secrez)
      file1.move(entry)

      let json = root.toCompressedJSON()

      // jlog(json)

      let minSize = json.c[0].v[0].length
      let v = file1.versions
      assert.equal(
          v[Object.keys(v)[0]].file.substring(0, minSize),
          json.c[0].c[0].v[0]
      )
    })

    it('should build an index from a json file', async function () {

      let root = initARootNode()
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

      let entry = setNewNodeVersion(new Entry({name: 'Some name'}), file1, secrez)
      file1.move(entry)

      let json = root.toCompressedJSON()
      let allFiles = root.getAllFiles()
      let root2 = Node.fromJSON(json, secrez, allFiles)
      let json2 = root2.toCompressedJSON()

      // let's scramble the order because that can be randomly different
      let child = json2.c[0]
      json2.c[0] = json2.c[1]
      json2.c[1] = child

      // console.log(JSON.stringify(root.toCompressedJSON()))
      // console.log(JSON.stringify(json2))

      assert.isTrue(jsonEqual(root.toCompressedJSON(), json2))

      assert.equal(root.toCompressedJSON(null, true).c[0].id, dir1.id)

    })
  })


  describe('#getChildFromPath', async function () {

    beforeEach(async function () {
      await fs.emptyDir(path.resolve(__dirname, '../tmp/test'))
      secrez = new Secrez()
      await secrez.init(rootDir)
      await secrez.signup(password, iterations)
    })

    it('should find a node starting from a path', async function () {

      let root = initARootNode()
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

    it('should find the last ancestor starting from a path', async function () {

      let root = initARootNode()
      let dir1 = initRandomNode(D, secrez)
      let dir2 = initRandomNode(D, secrez)
      let dir3 = initRandomNode(D, secrez)
      let dir4 = initRandomNode(D, secrez)
      let file1 = initRandomNode(F, secrez)

      root.add(dir1)
      dir1.add(dir2)
      dir2.add(dir3)
      dir3.add(dir4)
      dir4.add(file1)

      let p
      let name1 = Crypto.getRandomBase58String(16)
      let name2 = Crypto.getRandomBase58String(16)
      p = ['/', dir1.getName(), dir2.getName(), dir3.getName(), name1, name2].join('/')
      let [ancestor, remainingPath] = dir2.getChildFromPath(p, true)
      assert.equal(ancestor.getName(), dir3.getName())
      assert.equal(remainingPath, [name1, name2].join('/'))

    })

    it('should throw if the path is incorrect or does not exist', async function () {

      let root = initARootNode()
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

    it('should throw if looking for last ancestor and find existent node', async function () {

      let root = initARootNode()
      let dir1 = initRandomNode(D, secrez)
      let dir2 = initRandomNode(D, secrez)
      let dir3 = initRandomNode(D, secrez)
      let dir4 = initRandomNode(D, secrez)
      let file1 = initRandomNode(F, secrez)

      root.add(dir1)
      dir1.add(dir2)
      dir2.add(dir3)
      dir3.add(dir4)
      dir4.add(file1)

      let p
      p = [dir3.getName(), dir4.getName()].join('/')

      try {
        dir2.getChildFromPath(p, true)
        assert.isTrue(false)
      } catch (e) {
        assert.equal(e.message, util.format(ENTRY_EXISTS,dir4.getName()))
      }

    })

  })


  describe('#getPathToChild', async function () {

    beforeEach(async function () {
      await fs.emptyDir(path.resolve(__dirname, '../tmp/test'))
      secrez = new Secrez()
      await secrez.init(rootDir)
      await secrez.signup(password, iterations)
    })

    it('should find a node starting from a path', async function () {

      let root = initARootNode()
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
      assert.equal(root.getPathToChild(file2), p)

      p = [dir3.getName(), file2.getName()].join('/')
      assert.equal(dir2.getPathToChild(file2), p)

      p = [file2.getName()].join('/')
      assert.equal(dir3.getPathToChild(file2), p)

    })

    it('should throw if child is not a Node', async function () {

      let root = initARootNode()

      try {
        root.getPathToChild(new Object())
        assert.isTrue(false)
      } catch (e) {
        assert.equal(e.message, 'The child is not a Node')
      }


    })

    it('should throw if child belows to another tree', async function () {

      let root = initARootNode()
      let root2 = initARootNode()
      let dir1 = initRandomNode(D, secrez)
      let file1 = initRandomNode(F, secrez)

      root.add(dir1)
      dir1.add(file1)
      //
      // console.log(root.findChildById('tra$'))

      try {
        root2.getPathToChild(file1)
        assert.isTrue(false)
      } catch (e) {
        assert.equal(e.message, 'The child does not below to this tree')
      }


    })


  })

  describe('#findDirectChildByName && #findChildById', async function () {

    beforeEach(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
      await secrez.signup(password, iterations)
    })

    it('should find a direct child by name and by id', async function () {

      let root = initARootNode()
      let dir1 = initRandomNode(D, secrez)
      let dir2 = initRandomNode(D, secrez)
      let file1 = initRandomNode(F, secrez)

      root.add(dir1)
      dir1.add(dir2)
      dir2.add(file1)
      assert.equal(dir1.findChildById(file1.id).getName(), file1.getName())
      assert.equal(dir2.findDirectChildByName(file1.getName()).getName(), file1.getName())

    })

    it('should throw if looking for child of a file', async function () {

      let root = initARootNode()
      let dir1 = initRandomNode(D, secrez)
      let file1 = initRandomNode(F, secrez)
      root.add([file1, dir1])

      try {
        file1.findChildById()
        assert.isTrue(false)
      } catch (e) {
        assert.equal(e.message, 'A file does not have children')
      }

      try {
        file1.findDirectChildByName(dir1.getName())
        assert.isTrue(false)
      } catch (e) {
        assert.equal(e.message, 'A file does not have children')
      }


    })

    it('should throw if looking for child of a file', async function () {

      let root = initARootNode()
      let dir1 = initRandomNode(D, secrez)
      let file1 = initRandomNode(F, secrez)
      root.add([file1, dir1])

      try {
        dir1.findChildById()
        assert.isTrue(false)
      } catch (e) {
        assert.equal(e.message, 'Id parameter is missing')
      }

      try {
        dir1.findDirectChildByName()
        assert.isTrue(false)
      } catch (e) {
        assert.equal(e.message, 'Name parameter is missing')
      }


    })

  })

})
