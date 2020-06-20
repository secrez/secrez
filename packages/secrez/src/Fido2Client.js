const path = require('path')
const fs = require('fs-extra')
const {spawn} = require('child_process')
const {Crypto} = require('@secrez/core')
const _ = require('lodash')

class Fido2Client {

  constructor(secrez) {
    this.keys = {}
    this.secrez = secrez
    this.scriptsPath = path.resolve(__dirname, '../scripts')
  }

  async updateConf() {
    const conf = await this.secrez.readConf()
    this.keys = {}
    if (conf.data.keys) {
      let keys = conf.data.keys
      for (let authenticator in keys) {
        if (keys[authenticator].type === this.secrez.config.sharedKeys.FIDO2_KEY) {
          let key = this.keys[authenticator] = _.clone(keys[authenticator])
          key.id = this.secrez.preDecryptData(key.id)
          key.salt = this.secrez.preDecryptData(key.salt)
          key.credential = this.secrez.preDecryptData(key.credential)
        }
      }
    }
  }

  async getKeys(asAList) {
    await this.updateConf()
    if (asAList) {
      let list = []
      for (let authenticator in this.keys) {
        list.push([authenticator, this.keys[authenticator].type])
      }
      return list
    } else {
      return this.keys
    }
  }

  setParams(options) {
    let params = [
      options.credential ? 'hmac_secret.py' : 'fido2_credential.py',
      '-n', options.authenticator,
      '-i', options.id
    ]
    if (options.credential) {
      params.push('-c', options.credential)
    }
    if (options.salt) {
      params.push('-s', options.salt)
    }
    return params
  }

  async exec(cmd, cwd, params) {
    return new Promise(resolve => {
      let json = {}
      const child = spawn(cmd, params, {
        cwd,
        shell: true
      })
      child.stdout.on('data', data => {
        json.message = _.trim(Buffer.from(data).toString('utf8'))
      })
      child.stderr.on('data', data => {
        json.error = _.trim(Buffer.from(data).toString('utf8'))
      })
      child.on('exit', code => {
        json.code = code
        if (fs.existsSync(this.jsonPath)) {
          let jsonData = fs.readFileSync(this.jsonPath, 'utf8')
          if (jsonData) {
            json.data = JSON.parse(jsonData)
            fs.unlinkSync(this.jsonPath)
          }
        }
        resolve(json)
      })
    })
  }

  async checkIfReady() {
    let result = await this.exec('which', __dirname, ['python'])
    if (typeof result.message === 'undefined') {
      throw new Error('The Fido2 module requires Python. Please install it on your computer.')
    }
    // result = await this.exec('python', __dirname, ['--version'])
    // if (!/Python 3/.test(result.message)) {
    //   throw new Error(`${result.message} found. The Fido2 module requires Python 3. Please install it on your computer.`)
    // }
    result =  await this.exec('python', this.scriptsPath, ['is_fido2_ready.py'])
    if (result.message !== 'Ready') {
      throw new Error('Python-fido2 is required. Install it with "pip install fido2"')
    }
  }


  async setCredential(options) {
    return await this.exec('python', this.scriptsPath, this.setParams(options))
  }

  async getSecret(options) {
    return await this.exec('python', this.scriptsPath, this.setParams(options))
  }

  async verifySecret(authenticator) {
    await this.updateConf()
    let key = this.keys[authenticator]
    let fido2Options = {
      id: key.id,
      authenticator,
      salt: key.salt,
      credential: key.credential
    }
    let result = await this.getSecret(fido2Options)
    this.checkErrorCode(result, 1)
    if (Crypto.b58Hash(result.message) === key.hash) {
      return result.message
    } else {
      throw new Error(`You used a different key for ${authenticator}`)
    }
  }

  checkErrorCode(result, num) {
    if (result.code !== 0) {
      let err = 'No Authenticator with the HmacSecret extension found!'
      if (result.error === err) {
        throw new Error(err)
      } else {
        throw new Error(num === 1 ? 'Fido2 authenticator device not found' : 'Something went wrong')
      }
    }
  }

}

module.exports = Fido2Client
