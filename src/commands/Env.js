const path = require('path')

const fs = require('../utils/fs')
const Utils = require('../utils')

class Env extends require('../Command') {

  getSavedInstances() {
    if (fs.existsSync(this.instancesPath)) {
      this.instances = JSON.parse(fs.readFileSync(this.instancesPath, 'utf8'))
    }
  }

  saveInstances() {
    fs.writeFileAsync(this.instancesPath, JSON.stringify(this.instances, null, 2), 'utf8')
  }

  setHelpAndCompletion() {
    const {TRUE} = this.config.completionTypes
    this.config.completion.env = Utils.sortKeys({
      loadInstances: TRUE,
      reset: TRUE
    })
    this.config.completion.help.env = true
  }

  help() {
    return {
      description: ['Shows the global variables set by "set" and "use".'],
      examples: [
        'env',
        'env reset',
        'env loadInstances'
      ]
    }
  }

  async getAllInstances(refresh) {
    if (!this.instancesPath) {
      this.instancesPath = path.join(this.prompt.preferencesDir, 'instances.json')
    }
    if (!this.instances) {
      this.getSavedInstances()
    }
    if (!this.instances || refresh) {
      this.startLoading('Initiating instances')
      let promises = []
      this.instances = []
      for (let region of Object.values(this.config.region)) {
        promises.push(new Promise(function (resolve) {
          ec2.getAllInstances()
              .then(instances => {
                for (let instance of instances) {
                  instance.region = region
                }
                resolve(instances)
              })
        }))
      }
      let data = await Promise.all(promises)
      for (let d of data) {
        this.instances = this.instances.concat(d)
      }
      this.instances.sort((a, b) => {
        let A = a.region
        let B = b.region
        return A > B ? 1 : A < B ? -1 : 0
      })
      this.stopLoading()
      this.saveInstances()
    }
    return this.instances
  }

  eq(a, b) {
    return (a || '').toString().toLowerCase() === (b || '').toString().toLowerCase()
  }

  async ipList(withParams, refresh) {
    await this.getAllInstances(refresh)
    const {region, type, usage, ip, name, nodes} = this.prompt.global.data
    const region0 = this.config.region[region]
    const list = {}
    if (ip || name || nodes) {
      for (let instance of this.instances) {
        if (nodes && nodes.includes(instance.name)) {
          list[instance.name] = [instance.pip]
        } else if (name && instance.name === name) {
          list[name] = [instance.pip]
        } else if (ip && instance.pip === ip) {
          list[instance.name] = [ip]
        }
        if (list[instance.name]) {
          if (withParams) {
            list[instance.name].push({
              region: instance.region,
              type: instance.type,
              usage: instance.usage,
              iip: instance.iip,
              status: instance.status
            })
          }
        }
      }
      if (ip && list.length === 0) {
        list['undefined'] = [ip]
      }
    } else {
      for (let instance of this.instances) {
        let ok = instance.pip !== undefined ? 1 : 0
        if (ok && region) {
          ok &= this.eq(instance.region, region0)
        }
        if (ok && type) {
          ok &= this.eq(instance.type, type)
        }
        if (ok && usage) {
          ok &= this.eq(instance.usage, usage)
        }
        if (ok) {
          list[instance.name] = [instance.pip]
          if (withParams) {
            list[instance.name].push({
              region: instance.region,
              type: instance.type,
              usage: instance.usage
            })
          }
        }
      }
    }
    return list
  }

  read(newline) {
    const global = this.prompt.global.data
    if (newline) {
      console.debug()
    }
    let ok
    for (let k in global) {
      if (global[k]) {
        this.Logger.grey(Utils.capitalize(k) + ': ' + global[k])
        ok = 1
      }
    }
    if (!ok) {
      this.Logger.grey('No global variables configured yet.')
    }
  }

  async exec(options) {
    if (options.loadInstances) {
      await this.getAllInstances(true)
    } else if (options.reset) {
      await this.prompt.global.reset()
    } else {
      this.read()
    }
    this.prompt.run()
  }
}

module.exports = Env


