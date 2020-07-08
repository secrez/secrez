
const {Debug} = require('@secrez/utils')
const debug = Debug('secrez-hub')

const createServer = require('./src/createServer')

const startServer = options => {

    const server = createServer({
        max_tcp_sockets: options.maxSockets,
        secure: options.secure,
        domain: options.domain,
        landing: options.landing
    })

    server.listen(options.port, options.address, () => {
        debug('server listening on port: %d', server.address().port)
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

}

module.exports = {
    version: require('./package').version,
    createServer,
    startSever: startServer
}
