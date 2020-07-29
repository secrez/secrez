const assert = require('chai').assert
const stdout = require('test-console').stdout
const fs = require('fs-extra')
const path = require('path')
const MainPrompt = require('../mocks/MainPromptMock')
const {assertConsole, noPrint, decolorize} = require('../helpers')

const {
  password,
  iterations
} = require('../fixtures')

// eslint-disable-next-line no-unused-vars
const jlog = require('../helpers/jlog')

describe('#Tag', function () {

  let prompt
  let rootDir = path.resolve(__dirname, '../../tmp/test/.secrez')
  let inspect, C

  let options = {
    container: rootDir,
    localDir: __dirname
  }

  beforeEach(async function () {
    await fs.emptyDir(path.resolve(__dirname, '../../tmp/test'))
    prompt = new MainPrompt
    await prompt.init(options)
    C = prompt.commands
    await prompt.secrez.signup(password, iterations)
    await prompt.internalFs.init()

  })

  it('should return the help', async function () {

    inspect = stdout.inspect()
    await C.tag.exec({help: true})
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/-h, --help/.test(output[4]))

  })

  it('should tag a file', async function () {

    await noPrint(C.touch.exec({
      path: '/f1'
    }))

    inspect = stdout.inspect()
    await C.tag.exec({
      path: '/f1',
      add: ['email']
    })
    inspect.restore()
    assertConsole(inspect, ['Tag added'])

    await noPrint(C.touch.exec({
      path: '/f2'
    }))

    inspect = stdout.inspect()
    await C.tag.exec({
      path: '/f2',
      add: ['email', 'web']
    })
    inspect.restore()
    assertConsole(inspect, ['Tags added'])

    inspect = stdout.inspect()
    await C.tag.exec({
      path: '/f*',
      add: ['wildcard']
    })
    inspect.restore()
    assertConsole(inspect, ['Tag added'])
    assert.equal(prompt.internalFs.tree.tags.content['wildcard'].length, 2)

  })


  it('should remove a tag', async function () {

    await noPrint(C.touch.exec({
      path: '/f2'
    }))

    await noPrint(C.tag.exec({
      path: '/f2',
      add: ['email', 'web']
    }))

    // console.log(1)
    inspect = stdout.inspect()
    await C.tag.exec({
      path: '/f2',
      remove: ['email']
    })
    inspect.restore()
    assertConsole(inspect, ['Tag removed'])

    // console.log(2)

    await noPrint(C.tag.exec({
      path: '/f2',
      add: ['email']
    }))

    // console.log(3)

    inspect = stdout.inspect()
    await C.tag.exec({
      path: '/f2',
      remove: ['email', 'web']
    })
    inspect.restore()
    assertConsole(inspect, ['Tags removed'])

  })

  it('should list all the tags', async function () {

    await noPrint(C.touch.exec({
      path: '/f1'
    }))

    await noPrint(C.tag.exec({
      path: '/f1',
      add: ['email']
    }))

    await noPrint(C.touch.exec({
      path: '/f2'
    }))

    await noPrint(C.tag.exec({
      path: '/f2',
      add: ['email', 'web', 'eth']
    }))

    await noPrint(C.touch.exec({
      path: '/f3'
    }))

    await noPrint(C.tag.exec({
      path: '/f3',
      add: ['web']
    }))

    inspect = stdout.inspect()
    await C.tag.exec({
      list: true
    })
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/email \(2\)/.test(output[0]))
    assert.isTrue(/web \(2\)/.test(output[0]))
    assert.isTrue(/eth \(1\)/.test(output[0]))

    inspect = stdout.inspect()
    await C.tag.exec({})
    inspect.restore()
    output = inspect.output.map(e => decolorize(e))
    assert.isTrue(/email \(2\)/.test(output[0]))

  })

  it('should show the file tagged as', async function () {

    await noPrint(C.touch.exec({
      path: '/f1'
    }))

    await noPrint(C.tag.exec({
      path: '/f1',
      add: ['email']
    }))

    await noPrint(C.touch.exec({
      path: '/f2'
    }))

    await noPrint(C.tag.exec({
      path: '/f2',
      add: ['email', 'web', 'eth']
    }))

    await noPrint(C.touch.exec({
      path: '/f3'
    }))

    await noPrint(C.tag.exec({
      path: '/f3',
      add: ['web']
    }))

    inspect = stdout.inspect()
    await C.tag.exec({
      show: ['email']
    })
    inspect.restore()
    assertConsole(inspect, ['/f1  email', '/f2  email eth web'])


    inspect = stdout.inspect()
    await C.tag.exec({
      show: ['email', 'web']
    })
    inspect.restore()
    assertConsole(inspect, ['/f2  email eth web'])

    inspect = stdout.inspect()
    await C.tag.exec({
      show: ['office']
    })
    inspect.restore()
    assertConsole(inspect, ['Tagged files not found'])

    await noPrint(C.tag.exec({
      find: 'f',
      add: ['some']
    }))

    inspect = stdout.inspect()
    await C.tag.exec({
      show: ['some']
    })
    inspect.restore()
    assertConsole(inspect, [
      '/f1  email some',
      '/f2  email eth some web',
      '/f3  some web'
    ])

    await noPrint(C.use.exec({
      dataset: 'archive',
      create: true
    }))

    await noPrint(C.touch.exec({
      path: 'archive:/folder/bingo'
    }))

    await noPrint(C.use.exec({
      dataset: 'restore',
      create: true
    }))

    await noPrint(C.touch.exec({
      path: 'restore:/folder/bingo'
    }))

    await noPrint(C.tag.exec({
      find: ':bingo',
      add: ['bingo']
    }))

    inspect = stdout.inspect()
    await C.tag.exec({
      list: true,
      global: true
    })
    inspect.restore()
    assertConsole(inspect, [
      'main',
      'email (2)    eth (1)      some (3)     web (2)',
      'archive',
      'bingo (1)',
      'restore',
      'bingo (1)'
    ])

    inspect = stdout.inspect()
    await C.tag.exec({
      show: ['bingo'],
      global: true
    })
    inspect.restore()
    assertConsole(inspect, [
      'archive:/folder/bingo  bingo',
      'restore:/folder/bingo  bingo'
    ])

  })

  it('should show very long file tagged as', async function () {

    let paths = [
      '/folder very very long/and folder/very very very long/and file very very very very very very very very very very long/and folder/very very very long/and file very very very very very very very very very very long/and folder/very very very long/and file very very very very very very very very very very long/and folder/very very very long/and file very very very very very very very very very very long',
      '/folder very very much long/and folder/very very very long/and file very very very very very very very very very very long and more',
      '/folder very very much long/and folder/very very very long/and file quite long',
      '/folder very very much long/short',
      '/folder/file'
    ]

    let tags = 'uno due tre some_very_very_long_tag another_long_tag and_some_more_long some_short short a b much_shorter'.split(' ')

    let c = tags.length
    for (let p of paths) {
      await noPrint(C.touch.exec({
        path: p
      }))

      await noPrint(C.tag.exec({
        path: p,
        add: tags.slice(0, c).concat(['t' + c])
      }))
      c -= 2
    }

    inspect = stdout.inspect()
    await C.tag.exec({
      show: ['t3']
    })
    inspect.restore()
    assertConsole(inspect, ['/folder/file  due t3 tre uno'])


    inspect = stdout.inspect()
    await C.tag.exec({
      show: ['uno']
    })
    inspect.restore()
    let output = inspect.output.map(e => decolorize(e))[0].split('\n')
    assert.equal(output[0], paths[0])
    assert.equal(output[1], tags.concat('t'+ tags.length).sort().join(' '))

  })

})

