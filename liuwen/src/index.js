const { app, BrowserWindow, dialog, globalShortcut, ipcMain, nativeTheme, shell, Menu } = require('electron')
const { configure } = require('nunjucks')
const path = require('path')
const fs = require('fs')

const { prepareDir } = require('./modules/backend/utils')
const { getLogger } = require('./modules/render/utils')
const { isDev, dirConfig } = require('./modules/config')
const { ArticleStorage } = require('./modules/ArticleStorage')
const { closeArticleDeleteModal, fetchLocalId, openArticleDeleteModal } = require('./modules/Modal')
const { getKeyValue } = require('./modules/RawKeyValueStore')
const { settingStorage } = require('./modules/UserSettings')
const { addLocalFileToEditor, openLocalMarkdown } = require('./menus/handler')
const { addSupportedLanguage, getLanguage, getSupportedLanguages, setLocaleLang, trans } = require('./locale/i18n')

let _ = trans
let mainWindow = null
let loginWindow = null
let userinfoModal = null
let peClient = null

const log = getLogger(__filename)

function getPeClient(username = null, onLine = true) {
    if (username == null)
        username = settingStorage.getUsername()

    if (!peClient || onLine != peClient.onLine) {
        const { PaperExplainedClient } = require('./modules/Communication.js')
        peClient = new PaperExplainedClient('articles', username, onLine)
    }
    return peClient
}

function getStorage(username = null) {
    if (username == null) {
        username = settingStorage.getUsername()
    }

    return new ArticleStorage(username)
}

function getArticleClient(localId, username = null) {
    const { CloudArticle } = require('./modules/CloudArticle')

    if (username == null) {
        username = settingStorage.getUsername()
    }

    return new CloudArticle(localId, username)
}


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
    app.quit();
}

function saveFileContent(file, content) {
    if (!file) {
        file = dialog.showSaveDialogSync({
            title: '保存内容',
            defaultPath: app.getPath('documents'),
            filters: [{
                name: 'Markdown',
                extensions: ['md']
            }]
        });
    }

    if (file && !file.endsWith('.md')) {
        file += '.md'
    }

    fs.writeFileSync(file, content)

    return file
}

const isMac = process.platform === 'darwin'

function buildLocaleIndex(callback) {

    let lang = getLanguage()
    let ofpath = path.join(dirConfig.localeDir(),
        `src/templates/langs/index-${app.getVersion()}-${lang}.html`
    )
    prepareDir(ofpath)

    let project_root_abs = path.resolve(path.dirname(__dirname))

    log.info(`Got language in build index: ${getLanguage()}`)
    env = configure(path.join(__dirname, 'templates'))
    env.addFilter('trans', trans)
    let index_fpath = path.join(__dirname, './templates/index.html')
    env.render(index_fpath, {
        project_root: project_root_abs
    }, (err, res) => {
        if (err) {
            log.error('an error happend!')
            log.error(err)
            throw err
        }
        fs.writeFileSync(ofpath, res)
        callback(ofpath)
    })

    return ofpath
}

function getLocaleLanguage() {
    const LANGUAGE_KEY = 'language'
    var language = getKeyValue(LANGUAGE_KEY)
    if (!language) {
        language = app.getLocale()
    }
    return language
}

function getLocaleSupportedLanguage() {
    const SUPPORTED_LANGUAGES_KEY = 'supported-languages'

    var supported_languages = getKeyValue(SUPPORTED_LANGUAGES_KEY)
    if (!supported_languages) {
        supported_languages = []
    }
    return supported_languages
}

function configureLanguage() {
    const LANGUAGE_KEY = 'language'
    const SUPPORTED_LANGUAGES_KEY = 'supported-languages'
    var language = getKeyValue(LANGUAGE_KEY)
    if (!language) {
        language = app.getLocale()
    }

    setLocaleLang(language)

    var supported_languages = getKeyValue(SUPPORTED_LANGUAGES_KEY)
    if (!supported_languages) {
        supported_languages = []
    }
    addSupportedLanguage(supported_languages)
}

const createWindow = async () => {
    configureLanguage()

    if (!mainWindow) {
        mainWindow = new BrowserWindow({
            width: 1920,
            height: 1080,
            title: _("LiuWen"),
            // frame: false,
            // titleBarStyle: 'customButtonsOnHover',
            // titleBarStyle: 'hidden',
            // titleBarOverlay: true,
            // transparent: true,
            icon: isMac ? path.join(__dirname, 'static/logo.icns') : path.join(__dirname, 'static/logo.png'),
            webPreferences: {
                'preload': path.join(__dirname, 'preload.js')
            }
        });

        if (isMac) {
            app.dock.setIcon(path.join(__dirname, 'static/logo.icns'))
        } else {
            mainWindow.setIcon(path.join(__dirname, 'static/logo.png'))
        }
    }

    var menu = null
    var menuTemplate = null
    if (isMac) {
        menuTemplate = require('./menus/darwin').menuTemplate
    } else {
        menuTemplate = require('./menus/windows').menuTemplate
    }
    menu = Menu.buildFromTemplate(menuTemplate)

    Menu.setApplicationMenu(menu)
    buildLocaleIndex((src) => mainWindow.loadFile(src))

    // Load theme handler
    // setThemeHandler()
    ipcMain.handle('dark-mode:toggle', () => {
        if (nativeTheme.shouldUseDarkColors) {
            nativeTheme.themeSource = 'light'
        } else {
            nativeTheme.themeSource = 'dark'
        }
        return nativeTheme.shouldUseDarkColors
    })

    ipcMain.handle('dark-mode:system', () => {
        nativeTheme.themeSource = 'system'
    })

    // var pw = await accountConfig.dbPassword()

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.webContents.send('config:language', getLanguage())
        mainWindow.webContents.send('config:supported-languages', getSupportedLanguages())
        // getFileFromUser();
        // Open the DevTools.
        if (isDev) {
            log.debug('this is a development environment!', isDev)
            mainWindow.webContents.openDevTools();
        }
    })

    app.setAboutPanelOptions({
        applicationName: _("LiuWen"),
        applicationVersion: `${app.getVersion()}`,
        version: `v${app.getVersion()}`,
        website: "http://paperexplained.cn",
        iconPath: isMac ? path.join(__dirname, 'static/logo.icns') : path.join(__dirname, 'static/logo.png')
    })

    // mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    //     return { action: 'deny' };
    // });
};


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
    mainWindow = null
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

function setThemeHandler() {
    ipcMain.handle('dark-mode:toggle', () => {
        if (nativeTheme.shouldUseDarkColors) {
            nativeTheme.themeSource = 'light'
        } else {
            nativeTheme.themeSource = 'dark'
        }
        return nativeTheme.shouldUseDarkColors
    })

    ipcMain.handle('dark-mode:system', () => {
        nativeTheme.themeSource = 'system'
    })
}

ipcMain.on('article:create', (event, mdContent, articleInfo) => {
    filePath = saveFileContent(null, mdContent)
    articleInfo['filePath'] = filePath
    var store = getStorage()
    var localId = store.createArticle(articleInfo)
    event.reply('article:create-reply', store.getArticle(localId))
})

ipcMain.on('article:render', (event, type) => {
    var peClient = getPeClient()
    if (!peClient.isLogin && peClient.onLine) {
        event.reply('article:render-reply', type, [])
        return
    }

    var store = getStorage()
    if (type == 'editing') {
        var editing = store.listEditingArticle()
        event.reply('article:render-reply', type, editing)
    } else {
        event.reply('article:render-reply', type, store.listIssuedArticle())
    }
})

function handleFreshArticleMeta(info, localId, event) {
    var store = getStorage()
    var preInfo = store.getArticle(localId)

    if (info.status != '已提交') {
        var meta = { 'status': info.status }
        if (info.status == '已通过') {
            meta["issued"] = true
        }
        store.updateArticleMeta(localId, meta)
        store.updateArticle(localId, meta)
    }
    if (preInfo.status != info.status) {
        event.reply('article:check-status-changed', localId, info.status)
    }

    if (info.status == '已通过') {
        var artInfo = store.getArticle(localId)
        mainWindow.webContents.send('article:add-issued', artInfo)
        mainWindow.webContents.send('article:element-delete', localId)
    }
}

ipcMain.on('article:check-status', (event, localId, cloudId) => {
    var client = getArticleClient(localId)
    client.articleMeta(cloudId,
        (info) => handleFreshArticleMeta(info, localId, event),
        (err) => log.error('article meta error: ', err),
    )
})

ipcMain.on('article:check-issued', (event, localId) => {
    var client = getArticleClient(localId)
    var store = getStorage()
    var preInfo = store.getArticle(localId)

    if (!preInfo || !preInfo.cloudId) {
        log.info(`Article cloud id not set: [${localId}]`)
        return
    }

    client.articleMeta(preInfo.cloudId,
        (info) => handleFreshArticleMeta(info, localId, event),
        (err) => log.error('article meta error: ', err),
    )
})

ipcMain.on('article:check-paper-id', (event, localId, paperId) => {
    // TODO: verify
    var client = getArticleClient(localId)
    let store = getStorage()
    client.paperTitle(paperId,
        info => {
            event.reply('article:check-paper-id-reply', paperId, localId, info.title)
            store.updateArticle(localId, {
                'paperTitle': info.title,
                'paperIdValid': true
            })
        },
        err => {
            event.reply('article:check-paper-id-reply', paperId, localId, null)
            store.updateArticle(localId, {
                'paperTitle': null,
                'paperIdValid': false
            })
        })
})

ipcMain.on('article:content-init', (event, localId, renderedId) => {
    var store = getStorage()
    var articleInfo = store.getArticle(localId)
    var content = articleInfo['mdContent']
    event.reply('article:content-reply', localId, renderedId, content);
})

ipcMain.on('article:content-update', (event, localId, mdContent) => {
    var store = getStorage()
    store.updateArticleContent(localId, mdContent)
})

ipcMain.on('article:meta-update', (event, localId, info) => {
    var store = getStorage()
    store.updateArticle(localId, info)
})

ipcMain.on('article:syn-to-cloud', (event, localId) => {
    var cloudInfo = { 'artId': null }
    var client = getArticleClient(localId)
    var store = getStorage()
    var preInfo = store.getArticle(localId)

    client.syncToCloud(info => {
        var newInfo = store.getArticle(localId)
        if (newInfo.status != preInfo.status) {
            event.reply('article:check-status-changed', localId, newInfo.status)
        }
        event.reply('article:syn-to-cloud-reply', localId, cloudInfo)
    }, (err) => {
        if (isDev) {
            console.log(err)
        }
        log.error(`sync to cloud error: ${err}`)
        event.reply('article:syn-to-cloud-reply', localId, null)
    })
})

ipcMain.on('article:issue-article', (event, localId) => {
    var client = getArticleClient(localId)
    var cloudInfo = {
        'status': '已提交'
    }
    let sc = client.articleSubmitCensor()
    if (sc) {
        sc.then(info => {
            if (info.status == '已提交') {
                cloudInfo.status = info.status
                event.reply('article:issue-article-reply', localId, true, cloudInfo)
            } else {
                event.reply('article:issue-article-reply', localId, false)
            }
        })
    }
})

ipcMain.on('article:delete', (event, localId, deleteCloud, deleteFile) => {
    openArticleDeleteModal(localId, mainWindow)
})

ipcMain.on('article:modal-delete-render', (event) => {
    var localId = fetchLocalId()
    if (!localId) {
        log.info('no localid')
        event.reply('article:modal-delete-render-reply', null)
        return
    }
    var store = getStorage()
    var artInfo = store.getArticle(localId)
    event.reply('article:modal-delete-render-reply', artInfo)
})

ipcMain.on('article:modal-delete-close', (event, localId) => {
    closeArticleDeleteModal(localId)
})

ipcMain.on('article:modal-delete-confirm',
    (event, localId, deleteCloud, deleteLocal) => {
        closeArticleDeleteModal(localId)

        // 1. local storage delete
        var store = getStorage()
        var art = store.getArticle(localId)
        store.deleteArticle(localId, deleteLocal)

        // 2. cloud delete
        if (deleteCloud && art && art.cloudId) {
            let client = getArticleClient(localId)
            client.articleDelete(art.cloudId, info => {
                log.info('cloud article deleted:', info)
            }, err => {
                log.error('cloud article delete failed:', err)
            })
        }

        // 3. element delete
        mainWindow.webContents.send('article:element-delete', localId)
    })

ipcMain.on('article:paper-title', (event, paperId, localId) => {
    var client = getArticleClient(localId)
    client.paperTitle(paperId,
        info => event.reply('article:paper-title-reply', paperId, localId, info.title),
        err => event.reply('article:paper-title-reply', paperId, localId, null, err))
})

ipcMain.on('userinfo:render', (event) => {
    var userinfo = settingStorage.getUserinfo()
    event.reply('userinfo:render-reply', userinfo)
})

function buildLocaleLogin(callback) {
    let project_root_abs = path.resolve(path.dirname(__dirname))
    let lang = getLanguage()
    let ofpath = path.join(dirConfig.localeDir(),
        `src/templates/langs/profile/login-${app.getVersion()}-${lang}.html`
    )
    prepareDir(ofpath)

    env = configure(__dirname)
    env.addFilter('trans', trans)
    let index_fpath = path.join(__dirname, './templates/profile/login.html')
    env.render(index_fpath, {
        rel_proj_root: project_root_abs
    }, (err, res) => {
        if (err) {
            log.error(err)
            return
        }
        fs.writeFileSync(ofpath, res)
        callback(ofpath)
    })

    return ofpath
}

function buildLocaleUserInfo(callback) {
    let project_root_abs = path.resolve(path.dirname(__dirname))
    let ofpath = path.join(dirConfig.localeDir(),
        `src/templates/langs/profile/user-${app.getVersion()}-${getLanguage()}.html`)
    prepareDir(ofpath)

    env = configure(__dirname)
    env.addFilter('trans', trans)
    let index_fpath = path.join(__dirname, './templates/profile/user.html')
    env.render(index_fpath, {
        rel_proj_root: project_root_abs
    }, (err, res) => {
        if (err) {
            log.error(err)
            return
        }
        fs.writeFileSync(ofpath, res)
        callback(ofpath)
    })

    return ofpath
}


function openLoginModal() {
    // Child login window
    if (!loginWindow) {

        var options = {
            width: 360,
            height: 400,
            parent: mainWindow,
            modal: true,
            show: false,
            title: _("Login"),
            webPreferences: {
                'preload': path.join(__dirname, 'loginPreload.js')
            }
        }
        if (!isMac) {
            options.frame = false
            options.titleBarStyle = 'hidden'
        }
        loginWindow = new BrowserWindow(options)
    }
    // loginWindow.loadFile(path.join(__dirname, 'templates/profile/login.html'))

    buildLocaleLogin((src) => loginWindow.loadFile(src))

    loginWindow.once('ready-to-show', () => {
        loginWindow.show()
        if (isDev) {
            loginWindow.webContents.openDevTools();
        }
    })

    loginWindow.on('closed', () => {
        loginWindow = null
    })

}

function openUserinfoModal() {
    if (!userinfoModal) {
        var options = {
            width: 400,
            height: 400,
            parent: mainWindow,
            // frame: false,
            // titleBarStyle: 'hidden',
            modal: true,
            show: false,
            title: _("User Profile"),
            webPreferences: {
                'preload': path.join(__dirname, 'preloads/userinfoPreload.js')
            }
        }

        if (!isMac) {
            options.frame = false
            options.titleBarStyle = 'hidden'
        }
        userinfoModal = new BrowserWindow(options)
    }

    userinfoModal.loadFile(path.join(__dirname, 'templates/profile/user.html'))
    buildLocaleUserInfo((src) => userinfoModal.loadFile(src))
    userinfoModal.once('ready-to-show', () => {
        userinfoModal.show()
    })
    userinfoModal.on('closed', () => {
        userinfoModal = null
    })
}

function closeLoginModal() {
    if (loginWindow) {
        loginWindow.close()
    }
}

function closeUserinfoModal() {
    if (userinfoModal) {
        userinfoModal.close()
    }
}

ipcMain.on('profile:login-show', (event) => {
    openLoginModal()
    peClient = getPeClient()
    peClient.amILogin((status) => {
        log.info(`User login status: ${status}`)
    })

})

ipcMain.on('profile:userinfo-show', (event) => {
    openUserinfoModal()
})

ipcMain.on('profile:userinfo-close', (event) => {
    closeUserinfoModal()
})

ipcMain.on('profile:logout', (event) => {
    peClient = getPeClient()
    peClient.get('logout',
        res => {
            settingStorage.setUsername(null)
            closeUserinfoModal()
            mainWindow.webContents.send('profile:logout-success')
        },
        err => log.error('Logout failed:', err))
})

ipcMain.on('profile:login-cancel', (event) => {
    closeLoginModal()
})

ipcMain.on('profile:login-check', (event, onLine) => {
    var username = settingStorage.getUsername()
    peClient = getPeClient(username, onLine)
    if (!peClient) {
        const { PaperExplainedClient } = require('./modules/Communication.js')
        peClient = new PaperExplainedClient('articles', username)
    }

    if (onLine) {
        peClient.amILogin((isLogin) => {
            event.reply('profile:login-check-reply', isLogin, username)
        }, (error) => {
            log.error(`Unknown error: ${error}`)
            event.reply('profile:login-check-reply', false, username)
        })
    } else {
        // If offline now, allow the user's operation
        event.reply('profile:login-check-reply', false, username)
    }
})

ipcMain.on('profile:login-submit', (event, username, password) => {
    peClient = getPeClient()
    peClient.login(username, password, (res) => {
        console.info('登录成功: ', res)
        closeLoginModal()
        mainWindow.webContents.send('profile:login-success', username)
    }, (err) => {
        console.warn('登录失败: ', err)
        event.reply('profile:login-submit-failed', err)
    })
})

ipcMain.on('link:open', (event, link) => {
    shell.openExternal(link);
})

ipcMain.on('article:file-dropped', (event, fpath) => {
    addLocalFileToEditor(fpath, mainWindow)
})


app.whenReady().then(() => {
    // 注册一个'CommandOrControl+X' 快捷键监听器
    const ret = globalShortcut.register('CommandOrControl+O', () => {
        openLocalMarkdown(null, mainWindow, null)
    })

    if (!ret) {
        log.error('registration failed')
    }
})

app.on('will-quit', () => {
    // 注销快捷键
    globalShortcut.unregister('CommandOrControl+O')

    // 注销所有快捷键
    globalShortcut.unregisterAll()
})
