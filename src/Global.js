const _ = require('lodash')

class Global {

  constructor(data = {}) {
    this.initialData = _.clone(data)
    this.data = data || {}
  }

  set(...options) {
    if (options && options[1] === 'all') {
      delete this.data[options[0]]
    } else if (typeof options[0] === 'object') {
      this.data = Object.assign(this.data, options)
    } else if (typeof options[1] !== 'undefined') {
      this.data[options[0]] = options[1]
    }
  }

  del(what) {
    delete this.data[what]
  }

  reset() {
    this.data = this.initialData || {}
  }

  get(what) {
    return what ? this.data[what] : this.data
  }

}

module.exports = Global
