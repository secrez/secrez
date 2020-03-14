const {Crypto} = require('@secrez/core')
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

  initRandomNode: (type, secrez, getItem) => {
    let item = {
      id: Crypto.getRandomId(),
      name: Crypto.getRandomId() + Crypto.getRandomId(),
      type,
      preserveContent: true
    }
    item = secrez.encryptItem(item)
    item.ts = Crypto.unscrambleTimestamp(item.scrambledTs, item.pseudoMicroseconds)
    if (getItem) {
      return [item, new Node(item)]
    }
    return new Node(item)
  },

  setNewNodeVersion: (item, node, secrez) => {
    item.id = node.id
    item.type = node.type
    item.preserveContent = true
    item.lastTs = node.lastTs
    item = secrez.encryptItem(item)
    item.ts = Crypto.unscrambleTimestamp(item.scrambledTs, item.pseudoMicroseconds)
    return item
  }

}


module.exports = helpers
