
const config = {

  onlyDir: 1,
  onlyFile: 2,

  types: {
    ROOT: 0,
    DIR: 1,
    TEXT: 2,
    BINARY: 3,
    TAGS: 5,
    NAME: 6
  },

  specialId: {
    ROOT: 'rOOt',
    RECOVERED: '$rec',
    NAME: '$nam'
  },

  specialName: {
    RECOVERED: 'REC'
  },

  sharedKeys: {
    FIDO2_KEY: 1,
     RECOVERY_CODE: 2
  },

  secrez: {},

  VERSION: 3

}

module.exports = config
