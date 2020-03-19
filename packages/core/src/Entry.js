class Entry {

  isValid(option) {
    return this.validOptions.includes(option)
  }

  constructor(options) {

    this.validOptions = [
      'type',
      'id',
      'ts',
      'scrambledTs',
      'name',
      'content',
      'encryptedName',
      'encryptedContent',
      'microseconds',
      'extraName',
      'nameId',
      'nameTs',
      'preserveContent',
      'parent'
    ]

    this.set(options)
  }

  get(options = this.validOptions) {
    let obj = {}
    for (let o of options) {
      if (this.isValid(o) && typeof this[o] !== 'undefined') {
        obj[o] = this[o]
      }
    }
    return obj
  }

  set(key, value) {
    let options = {}
    if (typeof key === 'object') {
      options = key
    } else {
      options[key] = value
    }
    for (let o in options) {
      if (this.isValid(o) && typeof options[o] !== 'undefined') {
        this[o] = options[o]
      }
    }
  }

  unset(options = []) {
    if (!Array.isArray(options)) {
      options = [options]
    }
    for (let o of options) {
      if (this.isValid(o) && typeof this[o] !== 'undefined') {
        delete this[o]
      }
    }
  }

}


module.exports = Entry
