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

const config = Object.assign(require('@secrez/core').config, {
  completion: {
    help: {}
  },
  completionTypes
})

module.exports = config
