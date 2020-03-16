const {Crypto, config, Entry} = require('@secrez/core')
const Node = require('../../src/Node')

const helpers = {


  compareJson: (j, k) => {


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
        let A = a.v.sort()[0]
        let B = b.v.sort()[0]
        return A > B ? 1 : A < B ? -1 : 0
      }
      j.c.sort(s)
      k.c.sort(s)
      for (let i = 0; i < j.c.length; i++) {
        if (!helpers.compareJson(j.c[i], k.c[i])) return false
      }
    }

    return true

  },

  initRandomNode: (type, secrez, getEntry) => {
    let entry = new Entry({
      id: Crypto.getRandomId(),
      name: Crypto.getRandomId() + Crypto.getRandomId(),
      type,
      preserveContent: true
    })
    entry = secrez.encryptEntry(entry)
    entry.set({
      ts: Crypto.unscrambleTimestamp(entry.scrambledTs, entry.pseudoMicroseconds)
    })
    if (getEntry) {
      return [entry, new Node(entry)]
    }
    return new Node(entry)
  },

  setNewNodeVersion: (entry, node, secrez) => {
    entry.set({
      id: node.id,
      type: node.type,
      preserveContent: true,
      lastTs: node.lastTs
    })
    entry = secrez.encryptEntry(entry)
    entry.set({
      ts: Crypto.unscrambleTimestamp(entry.scrambledTs, entry.pseudoMicroseconds)
    })
    return entry
  },

  getRoot: () => {
    return new Node(new Entry({
      type: config.types.ROOT
    }))
  }

}


module.exports = helpers
