const chai = require('chai')
const assert = chai.assert
const fs = require('fs-extra')
const path = require('path')
const {Secrez} = require('@secrez/core')

const FileCipher = require('../src/FileCipher')

describe('#FileCipher', function () {

  let secrez, secrez2
  let fileCipher, fileCipher2
  let container = path.resolve(__dirname, '../tmp/test/.secrez')
  let localDir = path.resolve(__dirname, '.')
  let somePassword = 'I have seen the double green light'

  before(async function () {
    await fs.emptyDir(container)
    secrez = new (Secrez())
    await secrez.init(container, localDir)
    await secrez.signup(somePassword, 1000)
    fileCipher = new FileCipher(secrez)

    let currDir = container + 1
    await fs.emptyDir(currDir)
    secrez2 = new (Secrez())
    await secrez2.init(currDir)
    await secrez2.signup(somePassword, 1000)
    fileCipher2 = new FileCipher(secrez2)
  })

  describe('encrypt/decrypt external file', async function () {

    let content = 'Some secret content'

    it('should encrypt a file using a specific password', async function () {
      let password = 'some unique weirdness'

      let encryptedContent = fileCipher.encryptFile(content, {password})
      assert.equal(fileCipher.decryptFile(encryptedContent, {password}), content)
    })


    it('should encrypt a file using a shared key', async function () {

      let publicKey0 = secrez2.getPublicKey()

      let encryptedContent = fileCipher.encryptFile(content, {
            publicKeys: [publicKey0]
          })

      assert.equal(fileCipher2.decryptFile(encryptedContent, {
        contactsPublicKeys: [secrez.getPublicKey()]
      }), content)

      assert.equal(fileCipher2.decryptFile(encryptedContent, {
        contactPublicKey: secrez.getPublicKey()
      }), content)

    })

    it('should encrypt a file using user\'s own public key', async function () {


      let encryptedContent = fileCipher.encryptFile(content, {
            publicKeys: [secrez.getPublicKey()]
          })

      assert.equal(fileCipher.decryptFile(encryptedContent, {}), content)

    })

  })

})
