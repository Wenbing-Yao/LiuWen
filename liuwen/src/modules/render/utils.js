const path = require('path')

const isDev = false


function filename(fpath) {
    return path.basename(fpath)
}

function getLogger(filename) {
    const electronLog = require('electron-log')
    const log = electronLog.create(filename)

    let prefix = isDev ? 'dev' : 'prod'
    console.log(log.transports.file.fileName)
    log.transports.file.fileName = `${prefix}-${log.transports.file.fileName}`
    log.transports.console.level = isDev ? true : false

    log.info(`Start a logger for ${filename}`)

    return log
}

module.exports = {
    filename,
    getLogger,
    isDev
}