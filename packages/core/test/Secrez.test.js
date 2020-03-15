const chai = require('chai')
const assert = chai.assert
const path = require('path')
const homedir = require('homedir')
const Secrez = require('../src/Secrez')
const Crypto = require('../src/utils/Crypto')
const utils = require('../src/utils')
const Entry = require('../src/Entry')
const fs = require('fs-extra')
const config = require('../src/config')

// eslint-disable-next-line no-unused-vars
const jlog = require('./helpers/jlog')

const {
  password,
  iterations,
  hash23456iterationsNoSalt
} = require('./fixtures')

describe('#Secrez', function () {

  let rootDir = path.resolve(__dirname, '../tmp/test/.secrez')

  let secrez
  let masterKey

  const D = config.types.DIR
  const F = config.types.FILE


  describe('default secrez dir', function () {

    before(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init()
    })

    it('should use the default ~/.secrez folder', async function () {

      assert.equal(config.secrez.dataPath, homedir() + '/.secrez/data')
      assert.equal(config.secrez.localWorkingDir, homedir())
    })

  })


  describe('custom (testing) secrez dir', function () {

    before(async function () {
      await fs.emptyDir(rootDir)
      secrez = new Secrez()
      await secrez.init(rootDir)
    })

    describe('derivePassword', async function () {

      it('should derive a password and obtain a predeterminded hash', async function () {
        let derivedPassword = await secrez.derivePassword(password, iterations)
        assert.equal(Crypto.b58Hash(derivedPassword), hash23456iterationsNoSalt)
      })

    })

    describe('signup and signin', async function () {

      beforeEach(async function () {
        await fs.emptyDir(rootDir)
        config.secrez = {}
        secrez = new Secrez()
      })

      it('should signup the user and signin without saving the iterations', async function () {
        await secrez.init(rootDir)
        await secrez.signup(password, iterations)
        assert.isTrue(fs.existsSync(config.secrez.confPath))
        masterKey = secrez.masterKey
        secrez.signout()
        assert.isUndefined(secrez.masterKey)
        await secrez.signin(password, iterations)
        assert.isTrue(utils.secureCompare(masterKey, secrez.masterKey))
      })

      it('should signup the user and signin saved the iterations', async function () {
        await secrez.init(rootDir)
        await secrez.signup(password, iterations, true)
        assert.isTrue(fs.existsSync(config.secrez.confPath))
        assert.isTrue(fs.existsSync(config.secrez.envPath))
        let masterKey = secrez.masterKey
        secrez.signout()
        assert.isUndefined(secrez.masterKey)
        await secrez.signin(password)
        assert.isTrue(utils.secureCompare(masterKey, secrez.masterKey))

      })

      describe('should throw an error', async function () {

        it('trying to signup if Secrez has not been initiated', async function () {
          try {
            await secrez.signup(password, iterations)
            assert.isFalse(true)
          } catch (e) {
            assert.equal(e.message, 'Secrez not initiated')
          }
        })

        it('trying to signin if Secrez has not been initiated', async function () {
          try {
            await secrez.signin(password, iterations)
            assert.isFalse(true)
          } catch (e) {
            assert.equal(e.message, 'Secrez not initiated')
          }
        })

        it('trying to signup if account already exists', async function () {
          await secrez.init(rootDir)
          await secrez.signup(password, iterations)
          try {
            await secrez.signup(password, iterations)
            assert.isFalse(true)
          } catch (e) {
            assert.equal(e.message, 'An account already exists. Please, sign in or chose a different container directory')
          }
        })

        it('trying to signin if account is not set yet', async function () {
          await secrez.init(rootDir)
          try {
            await secrez.signin(password, iterations)
            assert.isFalse(true)
          } catch (e) {
            assert.equal(e.message, 'Account not set yet')
          }
        })

        it('trying to signin with missed iterations', async function () {
          await secrez.init(rootDir)
          await secrez.signup(password, iterations)
          try {
            await secrez.signin(password)
            assert.isFalse(true)
          } catch (e) {
            assert.equal(e.message, 'Iterations is missed')
          }
        })

        it('trying to signin with the wrong password', async function () {
          await secrez.init(rootDir)
          await secrez.signup(password, iterations)
          try {
            await secrez.signin('wrongPassword', iterations)
            assert.isFalse(true)
          } catch (e) {
            assert.equal(e.message, 'Wrong password or wrong number of iterations')
          }
        })

        it('trying to signin with the right password but wrong number of iterations', async function () {
          await secrez.init(rootDir)
          await secrez.signup(password, iterations)
          try {
            await secrez.signin(password, iterations - 1)
            assert.isFalse(true)
          } catch (e) {
            assert.equal(e.message, 'Wrong password or wrong number of iterations')
          }
        })

        it('trying to signin with the right password but using a wrong hash on file', async function () {
          await secrez.init(rootDir)
          await secrez.signup(password, iterations)
          let conf = require(config.secrez.confPath)
          conf.data.hash = hash23456iterationsNoSalt
          await fs.writeFile(config.secrez.confPath, JSON.stringify(conf))
          try {
            await secrez.signin(password, iterations)
            assert.isFalse(true)
          } catch (e) {
            assert.equal(e.message, 'Hash on file does not match the master key')
          }
        })

        it('trying to sign out if never signed-in', async function () {
          await secrez.init(rootDir)
          try {
            secrez.signout()
            assert.isFalse(true)
          } catch (e) {
            assert.equal(e.message, 'User not logged')
          }
        })
      })
    })

    describe('encryptItem and decryptItem', async function () {

      beforeEach(async function () {
        await fs.emptyDir(rootDir)
        config.secrez = {}
        secrez = new Secrez()
        await secrez.init(rootDir)
      })

      it('should encrypt a name and decrypt it', async function () {
        await secrez.signup(password, iterations)
        let name = 'some random data'
        let id = Crypto.getRandomId()
        let encryptedData = secrez.encryptItem(new Entry({id, type: D, name, preserveContent: true}))
        let decryptedData = secrez.decryptItem(encryptedData)
        assert.equal(name, decryptedData.name)
        assert.equal(id, decryptedData.id)
      })

      it('should encrypt a very long name and decrypt it', async function () {
        await secrez.signup(password, iterations)
        let name = '山东恒美百特新能源环保设备有限公司是国内大型的新能源环保设备制造商，注册商标“恒美百特”。公司集研发、生产、销售、服务四位于'
        let id = Crypto.getRandomId()
        let encryptedData = secrez.encryptItem(new Entry({id, type: D, name, preserveContent: true}))
        let decryptedData = secrez.decryptItem(encryptedData)
        assert.equal(name, decryptedData.name)
        assert.equal(id, decryptedData.id)
      })

      it('should encrypt name and content and decrypt it', async function () {
        await secrez.signup(password, iterations)
        let name = 'some random data'
        let content = 'some random content'
        let id = Crypto.getRandomId()
        let encryptedData = secrez.encryptItem(new Entry({id, type: F, name, content}))
        encryptedData.preserveContent = true
        assert.equal(name, secrez.decryptItem(encryptedData).name)
        assert.equal(content, secrez.decryptItem(encryptedData).content)
      })

      it('should encrypt only the content and decrypt it', async function () {
        await secrez.signup(password, iterations)
        let content = 'some random content'
        let id = Crypto.getRandomId()
        let encryptedData = secrez.encryptItem(new Entry({id, type: F, content}))
        encryptedData.preserveContent = true
        // jlog(encryptedData)
        assert.equal(content, secrez.decryptItem(encryptedData).content)
      })


      it('should re-encrypt the content and decrypt it', async function () {
        await secrez.signup(password, iterations)
        let name = 'some random data'
        let content = 'some random content'
        let id = Crypto.getRandomId()
        let item = new Entry({
          id,
          type: F,
          name,
          content
        })
        let encryptedData = secrez.encryptItem(item)
        let decryptedData = secrez.decryptItem(encryptedData)
        assert.equal(name, decryptedData.name)
        assert.equal(content, decryptedData.content)
        content = 'some modified content'
        encryptedData = secrez.encryptItem(new Entry({id, type: F, name, content}))
        decryptedData = secrez.decryptItem(encryptedData)
        assert.equal(name, decryptedData.name)
        assert.equal(content, decryptedData.content)
      })

      it('should throw if the user is not logged in', async function () {
        try {
          let data = new Entry()
          secrez.encryptItem(data)
          assert.isFalse(true)
        } catch (e) {
          assert.equal(e.message, 'User not logged')
        }

        try {
          secrez.decryptItem(new Entry({name: 'some encrypted data'}))
          assert.isFalse(true)
        } catch (e) {
          assert.equal(e.message, 'User not logged')
        }
      })

      it('should throw if wrong type', async function () {
        try {
          await secrez.signup(password, iterations)
          let name = 'some random data'
          let content = 'some random content'
          let id = Crypto.getRandomId()
          let item = new Entry({
            id,
            type: 3,
            name,
            content
          })
          secrez.encryptItem(item)
          assert.isFalse(true)
        } catch (e) {
          assert.equal(e.message, 'Unsupported type')
        }
      })

      it('should throw if encrypted data are corrupted', async function () {
        try {
          await secrez.signup(password, iterations)
          let name = 'some random data'
          let id = Crypto.getRandomId()
          let item = new Entry({
            id,
            type: 1,
            name
          })
          let encryptedData = secrez.encryptItem(item)
          encryptedData.encryptedName = encryptedData.encryptedName.substring(0, encryptedData.encryptedName.length - 10) + 'SANqTUj5gj'
          secrez.decryptItem(encryptedData)
          assert.isFalse(true)
        } catch (e) {
          assert.equal(e.message, 'Fatal error during decryption')
        }
      })

      it('should throw if content has not the same id of the name', async function () {
        try {
          await secrez.signup(password, iterations)
          let name = 'some random data'
          let content = 'some random content'
          let id = Crypto.getRandomId()
          let encryptedData = secrez.encryptItem(new Entry({id, type: F, name}))
          id = Crypto.getRandomId([id])
          let encryptedData2 = secrez.encryptItem(new Entry({id, type: F, content}))
          encryptedData.encryptedContent = encryptedData2.encryptedContent
          secrez.decryptItem(encryptedData)
          assert.isFalse(true)
        } catch (e) {
          assert.equal(e.message, 'Data is corrupted')
        }
      })

      it('should throw if parameters are missed', async function () {
        try {
          await secrez.signup(password, iterations)
          secrez.decryptItem(new Entry())
          assert.isFalse(true)
        } catch (e) {
          assert.equal(e.message, 'Missing parameters')
        }
      })
    })
  })

})
