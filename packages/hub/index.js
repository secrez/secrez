const {Debug} = require('@secrez/utils')
const debug = Debug('secrez-hub')

const createServer = require('./src/createServer')

const startServer = async options => {

  const server = createServer({
    max_tcp_sockets: options.maxSockets,
    secure: options.secure,
    domain: options.domain,
    landing: options.landing
  })

  let port = await new Promise(resolve => {
    server.listen(options.port, options.address, () => {
      debug('server listening on port: %d', server.address().port)
      resolve(server.address().port)
    })
  })

  process.on('SIGINT', () => {
    // eslint-disable-next-line no-process-exit
    process.exit()
  })

  process.on('SIGTERM', () => {
    // eslint-disable-next-line no-process-exit
    process.exit()
  })

  process.on('uncaughtException', (err) => {
    console.error(err)
  })

  process.on('unhandledRejection', (reason, promise) => {
    console.error(reason)
  })

  return port

}

module.exports = {
  version: require('./package').version,
  createServer,
  startServer,
  utils: require('./src/utils')
}
