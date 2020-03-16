const {config, Crypto, Entry} = require('@secrez/core')

class Node {

  constructor(entry) {

    if (!entry || entry.constructor.name !== 'Entry') {
      throw new Error('Node constructor expects an Entry instance')
    }

    let isRoot = Node.isRoot(entry)

    if (!isRoot
        && entry.type !== config.types.DIR
        && entry.type !== config.types.FILE) {
      throw new Error('Unsupported type')
    }

    this.id = isRoot ? config.rOOt : entry.id || Crypto.getRandomId()
    this.type = entry.type
    if (entry.type !== config.types.FILE) {
      this.children = {}
    }

    if (isRoot) {
      this.rnd = Crypto.getRandomId()
      // to not confuse two roots
    } else {
      if (!entry.ts || typeof entry.ts !== 'string'
          || !entry.name || typeof entry.name !== 'string'
          || !entry.encryptedName || typeof entry.encryptedName !== 'string'
      ) {
        throw new Error('Missing parameters')
      }

      if (entry.parent && entry.parent.constructor.name === 'Node') {
        // a Node can be independent of a tree.
        // But if it is part of a tree, any child must have a parent

        this.parent = entry.parent
      }

      this.versions = {}
      this.lastTs = entry.ts
      this.versions[entry.ts] = {
        name: entry.name,
        file: entry.encryptedName
      }
    }
  }

  static isRoot(obj) {
    return obj.type === config.types.ROOT
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
    if (json.t !== config.types.ROOT) {
      json.V = []
      for (let v of json.v) {
        let entry = secrez.decryptEntry(new Entry({
          encryptedName: files[v]
        }))
        let obj = entry.get(['id', 'ts', 'name'])
        obj.encryptedName = files[v]
        json.V.push(obj)
      }
      json.V.sort(Node.sortEntry)
    }
    if (json.c) {
      for (let c of json.c) {
        Node.preFormat(c, secrez, files)
      }
    }
    return json
  }

  static sortEntry(a, b) {
    let [A, C] = a.ts.split('.').map(e => parseInt(e))
    let [B, D] = b.ts.split('.').map(e => parseInt(e))
    return (
        A > B ? 1
            : A < B ? -1
            : C > D ? 1
                : C < D ? -1
                    : 0
    )
  }

  static initNode(json, parent) {

    let V0 = json.V[0]
    let type = V0 ? parseInt(V0.encryptedName.substring(0, 1)) : config.types.ROOT
    let node = new Node(new Entry({
      type,
      id: V0 ? V0.id : config.rOOt,
      ts: V0 ? V0.ts : undefined,
      name: V0 ? V0.name : undefined,
      encryptedName: V0 ? V0.encryptedName : undefined,
      parent
    }))
    for (let i = 1; i < json.V.length; i++) {
      let V = json.V[i]
      node.versions[V.ts] = {
        name: V.name,
        file: V.encryptedName
      }
    }
    // console.log('>>>>',  JSON.stringify(json, null, 2))
    if (node.type !== config.types.FILE) {
      for (let i = 0; i < json.c.length; i++) {
        node.add(Node.initNode(json.c[i], node))
      }
    }

    return node
  }

  toJSON(minSize) {
    // prepare the object to be stringified and saved on disk

    const result = {
      v: []
    }

    if (this.type === config.types.ROOT) {
      minSize = this.calculateMinSize()
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

  getChildrenNames() {
    if (this.type === config.types.FILE)
    {
      throw new Error('Files do not have children')
    }
    let names = []
    for (let id in this.children) {
      names.push(this.children[id].getName())
    }
    return names
  }

  getFile(ts) {
    try {
      return this.versions[ts || this.lastTs].file
    } catch (e) {
      throw new Error('Version not found')
    }
  }

  getContent(ts) {
    try {
      return this.versions[ts || this.lastTs].content
    } catch (e) {
      throw new Error('Version not found')
    }
  }

  static getRoot(node) {
    if (node.type === config.types.ROOT) {
      return node
    } else {
      return Node.getRoot(node.parent)
    }
  }

  static findDirectChild(node, name) {
    if (node.type === config.types.FILE) {
      throw new Error('A file does not have children')
    }
    for (let c in node.children) {
      let child = node.children[c]
      if (child.versions[child.lastTs].name === name) {
        return child
      }
    }
  }

  getChildFromPath(p) {
    p = p.split('/')
    let node
    try {
      FOR: for (let i = 0; i < p.length; i++) {
        let name = p[i]
        if (i === 0) {
          switch (name) {
            case '':
            case '~':
              if (this.type === config.types.ROOT) {
                node = this
              } else {
                node = Node.getRoot(this)
              }
              break
            case '.':
              node = this
              break
            case '..':
              if (this.type === config.types.ROOT) {
                node = this
              } else {
                node = this.parent
              }
              break
            default:
              node = Node.findDirectChild(this, name)
          }
          if (!node) {
            throw new Error()
          }
        } else {
          switch (name) {
            case '~':
              throw new Error()
            case '':
            case '.':
              continue FOR
            case '..':
              if (node.type !== config.types.ROOT) {
                node = node.parent
              }
              break
            default:
              node = Node.findDirectChild(node, name)
          }
        }
      }
      return node
    } catch (e) {
      throw new Error('Path does not exist')
    }
  }

  getPathToChild(child) {

    if (!child || child.constructor.name !== 'Node') {
      throw new Error('The child is not a Node')
    }
    let p = ''
    while (child.id !== this.id) {
      p = (child.getName() || '') + (p ? '/' + p : '')
      child = child.parent
    }
    if (child.id === 'rOOt' && child.rnd !== Node.getRoot(this).rnd) {
      throw new Error('The child does not below to this tree')
    }
    if (Node.isRoot(this)) {
      p = '/' + p
    }
    return p
  }

  getOptions() {
    let options = {
      id: this.id,
      type: this.type,
      ts: this.lastTs,
      parent: this.parent,
      name: this.versions ? this.versions[this.lastTs].name : undefined,
      encryptedName: this.versions ? this.versions[this.lastTs].file : undefined
    }
    return options
  }

  getEntry() {
    return new Entry(this.getOptions())
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
      throw new Error('This entry does not represent a folder')
    }
  }

  move(entry) {
    if (this.type === config.types.ROOT) {
      throw new Error('You cannot modify a root node')
    }

    if (entry.id !== this.id) {
      throw new Error('Id does not match')
    }

    if (!this.versions[entry.ts]) {
      this.versions[entry.ts] = {
        name: entry.name,
        file: entry.encryptedName
      }
      this.lastTs = entry.ts
    } // else we are just moving it on the tree because versions are immutable

    if (entry.parent
        && entry.parent.constructor.name === 'Node'
        && entry.parent.id !== this.parent.id) {

      this.parent.remove(this)
      entry.parent.add(this)
      this.parent = entry.parent
    }
  }

  remove(children) {
    if (!children) {
      if (this.parent) {
        this.parent.remove(this)
      } else {
        throw new Error('Root cannot be removed')
      }
    } else {
      if (!Array.isArray(children)) {
        children = [children]
      }
      for (let c of children) {
        delete this.children[c.id]
      }
    }
  }

}


module.exports = Node
