const superagent = require('superagent')
const {Crypto} = require('@secrez/core')

module.exports = {
  publicKey1: 'HDy71QwbsBmWS1C2tEm3dAntza1Fzz4CUpDJyX93QfGL0FEZQKYEb2eZwHHN5k2m7BFGsRL89s6SFFM8tn25v4sA5',
  publicKey2: '5vwZnuSZyhimWeQnrTy2FpU8gEffnzRJJZatzVtc8CSe064Xhxhs5F9pXnkZrxfBR7udCuitjhe3udPS6LDoTYe1G',

  sendMessage: async (message, publicKey1, secrez, server) => {
    let encryptedMessage = secrez.encryptSharedData(message, publicKey1)

    payload = JSON.stringify({
      message: {
        sentAt: Date.now(),
        content: encryptedMessage
      },
      publicKey: secrez.getPublicKey(),
      salt: Crypto.getRandomBase58String(16)
    })
    signature = secrez.signMessage(payload)

    const params = {
      payload,
      signature
    }

    return superagent.post(`${server.localhost}/`)
        .set('Accept', 'application/json')
        .query({cc: 44})
        .send(params)
        .ca(await server.tls.getCa())
  }
}

