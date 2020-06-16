const _ = require('lodash')
const {Crypto, config, Entry} = require('@secrez/core')
const Node = require('../../src/Node')

const helpers = {


  jsonEqual: (j, k) => {

    j = _.clone(j)
    k = _.clone(k)

    if (j.id !== k.id) return false
    if (j.v.length !== k.v.length) return false
    if (j.v) {
      j.v.sort()
      k.v.sort()
      for (let i = 0; i < j.v.length; i++) {
        if (j.v[i] !== k.v[i]) return false
      }
    }
    if ((j.c || k.c) && j.c.length !== k.c.length) return false
    if (j.c) {
      const s = (a, b) => {
        let A = a.v.sort()[0] || '_'
        let B = b.v.sort()[0] || '_'
        return A > B ? 1 : A < B ? -1 : 0
      }
      j.c.sort(s)
      k.c.sort(s)
      for (let i = 0; i < j.c.length; i++) {
        if (!helpers.jsonEqual(j.c[i], k.c[i])) return false
      }
    }

    return true

  },

  initRandomNode: (type, secrez, getEntry, name, content) => {
    let entry = new Entry({
      id: Crypto.getRandomId(),
      name: name || Crypto.getRandomBase58String(16),
      type,
      preserveContent: true
    })
    if (content) {
      entry.content = content
    }
    entry = secrez.encryptEntry(entry)
    if (getEntry) {
      return [entry, new Node(entry)]
    }
    return new Node(entry)
  },

  initRandomEntry: (type) => {
    return new Entry({
      id: Crypto.getRandomId(),
      name: Crypto.getRandomBase58String(16),
      type,
      preserveContent: true
    })
  },

  setNewNodeVersion: (entry, node, secrez) => {
    entry.set({
      id: node.id,
      type: node.type,
      preserveContent: true
    })
    entry = secrez.encryptEntry(entry)
    // entry.set({
    //   ts: Crypto.unscrambleTimestamp(entry.scrambledTs, entry.microseconds)
    // })
    return entry
  },

  initARootNode: () => {
    let root = new Node(new Entry({
      type: config.types.ROOT
    }))
    // root.add(new Node(
    //     new Entry({
    //       type: config.types.TRASH
    //     }), true
    // ))
    return root
  },

  sleep: millis => {
    return new Promise(resolve => setTimeout(resolve, millis))
  }


}


module.exports = helpers
