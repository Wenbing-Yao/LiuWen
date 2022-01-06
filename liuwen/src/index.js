const { app, BrowserWindow, dialog, globalShortcut, ipcMain, nativeTheme, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const isDev = false;

// const { db: liuwenDb } = require('./modules/db')
// const { accountConfig } = require('./modules/config')
const { ArticleStorage } = require('./modules/ArticleStorage')
const { CloudArticle } = require('./modules/CloudArticle')
const { PaperExplainedClient } = require('./modules/Communication.js')
const { closeArticleDeleteModal, fetchLocalId, openArticleDeleteModal } = require('./modules/Modal')
const { settingStorage } = require('./modules/UserSettings')

let mainWindow = null
let loginWindow = null
let userinfoModal = null
let peClient = null


function getPeClient(username = null) {
    if (username == null)
        username = settingStorage.getUsername()

    if (!peClient) {
        peClient = new PaperExplainedClient('articles', username)
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
                extensions: ['md', 'markdown']
            }]
        });
    }

    fs.writeFileSync(file, content)

    return file
}

function fetchFileContent() {
    var fpath = dialog.showOpenDialogSync({
        properties: ['openFile'],
        filters: [
            { name: 'Markdown', extensions: ['md', 'markdown'] },
            { name: '所有文件', extensions: ['*'] }
        ]
    })

    if (fpath) {
        console.log(`文件路径为：${fpath}`)
        return fpath[0]
    }

    console.log('未选择文件')
    return null
}

const createWindow = async () => {
    // Create the browser window.
    if (!mainWindow) {
        mainWindow = new BrowserWindow({
            width: 1920,
            height: 1080,
            webPreferences: {
                'preload': path.join(__dirname, 'preload.js')
            }
        });
    }
    // peClient = new PaperExplainedClient('articles')

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

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

    // Open the DevTools.
    if (isDev) {
        console.log('这是开发者环境，打开开发者工具。')
        console.log('this is a development environment!', isDev)
        mainWindow.webContents.openDevTools();
    }

    // var pw = await accountConfig.dbPassword()

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        // getFileFromUser();
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
    if (!peClient.isLogin) {
        event.reply('article:render-reply', type, [])
        console.log(`user is not login, so not article is issued!`)
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
    }
}

ipcMain.on('article:check-status', (event, localId, cloudId) => {
    var client = getArticleClient(localId)
    client.articleMeta(cloudId,
        (info) => handleFreshArticleMeta(info, localId, event),
        (err) => console.log('article meta error: ', err),
    )
})

ipcMain.on('article:check-issued', (event, localId) => {
    var client = getArticleClient(localId)
    var store = getStorage()
    var preInfo = store.getArticle(localId)
    console.log(`check issued: ${localId}`)

    if (!preInfo.cloudId) {
        console.log(`Article cloud id not set: [${localId}]`)
        return
    }

    client.articleMeta(preInfo.cloudId,
        (info) => handleFreshArticleMeta(info, localId, event),
        (err) => console.log('article meta error: ', err),
    )
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
            event.reply('article:syn-to-cloud-reply', localId, cloudInfo)
        }
    })
})

ipcMain.on('article:issue-article', (event, localId) => {
    var client = getArticleClient(localId)
    var cloudInfo = {
        'status': '已提交'
    }
    client.articleSubmitCensor().then(info => {
        if (info.status == '已提交') {
            cloudInfo.status = info.status
            event.reply('article:issue-article-reply', localId, true, cloudInfo)
        } else {
            event.reply('article:issue-article-reply', localId, false)
        }
    })
})

ipcMain.on('article:delete', (event, localId, deleteCloud, deleteFile) => {
    openArticleDeleteModal(localId, mainWindow)
})

ipcMain.on('article:modal-delete-render', (event) => {
    var localId = fetchLocalId()
    if (!localId) {
        console.log('no localid')
        event.reply('article:modal-delete-render-reply', null)
        return
    }
    var store = getStorage()
    var artInfo = store.getArticle(localId)
    event.reply('article:modal-delete-render-reply', artInfo)
})

ipcMain.on('article:modal-delete-close', (event, localId) => {
    console.log('delete close:', localId)
    closeArticleDeleteModal(localId)
})

ipcMain.on('article:modal-delete-confirm', (event, localId) => {
    closeArticleDeleteModal(localId)
    console.log('confirm article delete: ', localId);
    // 1. local storage delete
    var store = getStorage()
    store.deleteArticle(localId)

    // 2. cloud delete
    // TODO: 

    // 3. element delete
    mainWindow.webContents.send('article:element-delete', localId)

    // 4. local file delete
    // TODO:
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


function openLoginModal() {
    // Child login window
    if (!loginWindow) {
        loginWindow = new BrowserWindow({
            width: 360,
            height: 400,
            parent: mainWindow,
            modal: true,
            show: false,
            title: "登录",
            webPreferences: {
                'preload': path.join(__dirname, 'loginPreload.js')
            }
        })
    }
    loginWindow.loadFile(path.join(__dirname, 'templates/profile/login.html'))
    loginWindow.once('ready-to-show', () => {
        loginWindow.show()
    })

    loginWindow.on('closed', () => {
        loginWindow = null
    })
}

function openUserinfoModal() {
    if (!userinfoModal) {
        userinfoModal = new BrowserWindow({
            width: 400,
            height: 400,
            parent: mainWindow,
            modal: true,
            show: false,
            title: "用户信息",
            webPreferences: {
                'preload': path.join(__dirname, 'preloads/userinfoPreload.js')
            }
        })
    }

    userinfoModal.loadFile(path.join(__dirname, 'templates/profile/user.html'))
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
        console.log(`User login status: ${status}`)
    })

})

ipcMain.on('profile:userinfo-show', (event) => {
    openUserinfoModal()
    try {
        peClient = getPeClient()
        var checkLogin = peClient.get('checkLogin', (res) => {
            console.info('login success: ', res.login)
        }, (err) => {
            console.error('login error: ', err)
        })

        checkLogin.then((data) => {
            console.info('promise check login: ', data)
        })

        var listArticle = peClient.get('listArticle', (res) => {
            console.info('Article List: ', res)
        }, (err) => {
            console.error('Article list error: ', err)
        })

        listArticle.then((data) => {
            console.info('promise list article: ', data)
        })

        var paperTitle = peClient.post('paperTitle', { paper_id: '62cb06e6d7164d26a1957c374c7669d720831d64' }, null, (res) => {
            console.info('Paper Title: ', res.title)
        }, (err) => {
            console.error('Paper Title error: ', err)
        })

        paperTitle.then(data => {
            console.log('promise paper title: ', data)
        })


        peClient.post('articleTitle', { article_id: 23 }, null, (res) => {
            console.info('Article Title: ', res.title)
        }, (err) => {
            console.error('Article Title error: ', err)
        })
    } catch (err) {
        console.error(err)
    }
})

ipcMain.on('profile:userinfo-close', (event) => {
    closeUserinfoModal()
})

ipcMain.on('profile:logout', (event) => {
    peClient = getPeClient()
    peClient.get('logout',
        res => {
            closeUserinfoModal()
            mainWindow.webContents.send('profile:logout-success')
        },
        err => console.log('Logout failed:', err))
})

ipcMain.on('profile:login-cancel', (event) => {
    closeLoginModal()
})

ipcMain.on('profile:login-check', (event) => {
    var username = settingStorage.getUsername()
    peClient = getPeClient(username)
    if (!peClient) {
        peClient = new PaperExplainedClient('articles', username)
    }
    peClient.amILogin((isLogin) => {
        event.reply('profile:login-check-reply', isLogin, username)
    })
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

function addLocalFileToEditor(fpath) {
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
        console.log(`这篇文章已经在编辑器中了！文件路径：${fpath}`)
        var art = store.getArticle(localId)
        if (art) {
            mainWindow.webContents.send('article:show-rendered', art)
            return
        }
        store.deleteReversePath(fpath)
        localId = null
    }

    console.log(`文章不在编辑器中，现在添加：${fpath}`)
    localId = store.createArticle(articleInfo)
    mainWindow.webContents.send('article:create-reply',
        store.getArticle(localId))
}

ipcMain.on('article:file-dropped', (event, fpath) => {
    addLocalFileToEditor(fpath)
})


app.whenReady().then(() => {
    // 注册一个'CommandOrControl+X' 快捷键监听器
    const ret = globalShortcut.register('CommandOrControl+O', () => {
        var fpath = fetchFileContent()
        addLocalFileToEditor(fpath)
    })

    if (!ret) {
        console.log('registration failed')
    }

    // 检查快捷键是否注册成功
    // console.log(globalShortcut.isRegistered('CommandOrControl+O'))
})

app.on('will-quit', () => {
    // 注销快捷键
    globalShortcut.unregister('CommandOrControl+O')

    // 注销所有快捷键
    globalShortcut.unregisterAll()
})