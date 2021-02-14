const TRUE = 1
const STRING = 2
const ARRAY = 3
const NUMBER = 4
const BOOL = 5
const OBJECT = 6

const completionTypes = {
  TRUE,
  STRING,
  ARRAY,
  NUMBER,
  BOOL,
  OBJECT
}

const cliConfig = Object.assign(require('secrez-core-0-8-2').config, {
  completion: {
    help: {}
  },
  chatCompletion: {
    help: {}
  },
  completionTypes
})

module.exports = cliConfig
