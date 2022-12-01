const { accessSync, constants, readFileSync, mkdirSync } = require('fs')
const md5File = require('md5-file')
const md5 = require('md5')
const os = require('os')
const path = require('path')
const JSSoup = require('jssoup').default

const { ArticleStorage } = require('./ArticleStorage')
const { PaperExplainedClient } = require('./Communication')
const { Markdown } = require('./LiuwenMarkDown')
const { WORK_BASE } = require('./config')
const { trans: _ } = require('../locale/i18n')
const { getLogger } = require('../modules/render/utils')
const { IAEncoder } = require('./IAComponent')

const logger = getLogger(__filename)

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function fileExists(fpath) {
    try {
        accessSync(fpath.trim(), constants.F_OK)
        return true
    } catch (err) {
        return false
    }
}


function getStorage(username = null) {
    if (username == null) {
        username = settingStorage.getUsername()
    }

    return new ArticleStorage(username)
}

class CloudArticle {
    static APP_NAME = 'articles'
    static DIR_TITLE = _('Table of Contents')

    constructor(localId, username) {
        this.localId = localId
        this.username = username
        this.client = new PaperExplainedClient('articles', username)
        this.iclient = new PaperExplainedClient('aplayground', username)
        this.fclient = new PaperExplainedClient('fileuploader', username)
        this.store = getStorage(username)
        this.workon = WORK_BASE
    }

    md2html(fpath, notoc = false, numberFigure = true, addids = true) {
        var raw = readFileSync(fpath)
        var markdown = new Markdown(path.dirname(fpath))
        let markdownContent = raw.toString()
        return {
            md: markdownContent,
            html: markdown.convert(markdownContent, notoc, numberFigure, addids)
        }
    }

    replaceImageUrls(content, urlMap) {
        let lines = []
        let sfpath = urlMap.sfpath
        const rule = /^!\[([^\]]*)\][\(]([^()\[\]"\t]*(?![ ]))[ \t]*(\"[^\"]*\")?[\)](\{[^\}]*\})?/
        for (let line of content.split(os.EOL)) {
            const match = rule.exec(line)
            if (match) {
                let source = match[2].trim()
                let absSource = source
                if (source.startsWith('.')) {
                    absSource = path.join(path.dirname(sfpath), source)
                }
                if (urlMap[absSource]) {
                    lines.push(line.replace(source, urlMap[absSource]))
                } else {
                    lines.push(line)
                }
                continue
            } else {
                lines.push(line)
            }
        }
        return lines.join(os.EOL)
    }

    download(url, odir, success, error) {
        return this.client.download(url, odir, success, error)
    }

    isValidHttpUrl(string) {
        let url;

        try {
            url = new URL(string);
        } catch (_) {
            return false;
        }

        return url.protocol === "http:" || url.protocol === "https:";
    }

    fileExists(hexdigest, success, error) {
        return this.fclient.get('fileExists', (info) => {
            return success(info.exists, info.url)
        }, error, {
            'hexdigest': hexdigest
        })
    }

    uploadFile(source, pure, success, error) {
        const hexdigest = md5File.sync(source)
        return this.fileExists(hexdigest, (exists, fileUrl) => {
            if (exists) {
                logger.info(`files exists: ${fileUrl}`)
                if (pure) {
                    success(fileUrl)
                } else {
                    success(`file exists: ${fileUrl}`)
                }
                return fileUrl
            }
        }, error).then(info => {
            if (info.exists) {
                logger.info(`file exists: ${info.url}`)
                return info.url
            }
            logger.info(`Start upload image: ${source}`)
            return this.fclient.post('uploadFile', {
                hexdigest: hexdigest
            }, {
                file: source
            }, (uploadRes) => {
                if (pure) {
                    success(uploadRes.file)
                } else {
                    success(`file exists: ${uploadRes.file}`)
                }
                return uploadRes.file
            }).then(info => {
                return info.file
            })
        })
    }

    prepareFile(source, workon, success, error) {
        source = decodeURI(source)
        source = source.replaceAll("&#32;", " ")
        if (fileExists(source)) {
            return this.uploadFile(source, true, success, error)
        }

        if (!this.isValidHttpUrl(source)) {
            logger.info('Not local file and invalid URL', source)
            return source
        }

        let fpath = path.join(workon, path.basename(source))
        if (fileExists(fpath)) {
            return this.uploadFile(fpath, true, success, error)
        } else {
            logger.info('Not local file, try to download:', fpath)
        }

        return this.download(source, workon, (ofname) => {
            return this.uploadFile(path.join(workon, ofname), true, success, error)
        }, () => {
            logger.error(`Prepare file, download failed: ${source}`)
        })
    }

    prepareImage(source, workon, success, error) {
        source = decodeURI(source)
        source = source.replaceAll("&#32;", " ")
        if (fileExists(source)) {
            return this.uploadImage(source, true, success, error)
        } else {
            if (!this.isValidHttpUrl(source)) {
                logger.info('文件不存在本地！且不是一个有效的 http URL', source)
                return source
            }
        }

        var fpath = path.join(workon, path.basename(source))
        if (fileExists(fpath)) {
            return this.uploadImage(fpath, true, success, error)
        } else {
            logger.info('文件不存在本地，尝试从网络下载！', fpath)
        }

        return this.download(source, workon, (ofname) => {
            return this.uploadImage(path.join(workon, ofname), true, success, error)
        }, () => {
            logger.error(`Prepare an image, download failed: ${source}`)
        })
    }

    imageExists(hexdigest, success, error) {
        return this.fclient.get('imageExists', (info) => {
            return success(info.exists, info.url)
        }, error, {
            'hexdigest': hexdigest
        })
    }

    uploadImage(source, pure, success, error) {
        if (!fileExists(source)) {
            error(`图片 ${source} 不存在`)
            return
        }

        const hexdigest = md5File.sync(source)
        return this.imageExists(hexdigest, (exists, imageUrl) => {
            if (exists) {
                logger.info(`图片已存在，无需再次上传: ${source}`)
                if (pure) {
                    success(imageUrl)
                } else {
                    success(`图片已存在，url为: ${imageUrl}`)
                }
                return imageUrl
            } else {

            }
        }, error).then(info => {
            if (info.exists) {
                logger.info('image exists: ', info.url)
                return info.url
            } else {
                logger.info(`Start upload image: ${source}`)
                return this.fclient.post('uploadImage', {
                    hexdigest: hexdigest
                }, {
                    image: source
                }, (uploadRes) => {
                    if (pure) {
                        success(uploadRes.image)
                    } else {
                        success('图片已上传，url为: ', uploadRes.image)
                    }
                    return uploadRes.image
                }).then(info => {
                    return info.image
                })
            }
        })
    }

    listImage(days = 7, success, error) {
        this.client.post('listImage', { days: days }, null, success, error)
    }

    paperTitle(paperId, success, error) {
        this.client.post('paperTitle', { paper_id: paperId }, null, success, error)
    }

    articleMeta(articleId, success, error) {
        this.client.get('articleMeta', success, error, {
            article_id: articleId
        })
    }

    articleDelete(articleId, isPlayground, success, error) {
        if (isPlayground) {
            return this.iclient.get('iarticleDelete', success, error, {
                iarticle_id: articleId
            })
        }
        this.client.get('articleDelete', success, error, {
            article_id: articleId
        })
    }

    articleTitle(articleId, success, error) {
        this.client.post('articleTitle', { article_id: articleId }, null, success, error)
    }

    uploadAndReplaceFiles(html, paperId, rehash, sfpath, success, error) {
        var soup = new JSSoup(html)

        // fetch images to be uploaded
        var imgs = soup.findAll('img')
        var _imageSources = []
        for (let img of imgs) {
            if (!img.attrs.src) {
                continue
            }
            _imageSources.push(img.attrs.src.trim())
        }
        if (rehash) {
            paperId = md5(paperId)
        }
        var workon = path.join(this.workon, paperId)
        mkdirSync(workon, { recursive: true })

        var imageSources = _imageSources.filter(onlyUnique)
        var waitingUrls = []
        for (let ipath of imageSources) {
            if (sfpath && ipath.startsWith('.')) {
                ipath = path.join(path.dirname(sfpath), ipath)
            }
            waitingUrls.push(this.prepareImage(
                ipath, workon,
                info => logger.info('upload image success:', info),
                err => logger.error('upload image failed:', err)))
        }

        // fetch files to be uploaded
        var links = soup.findAll('a')
        var fileSources = []
        for (let link of links) {
            if (!link.attrs.role || link.attrs.role != 'mdlink' || !link.attrs.href) {
                continue
            }
            fileSources.push(link.attrs.href)
        }
        fileSources = fileSources.filter(onlyUnique)
        for (let ipath of fileSources) {
            if (sfpath && ipath.startsWith('.')) {
                ipath = path.join(path.dirname(sfpath), ipath)
            }

            waitingUrls.push(this.prepareFile(
                ipath, workon,
                info => logger.info('upload image success:', info),
                err => logger.error('upload image failed:', err)
            ))
        }

        let waitingSources = imageSources.concat(fileSources)

        Promise.all(waitingUrls).then((values) => {
            var urlMap = {}
            urlMap.sfpath = sfpath
            for (let i in waitingSources) {
                if (values[i]) {
                    urlMap[waitingSources[i]] = values[i]
                }
            }
            imgs = soup.findAll('img')
            for (let img of imgs) {
                if (urlMap[img.attrs.src]) {
                    img.attrs.src = urlMap[img.attrs.src]
                }
            }

            for (let link of links) {
                if (!link.attrs.role || link.attrs.role != 'mdlink' || !link.attrs.href) {
                    continue
                }
                if (link.attrs.href) {
                    link.attrs.href = urlMap[link.attrs.href]
                }
            }
            return success(soup.toString(), urlMap)
        })

    }

    createPaperArticle(paperId, tags, desc, fpath, success, error) {
        if (typeof tags != "string") {
            tags = tags.join(',')
        }

        let md = null
        let html = null

        if (fpath.endsWith('md')) {
            var info = this.md2html(fpath)
            md = info.md
            html = info.html
        } else {
            html = readFileSync(fpath)
        }

        this.uploadAndReplaceFiles(html, paperId, false, fpath, (content, urlMap) => {
            let artInfo = {
                paper: paperId,
                tags: tags,
                desc: desc,
                content: content
            }
            if (md) {
                if (urlMap) {
                    md = this.replaceImageUrls(md, urlMap)
                }
                artInfo.markdown_content = md
            }
            this.client.post('paperArticleCreate', artInfo, null, success, error)
        })
    }

    paperArticleId(paperId, success, error) {
        this.client.post('paperArticleId', { paper_id: PaperId }, null, success, error)
    }

    updatePaperArticleContent(paperId, articleId, fpath, success, error) {

        let md = null
        let html = null

        if (fpath.endsWith('md')) {
            var info = this.md2html(fpath)
            md = info.md
            html = info.html
        } else {
            html = readFileSync(fpath)
        }

        this.uploadAndReplaceFiles(html, paperId, false, fpath, (content, urlMap) => {
            var artInfo = { content: content }
            if (md) {
                if (urlMap) {
                    md = this.replaceImageUrls(md, urlMap)
                }
                artInfo.markdown_content = md
            }

            this.client.post('paperArticleUpdateContent', artInfo,
                null,
                success,
                error, { article_id: articleId })
        })
    }

    updateContent(title, articleId, fpath, success, error, rehash = true) {
        let md = null
        let html = null

        if (fpath.endsWith('md')) {
            var info = this.md2html(fpath)
            md = info.md
            html = info.html
        } else {
            html = readFileSync(fpath)
        }

        this.uploadAndReplaceFiles(html, title, rehash, fpath, (content, urlMap) => {
            var artInfo = { content: content }
            if (md) {
                if (urlMap) {
                    md = this.replaceImageUrls(md, urlMap)
                }
                artInfo.markdown_content = md
            }

            this.client.post('paperArticleUpdateContent', artInfo,
                null,
                success,
                error, { article_id: articleId })
        })
    }

    updateDesc(articleId, desc, success, error) {
        this.client.post('paperArticleUpdateDesc', { desc: desc }, null, success, error, { article_id: articleId })
    }

    updateTags(articleId, tags, success, error) {
        if (typeof tags != "string") {
            tags = tags.join(',')
        }
        this.client.post('paperArticleUpdateTags', { tags: tags }, null, success, error, { article_id: articleId })
    }

    updateTitle(articleId, title, success, error) {
        this.client.post('groceryArticleUpdateTitle', { article_title: title }, null, success, error, { article_id: articleId })
    }

    listArticle(success, error) {
        this.client.get('listArticle', success, error)
    }

    createGroceryArticle(title, tags, desc, fpath, success, error) {
        if (typeof tags != "string") {
            tags = tags.join(',')
        }

        let md = null
        let html = null

        if (fpath.endsWith('md')) {
            var info = this.md2html(fpath)
            md = info.md
            html = info.html
        } else {
            html = readFileSync(fpath)
        }

        this.uploadAndReplaceFiles(html, title, true, fpath, (content, urlMap) => {
            var artInfo = {
                article_title: title,
                tags: tags,
                desc: desc,
                content: content
            }
            if (md) {
                if (urlMap) {
                    md = this.replaceImageUrls(md, urlMap)
                }
                artInfo.markdown_content = md
            }

            this.client.post('groceryArticleCreate', artInfo, null, success, error)
        })
    }

    logout(success, error) {
        this.client.get('logout', success, error)
    }

    checkLogin(success, error) {
        this.client.get('checkLogin', success, error)
    }

    updateMeta(artInfo) {
        this.updateDesc(artInfo.cloudId, artInfo.desc,
            info => logger.info('desc updated:', info),
            err => logger.error('desc updated failed:', err))
        this.updateTags(artInfo.cloudId, artInfo.tags,
            info => logger.info('tags updated:', info),
            err => logger.error('tags updated failed:', err))
        this.updateTitle(artInfo.cloudId, artInfo.title,
            info => logger.info('title updated:', info),
            err => logger.error('title updated failed:', err))
    }

    articleSubmitCensor() {
        var artInfo = this.store.getArticle(this.localId)
        if (artInfo.contributed) {
            logger.info("文章已投稿！", this.localId)
            return
        }
        if (!artInfo.cloudId) {
            logger.info(`文章尚未同步到云端: ${this.localId}`)
            return
        }

        return this.client.post('articleSubmitCensor', { 'object_id': artInfo.cloudId }, null,
            info => {
                logger.info("文章投稿成功：", info)
                this.store.updateArticle(this.localId, {
                    contributed: true,
                    status: info.status
                })
            },
            err => logger.error(`文章投稿失败：${err}`))
    }

    updateIArticle(artInfo, success, error = null) {
        let tags = artInfo.tags
        let paperId = artInfo.paperId
        let desc = artInfo.desc
        let fpath = artInfo.filePath
        let title = artInfo.title
        let cloudId = artInfo.cloudId

        if (typeof tags != "string") {
            tags = tags.join(',')
        }

        let md = null
        let html = null

        if (fpath.endsWith('md')) {
            var info = this.md2html(fpath, true)
            md = info.md
            html = info.html
        } else {
            html = readFileSync(fpath)
        }

        this.uploadAndReplaceFiles(html, paperId || title, !paperId, fpath, (content, urlMap) => {
            let artInfo = {
                paper: paperId,
                special_title: title,
                tags: tags,
                desc: desc
            }
            if (md) {
                if (urlMap) {
                    md = this.replaceImageUrls(md, urlMap)
                }
                artInfo.markdown_content = md
            }

            var soup = new JSSoup(content)
            this.iclient.post('iaDetailUpdate', artInfo, null, (info) => {
                this.store.updateArticle(this.localId, {
                    cloudId: info.iarticle_id,
                    url: info.url,
                    paperTitle: info.paper_title,
                    synced: true
                })

                let encoder = new IAEncoder(soup)
                this.iclient.post('iaFresh', {
                    content: JSON.stringify(encoder.encode())
                }, null, success, error, { 'iarticle_id': info.iarticle_id })
            }, error, { 'iarticle_id': cloudId })
        })
    }

    createIArticle(artInfo, success, error = null) {
        let tags = artInfo.tags
        let paperId = artInfo.paperId
        let desc = artInfo.desc
        let fpath = artInfo.filePath
        let title = artInfo.title

        if (typeof tags != "string") {
            tags = tags.join(',')
        }

        let md = null
        let html = null

        if (fpath.endsWith('md')) {
            var info = this.md2html(fpath, true)
            md = info.md
            html = info.html
        } else {
            html = readFileSync(fpath)
        }

        this.uploadAndReplaceFiles(html, paperId || title, !paperId, fpath, (content, urlMap) => {
            let artInfo = {
                paper: paperId,
                special_title: title,
                tags: tags,
                desc: desc
            }
            if (md) {
                if (urlMap) {
                    md = this.replaceImageUrls(md, urlMap)
                }
                artInfo.markdown_content = md
            }

            var soup = new JSSoup(content)
            this.iclient.post('iaDetailCreate', artInfo, null, (info) => {
                this.store.updateArticle(this.localId, {
                    cloudId: info.iarticle_id,
                    url: info.url,
                    paperTitle: info.paper_title,
                    synced: true
                })

                let encoder = new IAEncoder(soup)
                this.iclient.post('iaFresh', {
                    content: JSON.stringify(encoder.encode())
                }, null, success, error, { 'iarticle_id': info.iarticle_id })
            }, error)
        })
    }

    syncIArticleToCloud(artInfo, success, error = null) {
        if (artInfo.cloudId) {
            return this.updateIArticle(artInfo, success, error)
        }
        return this.createIArticle(artInfo, success, error)
    }

    syncToCloud(success, error = null) {
        var artInfo = this.store.getArticle(this.localId)
        if (artInfo.playground) {
            return this.syncIArticleToCloud(artInfo, success, error)
        }
        if (artInfo.paperId) {
            this.paperTitle(artInfo.paperId,
                (info) => {
                    var paperTitle = info.title
                    if (artInfo.cloudId) {
                        this.updateContent(artInfo.paperId, artInfo.cloudId, artInfo.filePath,
                            success,
                            err => logger.error('content update failed:', err),
                            false)
                        this.updateMeta(artInfo)
                        if (!artInfo['paperTitle']) {
                            this.store.updateArticle(this.localId, {
                                paperTitle: paperTitle,
                                synced: true
                            })
                        }
                        return
                    }

                    this.createPaperArticle(
                        artInfo.paperId, artInfo.tags, artInfo.desc, artInfo.filePath,
                        info => {
                            this.store.updateArticle(this.localId, {
                                cloudId: info.article_id,
                                url: info.url,
                                paperTitle: paperTitle,
                                synced: true
                            })
                            if (success) {
                                success(info)
                            }
                        },
                        err => logger.error('paper article create failed:', err))
                },
                err => logger.error(`获取论文标题错误(ID: ${artInfo.paperId})：${err}`))
            return
        }
        if (artInfo.cloudId) {
            this.updateContent(
                artInfo.title, artInfo.cloudId, artInfo.filePath,
                info => {
                    this.store.updateArticle(this.localId, {
                        synced: true
                    })
                    if (success) {
                        success(info)
                    }
                    logger.info('content updated!')
                },
                err => logger.error('update content failed:', err))

            this.updateMeta(artInfo)
            return
        }
        this.createGroceryArticle(
            artInfo.title, artInfo.tags, artInfo.desc, artInfo.filePath,
            info => {
                this.store.updateArticle(this.localId, {
                    cloudId: info.article_id,
                    url: info.url,
                    synced: true
                })
                if (success) {
                    success(info)
                }
            },
            err => logger.error('grocery create failed:', err))
    }

    prepareCloudImage(markdownContent, baseDir, success) {
        let markdowner = new Markdown()
        let html = markdowner.convert(markdownContent)
        let soup = new JSSoup(html)
        let imgs = soup.findAll('img')
        let imageSources = []
        for (let img of imgs) {
            if (img.attrs.src) {
                imageSources.push(img.attrs.src)
            }
        }

        if (imageSources.length <= 0) {
            return success(markdownContent)
        }

        let imageUrls = []
        for (let isrc of imageSources) {
            imageUrls.push(this.download(isrc, baseDir,
                ofname => {
                    logger.info(`Download ${ofname} successfully!`)
                    return `./${ofname}`
                },
                () => logger.error(`Download "${isrc} failed!"`)))
        }

        return Promise.all(imageUrls).then((values) => {
            var urlMap = {}
            for (let i in imageSources) {
                urlMap[imageSources[i]] = values[i]
            }

            let md = this.replaceImageUrls(markdownContent, urlMap)
            success(md)
            return urlMap
        })
    }

    syncAllToLocal(existings, browserWindow) {
        logger.info("existings:", existings, typeof existings, existings.length)
        this.client.post('articleSync2local', { 'ids': existings }, null,
            arts => {
                for (let art of arts) {

                    // logger.info('start sync art: ', art)
                    // 1. save local storage
                    this.store.syncCloudArticle(art, (localId) => {
                        let baseDir = this.store.cloudArticleImageDir(art)
                        this.prepareCloudImage(art.markdown_content, baseDir, (md) => {
                            // 1.1 update article content
                            this.store.updateArticleContent(localId, md)

                            // 2. add renders
                            let article = this.store.getArticle(localId)
                            browserWindow.webContents.send('article:sync-to-local-reply', article)
                        })
                    })
                }
            },
            err => {
                logger.error(`文章同步失败：`)
                logger.error(err)
            })
    }
}

module.exports = {
    CloudArticle
}