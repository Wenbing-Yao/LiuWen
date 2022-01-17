const path = require('path')
const isDev = false

function filename(fpath) {
    return path.basename(fpath)
}

module.exports = {
    filename,
    isDev
}