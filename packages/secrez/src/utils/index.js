const _ = require('lodash')
const YAML = require('yaml')
const path = require('path')
const parse = require('csv-parse/lib/sync')
const Case = require('case')

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
  },

  fromCsvToJson: async (csv, delimiter = ',') => {
    csv = csv.split('\n')
    let firstLine = csv[0]
    firstLine = parse(firstLine)[0].map(e => Case.snake(_.trim(e)))
    let havePath = false
    for (let e of firstLine) {
      if (!/^[a-z]{1}[a-z0-9_]*$/.test(e)) {
        throw new Error('The header of the CSV looks wrong')
      }
      if (e === 'path') {
        havePath = true
      }
    }
    if (!havePath) {
      throw new Error('A "path" column in mandatory')
    }
    csv[0] = firstLine.join(',')
    csv = csv.join('\n')
    csv = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      delimiter,
      skip_lines_with_error: true,
      trim: true
    })
    return csv
  }

}

module.exports = utils
