
const config = {

  onlyDir: 1,
  onlyFile: 2,

  types: {
    ROOT: 0,
    DIR: 1,
    TEXT: 2,
    BINARY: 3,
    TRASH: 4,
    TAGS: 5
  },

  specialId: {
    ROOT: 'rOOt',
    TRASH: 'tra$'
  },

  specialName: {
    TRASH: '.trash'
  },

  secrez: {}

}

module.exports = config
