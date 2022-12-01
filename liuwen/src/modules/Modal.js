const path = require('path')

const { prepareDir } = require('../modules/backend/utils')
const { isDev, dirConfig } = require('../modules/config')
const { getLogger } = require('../modules/render/utils')
const { Markdown } = require('./LiuwenMarkDown')

const logger = getLogger(__filename)
let modalBuf = new Map()
let articleDeleteBuf = new Map()
let articlePreviewModal = null

const articleDeleteKey = 'art-delete'
const isMac = process.platform === 'darwin'

function getLocaleLanguage() {
    const LANGUAGE_KEY = 'language'
    const { getKeyValue } = require('../modules/RawKeyValueStore')
    const { app } = require('electron')

    var language = getKeyValue(LANGUAGE_KEY)
    if (!language) {
        language = app.getLocale()
    }
    return language
}

function getLocaleSupportedLanguage() {
    const SUPPORTED_LANGUAGES_KEY = 'supported-languages'
    const { getKeyValue } = require('../modules/RawKeyValueStore')

    var supported_languages = getKeyValue(SUPPORTED_LANGUAGES_KEY)

    if (!supported_languages) {
        supported_languages = []
    }
    return supported_languages
}


function buildLocaleDelete(callback) {
    const {
        getLanguage
    } = require('../locale/i18n')
    const { app } = require('electron')
    const { configure } = require('nunjucks')
    const { trans } = require('../locale/i18n')
    let project_root_abs = path.resolve(path.dirname(path.dirname(__dirname)))
    let ofpath = path.join(dirConfig.localeDir(),
        `src/templates/langs/article/delete-${app.getVersion()}-${getLanguage()}.html`
    )
    prepareDir(ofpath)

    env = configure(path.dirname(__dirname))
    env.addFilter('trans', trans)
    let index_fpath = path.join(path.dirname(__dirname), './templates/article/preview.html')
    env.render(index_fpath, {
        rel_proj_root: project_root_abs
    }, (err, res) => {
        if (err) {
            logger.error(err)
            return
        }
        const { writeFileSync } = require('fs')
        writeFileSync(ofpath, res)
        callback(ofpath)
    })

    return ofpath
}

function openArticleDeleteModal(localId, parent) {
    var modal = null
    articleDeleteBuf.set(localId, null)
    const {
        addSupportedLanguage,
        getLanguage,
        getSupportedLanguages,
        setLocaleLang
    } = require('../locale/i18n')

    setLocaleLang(getLocaleLanguage())
    addSupportedLanguage(getLocaleSupportedLanguage())

    if (!modalBuf.has(articleDeleteKey)) {
        const { BrowserWindow } = require('electron')
        const { trans: _ } = require('../locale/i18n')
        const options = {
            width: 700,
            height: 450,
            parent: parent,
            modal: true,
            show: false,
            title: _('Delete Article'),
            webPreferences: {
                'preload': path.join(__dirname, '../preloads/articleDeletePreload.js'),
                'sandbox': false
            }
        }
        if (!isMac) {
            options.frame = false
            options.titleBarStyle = 'hidden'
        }

        modal = new BrowserWindow(options)
        modalBuf.set(articleDeleteKey, modal)
    } else {
        modal = modalBuf.get(articleDeleteKey)
    }

    buildLocaleDelete((src) => modal.loadFile(src))
    modal.webContents.send('config:language', getLanguage())
    modal.webContents.send('config:supported-languages', getSupportedLanguages())
    modal.once('ready-to-show', () => {
        modal.show()
    })
    modal.on('closed', () => {
        modalBuf.delete(articleDeleteKey)
    })

    if (isDev) {
        modal.webContents.openDevTools();
    }
}

function buildLocalePreview(localId, callback) {
    const { app } = require('electron')
    const { configure } = require('nunjucks')
    const {
        getLanguage
    } = require('../locale/i18n')
    const { trans } = require('../locale/i18n')
    const { settingStorage } = require('../modules/UserSettings')
    const { ArticleStorage } = require('../modules/ArticleStorage')
    let ofpath = path.join(dirConfig.localeDir(),
        `src/templates/langs/article/delete-${app.getVersion()}-${getLanguage()}.html`
    )
    prepareDir(ofpath)

    let project_root_abs = path.resolve(path.dirname(path.dirname(__dirname)))

    var store = new ArticleStorage(settingStorage.getUsername())
    var art = store.getArticle(localId)
    let md = new Markdown(art.filePath ? path.dirname(art.filePath) : null)
    art.content = md.convert(art.mdContent, true, true)

    env = configure(path.dirname(__dirname))
    env.addFilter('trans', trans)
    let index_fpath = path.join(path.dirname(__dirname), './templates/article/preview.html')
    env.render(index_fpath, {
        rel_proj_root: project_root_abs,
        'art': art
    }, (err, res) => {
        if (err) {
            logger.error(err)
            return
        }
        const { writeFileSync } = require('fs')
        writeFileSync(ofpath, res)
        callback(ofpath)
    })

    return ofpath
}

function openArticlePreviewModal(localId, parent) {

    const {
        addSupportedLanguage,
        setLocaleLang
    } = require('../locale/i18n')

    setLocaleLang(getLocaleLanguage())
    addSupportedLanguage(getLocaleSupportedLanguage())

    const { BrowserWindow } = require('electron')
    const { trans: _ } = require('../locale/i18n')

    const options = {
        width: 1024,
        height: 768,
        parent: parent,
        modal: true,
        show: false,
        title: _('Preview'),
        webPreferences: {
            'preload': path.join(__dirname, '../preloads/articlePreview.js')
        }
    }
    if (!isMac) {
        options.frame = false
        options.titleBarStyle = 'hidden'
    }

    if (articlePreviewModal != null) {
        articlePreviewModal.close()
        articlePreviewModal = null
    }
    var preview = new BrowserWindow(options)
    articlePreviewModal = preview

    buildLocalePreview(localId, (src) => preview.loadFile(src))
    preview.once('ready-to-show', () => {
        preview.show()
    })
    // preview.on('closed', () => {
    // })

    if (isDev) {
        preview.webContents.openDevTools();
    }
}


function closeArticlePreviewModal(localId) {
    if (articlePreviewModal != null) {
        logger.info(`Close preview model for ${localId}`)
        articlePreviewModal.close()
        articlePreviewModal = null
    } else {
        logger.warn(`Preview modal is null!`)
    }
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
    openArticleDeleteModal,
    openArticlePreviewModal,
    closeArticlePreviewModal
}