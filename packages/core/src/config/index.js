
const config = {

  onlyDir: 1,
  onlyFile: 2,

  types: {
    ROOT: 0,
    DIR: 1,
    TEXT: 2,
    BINARY: 3,
    TRASH: 4,
    TAGS: 5,
    NAME: 6
  },

  specialId: {
    ROOT: 'rOOt',
    TRASH: 'tra$',
    RECOVERED: '$rec',
    NAME: '$nam'
  },

  specialName: {
    TRASH: '.trash',
    RECOVERED: 'REC'
  },

  sharedKeys: {
    UTF_KEY: 1,
    EMERGENCY_CODE: 2
  },

  secrez: {}

}

module.exports = config
