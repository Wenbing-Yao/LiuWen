const { contextBridge, ipcRenderer } = require('electron')
const DELETE_ARTICLE_INFO_TN = '../templates/article/delete-info.html'
const { setLocaleLang, addSupportedLanguage, trans } = require('../locale/i18n')
const { getLogger } = require('../modules/render/utils')

const logger = getLogger(__filename)


function getTemplateEnv() {
    const path = require('path')
    const { configure } = require('nunjucks')

    let env = configure(path.join(__dirname, '../templates'))
    env.addFilter('trans', trans)

    return env
}

function closeDeleteModal(localId) {
    ipcRenderer.send('article:modal-delete-close', localId)
}

function confirmArticleDelete(localId) {
    var ele = document.getElementById("deleteCloudCheck")
    var localEle = document.getElementById("deleteLocalFileCheck")
    let deleteCloud = false
    let deleteLocal = false

    if (ele && ele.checked) {
        deleteCloud = true
    }

    if (localEle && localEle.checked) {
        deleteLocal = true
    }

    ipcRenderer.send('article:modal-delete-confirm', localId, deleteCloud, deleteLocal)
}

function cancelArticleDelete(localId) {
    ipcRenderer.send('article:modal-delete-close', localId)
}

function loadArticleInfo(artInfo) {
    var env = getTemplateEnv()
    const path = require('path')
    var fpath = path.join(__dirname, DELETE_ARTICLE_INFO_TN)

    env.render(fpath, {
        art: artInfo
    }, (err, res) => {
        if (err) {
            logger.error('render article delete err: ', err)
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

ipcRenderer.on('config:language', (event, language) => {
    setLocaleLang(language)
})
ipcRenderer.on('config:supported-languages', (event, supported_languages) => {
    addSupportedLanguage(supported_languages)
})

contextBridge.exposeInMainWorld('article', {
    'closeDeleteModal': closeDeleteModal,
    'cancelArticleDelete': cancelArticleDelete,
    'confirmArticleDelete': confirmArticleDelete
})