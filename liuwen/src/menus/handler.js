const { dialog } = require('electron')
const path = require('path')
const { ArticleStorage } = require('../modules/ArticleStorage')
const { settingStorage } = require('../modules/UserSettings')

function getStorage(username = null) {
    if (username == null) {
        username = settingStorage.getUsername()
    }

    return new ArticleStorage(username)
}

function addLocalFileToEditor(fpath, browserWindow) {
    var store = getStorage()
    var articleInfo = {}
    articleInfo.filePath = fpath
    var filename = path.parse(fpath).name
    articleInfo.title = filename
    articleInfo.paperId = ""
    articleInfo.desc = ""
    articleInfo.tags = ""

    var localId = store.getArticleIdByFilePath(fpath)
    if (localId) {
        var art = store.getArticle(localId)
        if (art) {
            browserWindow.webContents.send('article:show-rendered', art)
            return
        }
        store.deleteReversePath(fpath)
        localId = null
    }

    console.log(`文章不在编辑器中，现在添加：${fpath}`)
    localId = store.createArticle(articleInfo)
    browserWindow.webContents.send('article:create-reply',
        store.getArticle(localId))
}

function fetchFileContent() {
    var fpath = dialog.showOpenDialogSync({
        properties: ['openFile'],
        filters: [
            { name: 'Markdown', extensions: ['md', 'markdown'] }
        ]
    })

    if (fpath) {
        console.log(`文件路径为：${fpath}`)
        return fpath[0]
    }

    console.log('未选择文件')
    return null
}

function openLocalMarkdown(menuItem, browserWindow, event) {
    var fpath = fetchFileContent()
    if (!fpath) {
        return
    }
    addLocalFileToEditor(fpath, browserWindow)
}

function syncToLocal(menuItem, browserWindow, event) {
    console.log(menuItem)
}

function insertMarkdownElement(menuItem, browserWindow, event, type) {
    console.log(menuItem.label, type)
    browserWindow.webContents.send('article:insert', type)
}

function formatMarkdownElement(menuItem, browserWindow, event, type) {
    browserWindow.webContents.send('article:format', type)
}

function showMarkdownHelp(menuItem, browserWindow, event) {
    browserWindow.webContents.send('article:show-markdown-help')
}

module.exports = {
    addLocalFileToEditor,
    formatMarkdownElement,
    insertMarkdownElement,
    openLocalMarkdown,
    showMarkdownHelp,
    syncToLocal
}