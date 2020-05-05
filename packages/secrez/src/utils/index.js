const _ = require('lodash')
const YAML = require('yaml')
const path = require('path')

const utils = {

  yamlParse: str => {
    try {
      return YAML.parse(str)
    } catch (e) {
      throw new Error('Cannot parse a malformed yaml')
    }
  },

  yamlStringify: obj => {
    return YAML.stringify(obj)
  },

  isYaml: filepath => {
    try {
      let ext = path.extname(filepath)
      return /^\.y(a|)ml$/i.test(ext)
    } catch (e) {
      return false
    }
  }

}

module.exports = utils
