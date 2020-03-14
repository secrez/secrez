const {config, Crypto} = require('@secrez/core')

class Node {

  constructor(options = {}) {

    if (typeof options !== 'object') {
      throw new Error('Invalid options passed to constructor')
    }

    let isRoot = options.type === config.types.INDEX

    if (options.type !== config.types.DIR
        && options.type !== config.types.FILE
        && !isRoot) {
      throw new Error('Unsupported type')
    }

    this.id = isRoot ? 'rOOt' : options.id || Crypto.getRandomId()
    this.type = options.type
    if (options.type !== config.types.FILE) {
      this.children = {}
    }

    if (!isRoot) {
      if (!options.ts || typeof options.ts !== 'string'
          || !options.name || typeof options.name !== 'string'
          || !options.encryptedName || typeof options.encryptedName !== 'string'
      ) {
        throw new Error('Missing parameters')
      }

      if (options.parent && options.parent.constructor.name === 'Node') {
        // a Node can be independent of a tree.
        // But if it is part of a tree, any child must have a parent

        this.parent = options.parent
      }


      this.versions = {}
      this.lastTs = options.ts
      if (options.name && options.encryptedName) {
        this.versions[options.ts] = {
          name: options.name,
          file: options.encryptedName
        }
      } else {
        throw new Error('Only the root node can miss an associated file')
      }
    }
  }

  static fromJSON(json, secrez, allFiles) {
    // It takes an already parsed object to make it an instance of the class.
    // It needs the list of files on disk to correctly recover timestamps and names

    let minSize
    for (let c of json.c) {
      minSize = c.v[0].length
    }
    let files = {}
    for (let f of allFiles) {
      files[f.substring(0, minSize)] = f
    }
    json = Node.preFormat(json, secrez, files)
    return Node.initNode(json)
  }

  static preFormat(json, secrez, files) {
    if (json.t !== config.types.INDEX) {
      json.V = []
      for (let v of json.v) {
        let item = secrez.decryptItem({
          encryptedName: files[v]
        })
        json.V.push({
          id: item.id,
          ts: item.ts,
          name: item.name,
          encryptedName: files[v]
        })
      }
      json.V.sort((a, b) => {
        let [A, C] = a.ts.split('.').map(e => parseInt(e))
        let [B, D] = b.ts.split('.').map(e => parseInt(e))
        return (
            A > B ? 1
                : A < B ? -1
                : C > D ? 1
                    : C < D ? -1
                        : 0
        )
      })
    }
    if (json.c) {
      json.C = []
      for (let c of json.c) {
        json.C.push(Node.preFormat(c, secrez, files))
      }
    }
    return json
  }

  static initNode(json, parent) {
    let V0 = json.V[0]
    let type = V0 ? parseInt(V0.file.substring(0, 1)) : config.types.INDEX
    let node = new Node({
      type,
      id: json.t === config.types.INDEX ? 'root' : V0.id,
      ts: V0.ts,
      name: V0.name,
      encryptedName: V0.encryptedName
    })
    if (parent) {
      node.parent = parent
    }
    for (let i = 1; i < json.V.length; i++) {
      let V = json.V[i]
      node.versions[V.ts] = {
        name: V.name,
        file: V.file
      }
    }
    if (json.t !== config.types.FILE) {
      for (let i = 1; i < json.C.length; i++) {
        node.children[json.C[i].V[0].id] = Node.initNode(json.C[i], node)
      }
    }
    return node
  }

  toJSON(minSize) {
    // prepare the object to be stringified and saved on disk

    if (this.type === config.types.INDEX) {
      minSize = this.calculateMinSize()
    }

    if (this.type !== config.types.INDEX && !minSize) {
      throw new Error('The dataPath is needed')
    }

    const result = {
      v: []
    }

    if (this.versions)
      for (let ts in this.versions) {
        result.v.push(this.versions[ts].file.substring(0, minSize))
      }

    if (this.children) {
      result.c = []
      for (let id in this.children) {
        result.c.push(this.children[id].toJSON(minSize))
      }
    }

    return result
  }

  getAllFiles(child) {
    if (!child) {
      child = this
    }
    let result = []
    if (child.versions) {
      for (let v in child.versions) {
        result.push(child.versions[v].file)
      }
    }
    if (child.children) {
      for (let c in child.children) {
        result = result.concat(this.getAllFiles(child.children[c]))
      }
    }
    return result
  }

  calculateMinSize() {
    let allFiles = this.getAllFiles()
    let min = 0
    let minSize
    let arr = {}
    LOOP: while (!minSize) {
      min++
      for (let f of allFiles) {
        let s = f.substring(0, min)
        if (arr[s]) {
          continue LOOP
        }
        arr[s] = true
      }
      return min
    }
  }

  getName(ts) {
    try {
      return this.versions[ts || this.lastTs].name
    } catch (e) {
      throw new Error('Version not found')
    }
  }

  getFile(ts) {
    try {
      return this.versions[ts || this.lastTs].file
    } catch (e) {
      throw new Error('Version not found')
    }
  }

  getOptions() {
    let options = {
      id: this.id,
      type: this.type,
      ts: this.lastTs,
      name: this.versions[this.lastTs].name,
      parent: this.parent,
      encryptedName: this.versions[this.lastTs].file
    }
    return options
  }

  move(options) {
    if (this.type === config.types.INDEX) {
      throw new Error('You cannot modify a root node')
    }

    if (options.id !== this.id) {
      throw new Error('Id does not match')
    }

    if (!this.versions[options.ts]) {
      this.versions[options.ts] = {
        name: options.name,
        file: options.encryptedName
      }
      this.lastTs = options.ts
    } // else we are just moving it on the tree because versions are immutable

    if (options.parent
        && options.parent.constructor.name === 'Node'
        && options.parent.id !== this.parent.id) {

      this.parent.remove(this)
      options.parent.add(this)
      this.parent = options.parent
    }
  }

  add(children) {
    if (this.type !== config.types.FILE) {
      // a child is a Node instance
      if (!Array.isArray(children)) {
        children = [children]
      }
      for (let c of children) {
        c.parent = this
        this.children[c.id] = c
      }
    } else {
      throw new Error('This item does not represent a folder')
    }
  }

  remove(children) {
    if (!Array.isArray(children)) {
      children = [children]
    }
    for (let c of children) {
      delete this.children[c.id]
    }
  }

}


module.exports = Node
