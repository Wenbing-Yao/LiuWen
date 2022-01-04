const { accessSync, constants, readFileSync, mkdirSync } = require('fs')
const md5File = require('md5-file')
const md5 = require('md5')
const path = require('path')
const JSSoup = require('jssoup').default

const { ArticleStorage } = require('./ArticleStorage')
const { PaperExplainedClient } = require('./Communication')
const { Markdown } = require('./LiuwenMarkDown')
const { WORK_BASE } = require('./config')

function fileExists(fpath) {
    try {
        accessSync(fpath, constants.F_OK)
        return true
    } catch (err) {}
    return false
}


function getStorage(username = null) {
    if (username == null) {
        username = settingStorage.getUsername()
    }

    return new ArticleStorage(username)
}

class CloudArticle {
    static APP_NAME = 'articles'
    static DIR_TITLE = '文章目录'

    constructor(localId, username) {
        this.localId = localId
        this.username = username
        this.client = new PaperExplainedClient('articles', username)
        this.store = getStorage(username)
        this.workon = WORK_BASE
    }

    md2html(fpath) {
        var raw = readFileSync(fpath)
        var markdown = new Markdown()
        return markdown.convert(raw.toString(), false, true)
    }

    download(url, odir, success, error) {}

    prepareImage(source, workon, success, error) {
        source = decodeURI(source)
        source = source.replaceAll("&#32;", " ")
        if (fileExists(source)) {
            return this.uploadImage(source, true, success, error)
        } else {
            console.log('文件不存在本地！', source)
        }
        var fpath = path.join(workon, path.basename(source))
        if (fileExists(fpath)) {
            return this.uploadImage(fpath, true, success, error)
        } else {
            console.log('文件不存在本地，尝试从网络下载！', fpath)
        }
        return this.download(source, workon, (ofname) => {
            return this.uploadImage(path.join(workon, ofname), true, success, error)
        })
    }

    imageExists(hexdigest, success, error) {
        return this.client.post('imageExists', { hexdigest: hexdigest }, null, (info) => {
            return success(info.exists, info.url)
        }, error)
    }

    uploadImage(source, pure, success, error) {
        if (!fileExists(source)) {
            error(`图片 ${source} 不存在`)
            return
        }

        const hexdigest = md5File.sync(source)
        return this.imageExists(hexdigest, (exists, imageUrl) => {
            if (exists) {
                // console.info('图片已存在，无需再次上传:', source)
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
                return info.url
            } else {
                return this.client.post('uploadImage', {
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

    articleTitle(articleId, success, error) {
        this.client.post('articleTitle', { article_id: articleId }, null, success, error)
    }

    uploadAndReplaceImage(html, paperId, rehash, success, error) {
        var soup = new JSSoup(html)
        var imgs = soup.findAll('img')
        var imageSources = []
        for (let img of imgs) {
            imageSources.push(img.attrs.src)
        }
        if (rehash) {
            paperId = md5(paperId)
        }
        var workon = path.join(this.workon, paperId)
        mkdirSync(workon, { recursive: true })

        var imageUrls = []
        for (let ipath of imageSources) {
            imageUrls.push(this.prepareImage(
                ipath, workon,
                info => console.log('upload image success:', info),
                err => console.log('upload image failed:', err)))
        }

        Promise.all(imageUrls).then((values) => {
            var urlMap = {}
            for (let i in imageSources) {
                urlMap[imageSources[i]] = values[i]
            }
            // console.log('The image map is: ', urlMap)
            imgs = soup.findAll('img')
            for (let img of imgs) {
                if (urlMap[img.attrs.src]) {
                    img.attrs.src = urlMap[img.attrs.src]
                }
            }
            return success(soup.toString())
        })

    }

    createPaperArticle(paperId, tags, desc, fpath, success, error) {
        if (typeof tags != "string") {
            tags = tags.join(',')
        }
        if (fpath.endsWith('md')) {
            var htmlContent = this.md2html(fpath)
        } else {
            var htmlContent = readFileSync(fpath)
        }

        this.uploadAndReplaceImage(htmlContent, paperId, false, (content) => {
            this.client.post('paperArticleCreate', {
                paper: paperId,
                tags: tags,
                desc: desc,
                content: content
            }, null, success, error)
        })
    }

    paperArticleId(paperId, success, error) {
        this.client.post('paperArticleId', { paper_id: PaperId }, null, success, error)
    }

    updatePaperArticleContent(paperId, articleId, fpath, success, error) {
        if (fpath.endsWith('md')) {
            var htmlContent = this.md2html(fpath)
        } else {
            var htmlContent = readFileSync(fpath)
        }

        this.uploadAndReplaceImage(htmlContent, paperId, false, (content) => {
            this.client.post('paperArticleUpdateContent', { content: content },
                null,
                success,
                error, { article_id: articleId })
        })
    }

    updateContent(title, articleId, fpath, success, error, rehash = true) {
        if (fpath.endsWith('md')) {
            var htmlContent = this.md2html(fpath)
        } else {
            var htmlContent = readFileSync(fpath)
        }

        console.log(htmlContent)

        this.uploadAndReplaceImage(htmlContent, title, rehash, (content) => {
            this.client.post('paperArticleUpdateContent', { content: content },
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
        if (fpath.endsWith('md')) {
            var htmlContent = this.md2html(fpath)
        } else {
            var htmlContent = readFileSync(fpath)
        }
        this.uploadAndReplaceImage(htmlContent, title, true, (content) => {
            this.client.post('groceryArticleCreate', {
                article_title: title,
                tags: tags,
                desc: desc,
                content: content
            }, null, success, error)
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
            info => console.log('desc updated:', info),
            err => console.log('desc updated failed:', err))
        this.updateTags(artInfo.cloudId, artInfo.tags,
            info => console.log('tags updated:', info),
            err => console.log('tags updated failed:', err))
        this.updateTitle(artInfo.cloudId, artInfo.title,
            info => console.log('title updated:', info),
            err => console.log('title updated failed:', err))
    }

    articleSubmitCensor() {
        var artInfo = this.store.getArticle(this.localId)
        if (artInfo.contributed) {
            console.log("文章已投稿！", this.localId)
            return
        }
        if (!artInfo.cloudId) {
            console.log(`文章尚未同步到云端: ${this.localId}`)
            return
        }

        return this.client.post('articleSubmitCensor', { 'object_id': artInfo.cloudId }, null,
            info => {
                console.log("文章投稿成功：", info)
                this.store.updateArticle(this.localId, {
                    contributed: true,
                    status: info.status
                })
            },
            err => console.log(`文章投稿失败：${err}`))
    }

    syncToCloud(success) {
        var artInfo = this.store.getArticle(this.localId)
        if (artInfo.paperId) {
            this.paperTitle(artInfo.paperId,
                (info) => {
                    var paperTitle = info.title
                    if (artInfo.cloudId) {
                        this.updateContent(artInfo.paperId, artInfo.cloudId, artInfo.filePath,
                            success,
                            err => console.log('content update failed:', err),
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
                        err => console.log('paper article create failed:', err))
                },
                err => console.log(`获取论文标题错误(ID: ${artInfo.paperId})：${err}`))
            return
        }
        if (artInfo.cloudId) {
            this.updateContent(
                artInfo.title, artInfo.cloudId, artInfo.filePath,
                info => {
                    console.log('content updated:', info)
                    this.store.updateArticle(this.localId, {
                        synced: true
                    })
                    if (success) {
                        success(info)
                    }
                },
                err => console.log('update content failed:', err))

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
            err => console.log('grocery create failed:', err))
    }

    syncAllToLocal() {}
}

module.exports = {
    CloudArticle
}