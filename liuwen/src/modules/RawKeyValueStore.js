const { safeStorage } = require('electron')
const { defaultUser, UserDirConfig } = require('./config')
const path = require('path')
const { readFileSync, writeFileSync } = require('fs')
const { getLogger } = require('../modules/render/utils')

const logger = getLogger(__filename)


function storeKeyValue(key, value, username = defaultUser) {
    var dc = new UserDirConfig(username)
    const dirBase = dc.keyValueStoreDir()
    var fpath = path.join(dirBase, key)
    writeFileSync(fpath, safeStorage.encryptString(value))
}

function getKeyValue(key, username = defaultUser) {
    var dc = new UserDirConfig(username)
    const dirBase = dc.keyValueStoreDir()
    var fpath = path.join(dirBase, key)
    try {
        var data = readFileSync(fpath)
        var value = safeStorage.decryptString(data)
        return value
    } catch (err) {
        if (err.code != 'ENOENT') {
            logger.error(`An err happened, when get key value: ${err}`)
        }
    }
}

function storeKeyJson(key, json, username = defaultUser) {
    storeKeyValue(key, JSON.stringify(json), username)
}

function getKeyJson(key, username = defaultUser) {
    try {
        var json = getKeyValue(key, username)
        if (json) {
            var jsonData = JSON.parse(json)
            return jsonData
        }
    } catch (err) {
        logger.error('Get json key error:', err)
    }
    return {}
}

module.exports = {
    storeKeyJson,
    storeKeyValue,
    getKeyJson,
    getKeyValue
}