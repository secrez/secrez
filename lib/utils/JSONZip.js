// const _ = require('lodash')
//
// class JSONZip {
//
//   constructor() {
//     this.fields = {
//       b: 'publicKey',
//       c: 'creditCard',
//       e: 'email',
//       E: 'extra',
//       f: 'file',
//       F: 'extraFiends',
//       h: 'history',
//       k: 'privateKey',
//       l: 'lastUpdateAt',
//       n: 'notes',
//       N: 'number',
//       p: 'password',
//       P: 'pin',
//       s: 'secrets',
//       S: 'seed',
//       u: 'updatedAt',
//       U: 'url',
//       x: 'expirationDate',
//       X: 'extraFields'
//     }
//   }
//
//   invertedFields() {
//     return _.invert(this.fields)
//   }
//
//   addFields(fields) {
//     for (let field in fields) {
//       if (!this.fields[field]) {
//         this.fields[field] = fields[field]
//       }
//     }
//   }
//
//   compress(from, to) {
//     // this ignores
//     if (typeof from === 'string') {
//       from = JSON.parse(from)
//     }
//
//     const fields = JSONZip.fields(true)
//     for (let key in from) {
//       if (fields[key]) {
//
//       }
//     }
//   }
//
//   unzip(json) {
//     if (typeof json === 'string') {
//       json = JSON.parse(json)
//     }
//
//   }
//
// }
//
// module.exports = JSONZip