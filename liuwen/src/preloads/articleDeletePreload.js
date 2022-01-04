const { configure } = require('nunjucks')
const { contextBridge, ipcRenderer } = require('electron')
const path = require('path')

const DELETE_ARTICLE_INFO_TN = 'article/delete-info.html'

function closeDeleteModal(localId) {
    ipcRenderer.send('article:modal-delete-close', localId)
}

function confirmArticleDelete(localId) {
    ipcRenderer.send('article:modal-delete-confirm', localId)
}

function cancelArticleDelete(localId) {
    ipcRenderer.send('article:modal-delete-close', localId)
}

function loadArticleInfo(artInfo) {
    env = configure(path.join(__dirname, '../templates'))
    env.render(DELETE_ARTICLE_INFO_TN, {
        art: artInfo
    }, (err, res) => {
        if (err) {
            console.log('render article delete err: ', err)
        } else {
            const element = document.getElementById('id-article')
            if (element) {
                element.innerHTML = res
            }
        }
    })
}

window.addEventListener('DOMContentLoaded', () => {
    ipcRenderer.send('article:modal-delete-render')
})

ipcRenderer.on('article:modal-delete-render-reply', (event, artInfo) => {
    loadArticleInfo(artInfo)
})

contextBridge.exposeInMainWorld('article', {
    'closeDeleteModal': closeDeleteModal,
    'cancelArticleDelete': cancelArticleDelete,
    'confirmArticleDelete': confirmArticleDelete
})