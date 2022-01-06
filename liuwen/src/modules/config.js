const { randomBytes } = require('crypto')
const { app } = require('electron')
const { mkdirSync } = require('fs')
const path = require('path');
const keytar = require('keytar')
const md5 = require('md5')


CONFIG = {
    db: {
        'type': 'sqlite',
        'name': 'liuwen.sqlite',
        'passwordAccount': 'EditorDB'
    },
    relDir: {
        'database': 'db',
        'data': 'data',
        'article-data': 'data/articles',
        'private': 'private'
    },
    serviceName: 'LiuWenEditor',
    passwordLen: 16,
    articleConf: {
        'filename': 'article.json',
        'pathReverseFinderFname': 'path-reverse-finder.json'
    },
    keyValueStoreRelDir: 'data/keyvalues',
    settingsConfig: {
        'filename': 'settings.json',
        'dirname': 'data'
    },
    version: 'v0.1.0'
}
baseDir = app.getPath('userData')
userHome = app.getPath('home')

class DirConfig {

    constructor() {
        this.CONFIG = CONFIG
        this.baseDir = baseDir
    }

    keyValueStoreDir() {
        var dp = this.fullPath(this.CONFIG.keyValueStoreRelDir)
        mkdirSync(dp, { recursive: true })
        return dp
    }

    dataDir() {
        var dp = this.fullPath(this.CONFIG['relDir']['data'])
        mkdirSync(dp, { recursive: true })
        return dp
    }

    articleDir() {
        var dp = this.fullPath(this.CONFIG['relDir']['article-data'])
        mkdirSync(dp, { recursive: true })
        return dp
    }

    articleConfigPath() {
        return path.join(this.articleDir(), this.CONFIG.articleConf.filename)
    }

    articlePathReverseFinderPath() {
        return path.join(this.articleDir(), this.CONFIG.articleConf.pathReverseFinderFname)
    }

    dbDir() {
        return this.fullPath(this.CONFIG['relDir']['database'])
    }

    dbPath() {
        return path.join(this.dbDir(), this.CONFIG['db']['name'])
    }

    settingsDir() {
        var dp = this.fullPath(this.CONFIG.settingsConfig.dirname)
        mkdirSync(dp, { recursive: true })
        return dp
    }

    settingsPath() {
        return path.join(this.settingsDir(), this.CONFIG.settingsConfig.filename)
    }

    fullPath(relpath) {
        return path.join(this.baseDir, relpath)
    }
}


class UserDirConfig {

    constructor(username) {
        this.CONFIG = CONFIG
        this.appDir = app.getPath('userData')
        this.baseDir = path.join(app.getPath('userData'), `userdata/${md5(username)}`)
    }

    keyValueStoreDir() {
        var dp = this.fullPath(this.CONFIG.keyValueStoreRelDir)
        mkdirSync(dp, { recursive: true })
        return dp
    }

    dataDir() {
        var dp = this.fullPath(this.CONFIG['relDir']['data'])
        mkdirSync(dp, { recursive: true })
        return dp
    }

    articleDir() {
        var dp = this.fullPath(this.CONFIG['relDir']['article-data'])
        mkdirSync(dp, { recursive: true })
        return dp
    }

    articleConfigPath() {
        return path.join(this.articleDir(), this.CONFIG.articleConf.filename)
    }

    articlePathReverseFinderPath() {
        return path.join(this.articleDir(), this.CONFIG.articleConf.pathReverseFinderFname)
    }

    dbDir() {
        return this.fullPath(this.CONFIG['relDir']['database'])
    }

    dbPath() {
        return path.join(this.dbDir(), this.CONFIG['db']['name'])
    }

    settingsDir() {
        var dp = this.fullPath(this.CONFIG.settingsConfig.dirname)
        mkdirSync(dp, { recursive: true })
        return dp
    }

    settingsPath() {
        return path.join(this.settingsDir(), this.CONFIG.settingsConfig.filename)
    }

    fullPath(relpath) {
        return path.join(this.baseDir, relpath)
    }
}

class UserWorkspace {
    constructor(username) {
        this.username = username
    }

    articleDir() {
        var rel = path.join(CONFIG.relDir.private, this.username)
        var dp = this.fullPath(rel)
        mkdirSync(dp, { recursive: true })
        return dp
    }

    articleConfigPath() {
        return path.join(this.articleDir(), this.CONFIG.articleConf.filename)
    }

    articlePathReverseFinderPath() {
        return path.join(this.articleDir(), this.CONFIG.articleConf.pathReverseFinderFname)
    }

    fullPath(relpath) {
        return path.join(this.baseDir, relpath)
    }
}

class AccountConfig {

    constructor() {
        this.serviceName = CONFIG['serviceName']
        this.passwordAccount = CONFIG['db']['passwordAccount']
        this.passwordLen = CONFIG['passwordLen']
    }

    async createPassForDB() {
        var pwBuf = randomBytes(this.passwordLen)
        var pw = pwBuf.toString('hex')
        pwBuf.fill(0)
        keytar.setPassword(this.serviceName, this.passwordAccount, pw)
        return pw
    }

    async dbPassword() {
        var pw = await keytar.getPassword(this.serviceName, this.passwordAccount)
        if (pw == null) {
            console.log('create new password')
            return this.createPassForDB()
        }
        console.log('read password from system')
        return pw
    }
}

const URLS = {
    // 'domain': 'http://www.paperexplained.com',
    'domain': 'https://paperexplained.cn',
    'urls': {
        'accounts': {
            'GET': {
                'logout': 'logout/',
                'check-login': 'amilogin/'
            },
            'POST': {
                'login': 'login/'
            }
        },
        'aplayground': {
            'GET': {
                'iaqa-slchoice-delete': 'selection-choice/delete/{ch_id}/',
                'ias-init': 'iasection/init/{article_id}/',
                'ias-delete': 'iasection/delete/{section_id}/',
                'ias-component-delete': 'iasection/component-delete/{ct}/{cp_id}',
                'ia-invalidate-cps': 'iarticle/cps/invalid/{article_id}/',
                'ia-recover-cps': 'iarticle/cps/recover/{article_id}/',
                'ia-remove-invalid-cps': 'iarticle/cps/remove/{article_id}/'
            },
            'POST': {
                'ia-fetch': 'iarticle/fetch/',
                'ia-create': 'iarticle/create/',
                'ia-update': 'iarticle/update/{article_id}/',
                'ia-author-list': 'iarticle/author-list/',
                'gia-create': 'giarticle/create/',
                'ia-title-update': 'iarticle-title/update/{article_id}/',
                'ia-cover-update': 'iarticle-cover/update/{article_id}/',
                'ia-desc-update': 'iarticle-desc/update/{article_id}/',
                'ia-tags-update': 'iarticle-tags/update/{article_id}/',
                'ias-update': 'iasection/update/{section_id}/',
                'iap-create': 'ias-paragraph/create/{section_id}/',
                'iap-update': 'ias-paragraph/update/{paragraph_id}/',
                'iass-create': 'ias-subsection/create/{section_id}/',
                'iass-update': 'ias-subsection/update/{subsection_id}/',
                'iaqa-ce-create': 'ce-question/create/{section_id}/',
                'iaqa-ce-update': 'ce-question/update/{qa_id}/',
                'iaqa-ct-create': 'ct-question/create/{section_id}/',
                'iaqa-ct-update': 'ct-question/update/{qa_id}/',
                'iaqa-sl-create': 'sl-question/create/{section_id}/',
                'iaqa-sl-update': 'sl-question/update/{qa_id}/',
                'iaqa-slchoice-create': 'selection-choice/create/{sl_id}/',
                'upload-image': 'iarticleimage/create/',
                'list-image': 'iarticleimage/list/',
                'image-exists': 'iarticleimage/exists/'
            }
        },
        'articles': {
            'GET': {
                'list-article': 'article/alist/',
                'article-meta': 'article/meta/{article_id}/'
            },
            'POST': {
                'article-submit-censor': 'article/submit-censor/',
                'upload-image': 'articleimage/create/',
                'list-image': 'articleimage/list/',
                'paper-title': 'paper-title/',
                'article-title': 'article-title/',
                'grocery-article-update-title': 'garticle-title/aupdate/{article_id}/',
                'paper-article-id': 'paper-article-id/',
                'paper-article-create': 'article/acreate/',
                'paper-article-update': 'article/aupdate/{article_id}/',
                'paper-article-update-content': 'article-content/aupdate/{article_id}/',
                'paper-article-update-tags': 'article-tags/aupdate/{article_id}/',
                'paper-article-update-desc': 'article-desc/aupdate/{article_id}/',
                'image-exists': 'articleimage/exists/',
                'grocery-article-create': 'garticle/create/'
            }
        }
    }
}
const WORK_DIR = '/tmp'
const WORK_BASE = path.join(WORK_DIR, 'pe/images')

module.exports = {
    domain: 'http://paperexplained.com',
    dirConfig: new DirConfig(),
    accountConfig: new AccountConfig(),
    URLS,
    WORK_DIR,
    WORK_BASE,
    UserWorkspace,
    UserDirConfig
}