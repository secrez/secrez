const chai = require('chai')
const assert = chai.assert
const path = require('path')
const homedir = require('homedir')
const Secrez = require('../../src/Secrez')
const Crypto = require('../../src/utils/Crypto')
const fs = require('fs-extra')
const config = require('../../src/config')
const helpers = require('../helpers')

// eslint-disable-next-line no-unexpected-multiline
(async function () {

  let password = 'some test password'
  let iterations = 23456
  let hash23456iterations = '2hy1HzfcCCoNacowjY67LvgPXUyNFwjAGuuMcieVcAJY'
  let rootDir = path.resolve(__dirname, '../../fixtures/secrezFs')

  await fs.emptyDir(rootDir)
  let secrez = new Secrez()
  await secrez.init(rootDir)
  await secrez.signup(password, iterations)
  let masterKey = secrez.masterKey

  assert.isUndefined(secrez.masterKey)
  await secrez.signin(password, iterations)
  assert.isTrue(helpers.bufferEquals(masterKey, secrez.masterKey))



})()
