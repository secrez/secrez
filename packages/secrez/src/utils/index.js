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

  fromCsvToJson: (csv, delimiter = ',', skipEmpty = true) => {
    csv = csv.split('\n')
    let firstLine = csv[0]
    try {
      firstLine = parse(firstLine)[0].map(e => Case.snake(_.trim(e)))
    } catch (e) {
      throw new Error('The CSV is malformed')
    }
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
    let json = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      delimiter,
      skip_lines_with_error: true,
      trim: true
    })
    if (skipEmpty) {
      json = json.map(e => {
        let elem = {}
        for (let key in e) {
          if (e[key]) {
            elem[key] = e[key]
          }
        }
        return elem
      })
    }
    return json
  }

}

module.exports = utils
