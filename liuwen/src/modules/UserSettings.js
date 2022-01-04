const { dirConfig } = require('./config')
const { readFileSync, writeFileSync } = require('fs')


function readJsonFile(fpath) {
    var data = {}

    try {
        data = JSON.parse(readFileSync(fpath))
    } catch (err) {}

    return data
}

function updateJsonFile(fpath, info) {
    var data = readJsonFile(fpath)

    for (let k in info) {
        data[k] = info[k]
    }
    writeFileSync(fpath, JSON.stringify(data))
}


class SettingStorage {
    constructor() {
        this.filePath = dirConfig.settingsPath()
        this.settings = readJsonFile(this.filePath)
        this.changed = false
    }

    setKeyValue(key, value, noflush) {
        this.settings[key] = value
        this.changed = true

        if (!noflush) this.flush()
    }

    setUsername(username) {
        this.setKeyValue('username', username)
    }

    getUsername() {
        return this.settings.username
    }

    getUserinfo() {
        return {
            'username': this.getUsername()
        }
    }

    flush(forced) {
        if (this.changed || forced) {
            updateJsonFile(this.filePath, this.settings)
        }
        this.changed = false
    }
}

module.exports = {
    settingStorage: new SettingStorage()
}