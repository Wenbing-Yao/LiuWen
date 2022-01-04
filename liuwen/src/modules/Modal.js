const { BrowserWindow } = require('electron')
const path = require('path')

let modalBuf = new Map()
let articleDeleteBuf = new Map()

const articleDeleteKey = 'art-delete'

function openArticleDeleteModal(localId, parent) {
    var modal = null
    articleDeleteBuf.set(localId, null)
    if (!modalBuf.has(articleDeleteKey)) {
        modal = new BrowserWindow({
            width: 700,
            height: 450,
            parent: parent,
            modal: true,
            show: false,
            title: '删除文章',
            webPreferences: {
                'preload': path.join(__dirname, '../preloads/articleDeletePreload.js')
            }
        })
        modalBuf.set(articleDeleteKey, modal)
    } else {
        modal = modalBuf.get(articleDeleteKey)
    }

    modal.loadFile(path.join(__dirname, '../templates/article/delete.html'))
    modal.once('ready-to-show', () => {
        modal.show()
    })
    modal.on('closed', () => {
        modalBuf.delete(articleDeleteKey)
    })
}

function closeArticleDeleteModal(localId) {
    articleDeleteBuf.delete(localId)
    var modal = modalBuf.get(articleDeleteKey)
    if (!modal) {
        return
    }
    modal.close()
}

function fetchLocalId() {
    if (articleDeleteBuf.size == 0) {
        return null
    }

    for (const [id, _] of articleDeleteBuf) {
        return id
    }
}

module.exports = {
    closeArticleDeleteModal,
    fetchLocalId,
    openArticleDeleteModal
}