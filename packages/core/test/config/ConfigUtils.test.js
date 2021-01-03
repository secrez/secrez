const chai = require('chai')
const assert = chai.assert

const ConfigUtils = require('../../src/config/ConfigUtils')
const Secrez = require('../../src/Secrez')(Math.random())
const fs = require('fs-extra')
const path = require('path')
const {execAsync} = require('@secrez/utils')

const {
  password,
  iterations
} = require('../fixtures')


describe('#ConfigUtils', function () {

  let rootDir = path.resolve(__dirname, '../tmp/test/.secrez')

  before(async function () {
    await fs.emptyDir(rootDir)
  })

  it('should check if a type is valid', async function () {

    const config = require('../../src/config')
    assert.equal(ConfigUtils.isValidType(config.types.TEXT), true)
    assert.equal(ConfigUtils.isValidType(99), false)
  })

  it('#setSecrez should configure a secrez environment', async function () {

    const config = require('../../src/config')
    let conf = await ConfigUtils.setSecrez(config, rootDir)
    assert.equal(conf.dataPath, path.join(rootDir, 'data'))

  })

  it('#setAndGetDataset should set and get a secondary db', async function () {

    let config = require('../../src/config')
    config = await ConfigUtils.setSecrez(config, rootDir)
    let dataDir = await ConfigUtils.setAndGetDataset(config, 1)
    assert.equal(dataDir, path.join(rootDir, 'data.1'))

    dataDir = await ConfigUtils.setAndGetDataset(config, 1)
    assert.equal(dataDir, path.join(rootDir, 'data.1'))

    dataDir = await ConfigUtils.setAndGetDataset(config, 2)
    assert.equal(dataDir, path.join(rootDir, 'data.2'))

    try {
      dataDir = await ConfigUtils.setAndGetDataset(config, 10)
      assert.isTrue(false)

    } catch(e) {
      assert.equal(e.message, 'Wrong data index')
    }

  })

  it('#deleteDataset should delete a dataset path', async function () {

    let config = require('../../src/config')
    config = await ConfigUtils.setSecrez(config, rootDir)
    let dataPath = await ConfigUtils.setAndGetDataset(config, 1)
    assert.equal(dataPath, path.join(rootDir, 'data.1'))
    assert.isTrue(await fs.pathExists(dataPath))

    assert.isTrue(await ConfigUtils.deleteDataset(config, 1))
    assert.isFalse(await fs.pathExists(dataPath))

  })

  it('#getDatasetPath should get a dataset path', async function () {

    let config = require('../../src/config')
    config = await ConfigUtils.setSecrez(config, rootDir)
    let dataPath = await ConfigUtils.getDatasetPath(config, 1)
    assert.equal(dataPath, path.join(rootDir, 'data.1'))

  })

  it('#getEnv should return the environment', async function () {

    let secrez = new Secrez()
    await secrez.init(rootDir)
    await secrez.signup(password, iterations)
    await secrez.saveIterations(iterations)

    let env = await ConfigUtils.getEnv(secrez.config)
    assert.equal(env.iterations, iterations)

    await execAsync('rm', rootDir, ['local/env.json'])
    env = await ConfigUtils.getEnv(secrez.config)
    assert.equal(Object.keys(env).length, 0)

  })

})
