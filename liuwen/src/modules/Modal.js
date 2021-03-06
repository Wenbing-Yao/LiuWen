const path = require('path')

const { prepareDir } = require('../modules/backend/utils')
const { isDev, dirConfig } = require('../modules/config')
const { getLogger } = require('../modules/render/utils')

const logger = getLogger(__filename)
let modalBuf = new Map()
let articleDeleteBuf = new Map()

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
    let index_fpath = path.join(path.dirname(__dirname), './templates/article/delete.html')
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
                'preload': path.join(__dirname, '../preloads/articleDeletePreload.js')
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