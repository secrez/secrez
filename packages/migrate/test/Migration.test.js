// const stdout = require('test-console').stdout
// const chai = require('chai')
// const assert = chai.assert
// const fs = require('fs-extra')
// const path = require('path')
// const {Prompt: MainPrompt} = require('secrez-0-10-8')
// const Migration = require('../src/migrations/Migration')
// // const {assertConsole, noPrint, decolorize} = require('@secrez/test-helpers')
//
// describe('#Migration', async function () {
//
//   const password = 'c'
//   const iterations = 1e3
//
//   let testDir = path.resolve(__dirname, '../tmp/test')
//   let container = path.join(testDir, 'secrez-10')
//
//   let options = {
//     container
//   }
//
//   beforeEach(async function () {
//     await fs.emptyDir(testDir)
//     await fs.copy(path.resolve(__dirname, 'fixtures/secrez-10'), container)
//   })
//
//   it('should migrate a db and verify that the two databases are the same', async function () {
//
//     let mainPrompt = new MainPrompt
//     await mainPrompt.init(options)
//     await mainPrompt.secrez.signin(password, iterations)
//     await mainPrompt.internalFs.init()
//     let C = mainPrompt.commands
//
//     let list = (await C.ls.ls({})).sort()
//     assert.equal(list.join(','), 'file,fileV2.tar.gz,folder/')
//
//     let tags = await C.tag.tag({list: true})
//     assert.equal(tags.join(','), 'dir_good (1),what (3)')
//
//     // let alias = await C.alias.alias({list: true})
//     // console.log(alias)
//
//     let migration = new Migration(mainPrompt, path.resolve(testDir, 'secrez-migrate'))
//     assert.isTrue(await migration.isMigrationNeeded())
//     await migration.migrate(password, iterations, true)
//
//
//   })
//
//
// })
//
