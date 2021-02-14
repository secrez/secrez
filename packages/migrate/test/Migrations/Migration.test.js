const chai = require('chai')
const assert = chai.assert
const fs = require('fs-extra')
const path = require('path')
const Migration = require('../../src/migrations/Migration')

describe('#Migrations', function () {

  const tmpDir = path.resolve(__dirname, '../../tmp/test')
  const secrezVer1Password = 'some pass'
  const secrezVerIterations = 1e3

  beforeEach(async function () {
    await fs.emptyDir(tmpDir)
    await fs.copy(path.resolve(__dirname, '../fixtures/secrez-10'), path.resolve(tmpDir, 'secrez-ver1'))
  })

  describe('#configuration', async function () {

    it('should verify that all the scripts exist', async function () {
      assert.isTrue(await fs.pathExists(path.join(fido2Client.scriptsPath, 'fido2_credential.py')))
      assert.isTrue(await fs.pathExists(path.join(fido2Client.scriptsPath, 'hmac_secret.py')))
      assert.isTrue(await fs.pathExists(path.join(fido2Client.scriptsPath, 'is_fido2_ready.py')))
    })
  })

})

