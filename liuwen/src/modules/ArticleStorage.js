const { dirConfig, version, UserDirConfig } = require('./config');
const { writeFileSync, readFile, readFileSync, rm, accessSync, constants } = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/*
Configure File Format:
-------------------------------------------
{
    'version': '',
    'articles': {
        id: articleInfo
    },
    'pathFinder': {
        contentFilePath: id
    }
}

Article Information (articleInfo):
-------------------------------------------
{
    fieldname: fieldvalue
}

fields: [
    'localId',
    'title',
    'desc',
    'filePath',
    'tags',
    'status',
    'paperId',
    'articleId',
    'issued',               // 已发布
    'contributed',          // 已投稿
    'synced',               // 已同步
    'lastSync',
    'artType',
    'mdContent',
    'renderedHtml',
    'localCreatedOn',
    'lastUpdate',
    'createdOn',
    'isIssued'
]
*/


class ArticleStorage {
    constructor(username) {
        this.username = username
        this.dirConfig = new UserDirConfig(username)
        this.articleDataDir = this.dirConfig.articleDir()
        this.articleConfigPath = this.dirConfig.articleConfigPath()
        this.articleReverseFinderPath = this.dirConfig.articlePathReverseFinderPath()
    }

    genNewArticleId() {
        return uuidv4();
    }

    deleteReversePath(fpath) {
        try {
            accessSync(this.articleReverseFinderPath, constants.F_OK)
            var reverseDict = this.readJsonFile(this.articleReverseFinderPath)
            if (reverseDict[fpath]) {
                delete reverseDict[fpath]
                writeFileSync(this.articleReverseFinderPath, JSON.stringify(reverseDict))
            }
            return
        } catch (err) {
            this.buildArticleReversePathFinder()
        }
    }

    addReversePath(fpath, localId) {
        try {
            accessSync(this.articleReverseFinderPath, constants.F_OK)
        } catch (err) {
            this.buildArticleReversePathFinder()
        }

        var reverseDict = this.readJsonFile(this.articleReverseFinderPath)
        reverseDict[fpath] = localId
        writeFileSync(this.articleReverseFinderPath, JSON.stringify(reverseDict))

    }

    buildArticleReversePathFinder() {
        var info = this.listArticleMetaInfo()
        var reverseDict = {}

        for (let localId in info) {
            var localContentPath = this.getArticleMdPath(localId)
            if (!localContentPath) continue
            reverseDict[localContentPath] = localId
        }

        writeFileSync(this.articleReverseFinderPath, JSON.stringify(reverseDict))

        return reverseDict
    }

    getArticleIdByFilePath(fpath) {
        try {
            accessSync(this.articleReverseFinderPath, constants.F_OK)
            var data = this.readJsonFile(this.articleReverseFinderPath)
        } catch (err) {
            var data = this.buildArticleReversePathFinder()
        }

        return data[fpath]
    }

    addArticleMeta(id, meta) {
        var initData = {
            'version': version,
            'articles': {}
        }
        var data = null;
        try {
            data = readFileSync(this.articleConfigPath)
        } catch (err) {
            if (err.code != 'ENOENT') {
                throw err
            }
        }
        if (!data) {
            data = initData
        } else {
            data = JSON.parse(data)
        }
        if (data['articles'][id]) {
            console.log(`ID 已存在: ${id}`)
            return
        }
        data['articles'][id] = meta
        writeFileSync(this.articleConfigPath, JSON.stringify(data))
    }

    deleteArticleMeta(id) {
        readFile(this.articleConfigPath, (err, data) => {
            if (err) {
                console.log(err)
                return
            }
            data = JSON.parse(data)
            if (data['articles'][id] == undefined) {
                return
            }
            this.deleteReversePath(data['articles'][id].fpath)
            delete data['articles'][id]
            writeFileSync(this.articleConfigPath, JSON.stringify(data))
        })
    }

    updateArticleMeta(id, meta) {
        meta.id = id
        readFile(this.articleConfigPath, (err, data) => {
            if (err) {
                console.log(err)
                return
            }
            data = JSON.parse(data)
            if (data['articles'][id] == undefined) {
                this.addArticleMeta(id, meta)
                return
            }
            for (let k in meta) {
                data['articles'][id][k] = meta[k]
            }
            writeFileSync(this.articleConfigPath, JSON.stringify(data))
        })
    }

    getArticleMeta(id) {
        var meta = this.listArticleMetaInfo();
        return meta[id]
    }

    listArticleMetaInfo() {
        try {
            var raw = readFileSync(this.articleConfigPath)
        } catch (e) {
            console.log('文件不存在！', e)
            return []
        }
        if (raw) {
            var data = JSON.parse(raw)
        } else {
            var data = {}
        }
        return data['articles']
    }

    getArticleMdPath(id) {
        var fpath = this.getArticleMetaContentPath(id)
        if (!fpath) {
            console.log(`Meta文件不存在 ${id}`)
            return
        }

        var meta = this.readJsonFile(fpath)
        if (!meta) {
            return
        }

        return meta.filePath
    }

    getArticleMetaContentPath(id) {
        var meta = this.getArticleMeta(id)
        if (!meta) {
            return null
        }
        return meta.fpath
    }

    updateArticleInfo(fpath, info) {
        this.updateJsonFile(fpath, info)
    }

    updateJsonFile(fpath, info) {
        var data = this.readJsonFile(fpath)

        for (let k in info) {
            data[k] = info[k]
        }
        writeFileSync(fpath, JSON.stringify(data))
    }

    readJsonFile(fpath) {
        var data = {}

        try {
            data = JSON.parse(readFileSync(fpath))
        } catch (err) {}

        return data
    }

    /*
    参数：
        info: 文章信息
        type: ISSUED/EDITING
    */
    createArticle(info) {
        var meta = {};
        var localId = this.genNewArticleId();
        info['id'] = localId;

        // add default value
        if (!info.status) {
            info.status = '尚未同步'
        }

        info.contributed = false
        info.synced = false
        var ofname = path.join(this.articleDataDir, `${localId}.json`);
        writeFileSync(ofname, JSON.stringify(info));
        meta['id'] = localId
        meta['fpath'] = ofname
        meta['localCreatedOn'] = Date.now()
        this.addArticleMeta(localId, meta)
        this.addReversePath(info.filePath, localId)

        return localId;
    }

    deleteArticle(id) {
        var meta = this.getArticleMeta(id)
        if (!meta) {
            return
        }
        rm(meta.fpath, (err) => {
            if (err) {
                console.log('删除文件出错，元信息：', meta)
                console.log(`删除文件出错：${err}`)
            }
        })
        this.deleteArticleMeta(id)
    }

    updateArticle(id, info) {
        var fpath = this.getArticleMetaContentPath(id)
        if (!fpath) {
            console.log(`文件不存在：${fpath}`)
            return
        }
        if (info.synced && !info.contributed && !info.issued) {
            info.status = '已同步'
        }
        info.lastSync = Date.now()
        info['lastUpdate'] = Date.now()
        this.updateArticleInfo(fpath, info)
    }

    updateArticleContent(id, content) {
        var filePath = this.getArticleMdPath(id)
        if (!filePath) {
            console.log(`未找到源文件：${id}`)
        }
        this.updateArticle(id, {})
        writeFileSync(filePath, content)
    }

    parseSimpleDate(timestamp) {
        var date = new Date(timestamp)
        return `${date.toLocaleDateString()} ${date.getHours()}:${date.getMinutes()}`
    }

    getArticle(id) {
        var fpath = this.getArticleMetaContentPath(id)
        if (!fpath) {
            console.log(`文件不存在：${fpath}, id: ${id}`)
            return
        }
        var raw = readFileSync(fpath)
        if (!raw) {
            console.log('return none')
            return {}
        }
        var info = JSON.parse(raw);
        var filePath = info['filePath']
        var rawinfo = readFileSync(filePath)
        info['mdContent'] = rawinfo.toString()
        if (!info.localCreatedOn) {
            info.localCreatedOn = Date.now()
            this.updateArticle(id, { localCreatedOn: Date.now() })
        }
        info.localCreatedOn = this.parseSimpleDate(info.localCreatedOn)

        if (!info.lastUpdate) {
            info.lastUpdate = Date.now()
            this.updateArticle(id, { lastUpdate: Date.now() })
        }
        info.lastUpdate = this.parseSimpleDate(info.lastUpdate)
        if (typeof info.tags == 'string') {
            var ts = []
            for (let t of info.tags.split(',')) {
                ts.push(t.trim())
            }
            info.tags = ts
        }
        return info
    }

    listEditingArticle() {
        var info = this.listArticleMetaInfo()
        var editing = {}
        for (let localId in info) {
            var ai = info[localId]
            if (!ai.issued) {
                editing[localId] = this.getArticle(localId)
            }
        }
        return editing
    }

    listIssuedArticle() {
        var info = this.listArticleMetaInfo()
        var issued = {}
        for (let localId in info) {
            var ai = info[localId]
            if (ai.issued) {
                issued[localId] = this.getArticle(localId)
            }
        }

        return issued
    }
}

module.exports = {
    ArticleStorage
}