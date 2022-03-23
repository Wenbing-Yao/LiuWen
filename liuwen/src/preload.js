const { contextBridge, ipcRenderer } = require('electron')
const { configure } = require('nunjucks')
const { Markdown } = require('./modules/LiuwenMarkDown')
const path = require('path');
const amdLoader = require('monaco-editor/min/vs/loader.js');
const amdRequire = amdLoader.require;
// const morphdom = require('morphdom');
const { ArticleStateSync } = require('./modules/Task')
const {
    formatText,
    insertTableDetail,
    insertToMarkdownEditor,
    setPostionAtStart,
    dropImageAt
} = require('./modules/MarkdownInsertHandler')
const { filename, getLogger } = require('./modules/render/utils')
const { trans, setLocaleLang, addSupportedLanguage, getLanguage } = require('./locale/i18n');
const { readFileSync } = require('fs');
const _ = trans

const logger = getLogger(__filename)

let editorBuf = new Map();
let articleEditors = new Map();
let articleBoxids = new Map();
let htmlOriginBuf = new Map();
let taskList = new Map();
let taskFinished = new Map();
let issuedArticleSet = new Set();

const CreationBoxId = "md-editor-for-article-add"
const CreationArtId = "article-create"
const TitleSelectorPrefix = "article-title-selector-"
const ArticleInfoBoxPrefix = "article-info-box-"
const ElementInfo = {
    CheckOkIndicatorPrefix: "meta-ok-",
    CheckNOkIndicatorPrefix: "meta-nok-",
    ArticleIssuedButton: "article-issue-",
    ArticleSyncButton: "art-syn-to-cloud-",
    ArticleStatus: "article-status-",
    EditingTab: "editing-tab-",
    EditingTabTrigger: "editing-detail-tab-",
    EditingPanel: "editing-detail-panel-",
    EditingRenderedHtml: "rendered-html-for-article-",
    IssuedTabTrigger: "issued-detail-tab-",
    IssuedRenderedHtml: "issued-detail-panel-",
    NavIssuedTab: "nav-issued-tab",
    NavEditingTab: "nav-editing-tab"
}

function setModify(mdbox, modified) {
    if (!mdbox) {
        return
    }

    var ele = document.getElementById(mdbox.getAttribute('modify-indicator'))
    if (!ele) {
        return
    }

    if (modified) {
        if (ele.classList.contains('nomodify')) {
            ele.classList.remove('nomodify')
        }

        if (!ele.classList.contains('modified')) {
            ele.classList.add('modified')
        }
    } else {
        if (ele.classList.contains('modified')) {
            ele.classList.remove('modified')
        }

        if (!ele.classList.contains('nomodify')) {
            ele.classList.add('nomodify')
        }
    }
}

function setEditorEditing(articleId) {
    if (articleId) {
        var boxid = articleBoxids.get(articleId)
    } else {
        var boxid = articleBoxids.get(CreationArtId)
    }
    if (!boxid) return

    var mdbox = document.getElementById(boxid)
    if (!mdbox) return

    setModify(mdbox, true)
}

function setEditorSaved(articleId) {
    var boxid = articleBoxids.get(articleId)
    if (!boxid) return

    var mdbox = document.getElementById(boxid)
    if (!mdbox) return

    setModify(mdbox, false)
}

function registerArticleSyncTask(localId) {
    taskFinished.set(localId, false)
    var tsk = new ArticleStateSync(localId, (localId) => {
        return ipcRenderer.send('article:check-issued', localId)
    }, (localId) => {
        return taskFinished.get(localId)
    })
    taskList.set(localId, tsk)
}

function unregisterArticleSyncTask(localId) {
    taskList.delete(localId)
    taskFinished.delete(localId)
}

class ArticleInfoFetcher {

    constructor(id) {
        this.id = id
        this.detail = { id: this.id, issued: false }
    }

    static CreationFieldIds = [
        "id-article-paper-id-add",
        "id-article-title-add",
        "id-article-desc-add",
        "id-article-tags-add"
    ]

    static clearAll() {
        for (const fieldName of this.CreationFieldIds) {
            var ele = document.getElementById(fieldName)
            ele.value = ""
        }
    }

    getArticlePaperId() {
        var eleId = null;
        if (this.id) {
            eleId = `id-article-${this.id}-paper-id`;
        } else {
            var eleId = "id-article-paper-id-add";
        }
        var ele = document.getElementById(eleId);
        if (ele) {
            return ele.value;
        } else {
            logger.info(`文章 ${this.id} Paper Id 元素 ${eleId} 不存在！`)
            return "";
        }
    }

    getArticleTitle() {
        var eleId = null;
        if (this.id) {
            eleId = `id-article-${this.id}-title`;
        } else {
            var eleId = "id-article-title-add";
        }
        var ele = document.getElementById(eleId);
        if (ele) {
            return ele.value;
        } else {
            logger.info(`文章 ${this.id} Title 元素 ${eleId} 不存在！`)
            return "";
        }
    }

    getArticleDesc() {
        var eleId = null;
        if (this.id) {
            eleId = `id-article-${this.id}-desc`;
        } else {
            var eleId = "id-article-desc-add";
        }
        var ele = document.getElementById(eleId);
        if (ele) {
            return ele.value;
        } else {
            logger.info(`文章 ${this.id} Desc 元素 ${eleId} 不存在！`)
            return "";
        }
    }

    getArticleTags() {
        var eleId = null;
        if (this.id) {
            eleId = `id-article-${this.id}-tags`;
        } else {
            var eleId = "id-article-tags-add";
        }
        var ele = document.getElementById(eleId);
        if (ele) {
            var ts = []
            for (let t of ele.value.split(',')) {
                if (t.trim() != '')
                    ts.push(t.trim())
            }
            return ts.join(',')
        } else {
            logger.info(`文章 ${this.id} Tags 元素 ${eleId} 不存在！`)
            return "";
        }
    }

    fetchArticleInfo() {
        var paperId = this.getArticlePaperId();
        var articleTitle = this.getArticleTitle();
        var articleDesc = this.getArticleDesc();
        var articleTags = this.getArticleTags();

        if (paperId == null && articleTitle == null) {
            logger.info('论文ID和文章标题不能都为空！')
            return;
        }

        this.detail['paperId'] = paperId;
        this.detail['title'] = articleTitle;
        this.detail['desc'] = articleDesc;
        this.detail['tags'] = articleTags;

        return this.detail;
    }

    addField(fieldName, fieldValue) {
        this.detail[fieldName] = fieldValue
    }
}


function initMarkdownEditor(boxid, articleId) {
    if (!articleId) {
        articleBoxids.set(CreationArtId, boxid)
    } else {
        articleBoxids.set(articleId, boxid)
    }
    if (editorBuf.has(boxid)) {
        return
    }
    editorBuf.set(boxid, null)

    function uriFromPath(_path) {
        var pathName = path.resolve(_path).replace(/\\/g, '/');
        if (pathName.length > 0 && pathName.charAt(0) !== '/') {
            pathName = '/' + pathName;
        }
        return encodeURI('file://' + pathName);
    }

    amdRequire.config({
        baseUrl: uriFromPath(path.join(__dirname, '../node_modules/monaco-editor/min'))
    });
    self.module = undefined;

    var mdbox = document.getElementById(boxid)
    if (!mdbox) {
        logger.info('No box', boxid)
        return
    }

    amdRequire(['vs/editor/editor.main'], async function () {
        monaco.editor.defineTheme('default-theme', {
            base: 'vs-dark',
            inherit: true,
            rules: [{ background: '#000000' }],
            colors: {
                // 相关颜色属性配置
                // 'editor.foreground': '#000000',
                'editor.background': '#000000', //背景色
                // 'editorCursor.foreground': '#8B0000',
                // 'editor.lineHighlightBackground': '#0000FF20',
                // 'editorLineNumber.foreground': '#008800',
                // 'editor.selectionBackground': '#88000030',
                // 'editor.inactiveSelectionBackground': '#88000015'
            }
        });
        //设置自定义主题
        monaco.editor.setTheme('default-theme');
        var articleId = mdbox.getAttribute('article-id');

        var editor = monaco.editor.create(mdbox, {
            automaticLayout: true,
            // value: [
            //     boxid
            // ].join('\n'),
            fontFamily: 'monospace',
            fontSize: 15,
            lineHeight: 24,
            language: 'markdown',
            lineNumbers: 'on',
            minimap: {
                enabled: false
            },
            theme: 'default-theme',
            wordWrap: 'on',
        });
        editorBuf.set(boxid, editor)

        var renderedId = mdbox.getAttribute('rendered-id')
        if (articleId) {
            articleEditors.set(articleId, editor)
            ipcRenderer.send('article:content-init', articleId, renderedId)
        } else {
            articleEditors.set(CreationArtId, editor)
        }

        editor.getModel().onDidChangeContent((event) => {
            setEditorEditing(articleId)
        })
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, async () => {
            setModify(mdbox, false)

            if (!articleId) {
                var art = new ArticleInfoFetcher(null)
                ipcRenderer.send(
                    'article:create', // channel
                    editor.getValue(), // markdown text
                    art.fetchArticleInfo()
                )
                return
            } else {
                var art = new ArticleInfoFetcher(articleId)
                ipcRenderer.send(
                    'article:content-update',
                    articleId,
                    editor.getValue()
                )
                ipcRenderer.send(
                    'article:meta-update',
                    articleId,
                    art.fetchArticleInfo()
                )
            }

            var htmlView = document.getElementById(renderedId);
            if (!htmlView) {
                logger.info('No htmlview')
                return
            }
            var sfpath = htmlView.getAttribute('sfpath')
            var md = null
            if (sfpath) {
                md = new Markdown(path.dirname(sfpath))
            } else {
                md = new Markdown()
            }
            var notoc = true
            var newEle = document.createElement('div')
            var innerHtml = md.convert(editor.getValue(), notoc, true)

            newEle.innerHTML = innerHtml
            smartUpdate(htmlView, newEle, renderedId)
            document.querySelectorAll(`#${renderedId} pre code`).forEach((el) => {
                hljs = require('../node_modules/highlight.js')
                hljs.highlightElement(el)
            });

            var buf = new Map()
            htmlOriginBuf.set(renderedId, buf)
            var newCopy = document.createElement('div')
            newCopy.innerHTML = innerHtml
            for (let ele of newCopy.children) {
                buf.set(ele.id, ele)
            }
        })
    });
}

function compareWithSoup(renderedId, preEl, newEl) {
    var preOrigin = htmlOriginBuf.get(renderedId)
    var preElId = preEl.id
    var preOriginEle = preOrigin.get(preElId)
    if (preOriginEle) {
        var preOldId = preOriginEle.id
        if (!newEl.id) {
            logger.info(`${newEl} has not ID!!!`)
            return preOriginEle.isEqualNode(newEl)
        }

        preOriginEle.setAttribute('id', newEl.id)
        var res = preOriginEle.isEqualNode(newEl)
        if (!res) {
            preOriginEle.setAttribute('id', preOldId)
        }
        preEl.setAttribute('id', newEl.id)
        return res
    } else {
        return false
    }
}


function smartUpdate(preEl, newEl, renderedId, ps = 0, pe = null, ns = 0, ne = null) {
    var osp, ope, ons, one = ps,
        pe, ns, ne

    if (pe == null) {
        pe = preEl.children.length
    }
    if (ne == null) {
        ne = newEl.children.length
    }
    while (ps < preEl.children.length &&
        ns < newEl.children.length &&
        compareWithSoup(renderedId, preEl.children[ps], newEl.children[ns])) {
        ps++
        ns++
    }

    while (pe > ps && ne > ns && compareWithSoup(renderedId, preEl.children[pe - 1], newEl.children[ne - 1])) {
        pe--
        ne--
    }

    var elementsToBeRemoved = []
    for (let i = ps; i < pe; i++) {
        elementsToBeRemoved.push(preEl.children[i])
    }

    for (let ele of elementsToBeRemoved) {
        preEl.removeChild(ele)
    }

    var elementsToBeAdded = []
    for (let i = ns; i < ne; i++) {
        elementsToBeAdded.push(newEl.children[i])
    }
    for (let ele of elementsToBeAdded.reverse()) {
        if (preEl.children && preEl.children[ps]) {
            preEl.insertBefore(ele, preEl.children[ps])
        } else {
            preEl.appendChild(ele)
        }
    }
}

const TEMPLATES_CONFIG = {
    'issued-tab-list': 'issued-tab-list.html',
    'issued-panel-list': 'issued-panel-list.html',
    'issued-tab-item': 'snipets/issued-tab-item.html',
    'issued-panel-item': 'snipets/issued-panel-item.html',
    'editing-tab-item': 'editing-tab-item.html',
    'editing-tab-list': 'editing-tab-list.html',
    'editing-panel-list': 'editing-panel-list.html',
    'editing-panel-item': 'editing-panel.html',
    'article-info-box': 'snipets/article-meta-info.html'
}

contextBridge.exposeInMainWorld('darkMode', {
    toggle: () => ipcRenderer.invoke('dark-mode:toggle'),
    system: () => ipcRenderer.invoke('dark-mode:system')
})

contextBridge.exposeInMainWorld('testString', {
    'astring': () => 'aString'
})

function getTemplateEnv() {
    let env = configure(path.join(__dirname, 'templates'))
    env.addFilter('trans', trans)
    env.addFilter('filename', filename)
    return env
}

function renderIssued(articles) {

    let env = getTemplateEnv()
    env.render(TEMPLATES_CONFIG['issued-tab-list'], {
        'articles': articles
    }, (err, res) => {
        if (err) {
            logger.error(err)
            return
        }
        const element = document.getElementById('nav-issued-tabs')
        if (element) element.innerHTML = res
    })

    env.render(TEMPLATES_CONFIG['issued-panel-list'], {
        'articles': articles
    }, (err, res) => {
        const element = document.getElementById('nav-issued-panels')
        if (element) element.innerHTML = res

        document.querySelectorAll('#nav-issued-panels pre code').forEach((el) => {
            hljs = require('../node_modules/highlight.js')
            hljs.highlightElement(el)
        });
    })
}

function renderEditing(articles) {
    let env = getTemplateEnv()
    env.render(TEMPLATES_CONFIG['editing-tab-list'], {
        'articles': articles
    }, (err, res) => {
        if (err) {
            logger.error(err)
            return
        }
        const element = document.getElementById('nav-editing-tabs')
        if (element) element.innerHTML = res
    })
    env.render(TEMPLATES_CONFIG['editing-panel-list'], {
        'articles': articles
    }, (err, res) => {
        if (err) {
            logger.error(err)
            return
        }
        const element = document.getElementById('nav-editing-panels')
        if (element) element.innerHTML = res
    })

    for (let art of articles) {
        // todo: only contributed
        if (art.cloudId && art.contributed) registerArticleSyncTask(art.id)
    }
}

function addNewEditingTab(article) {
    let env = getTemplateEnv()
    env.render(TEMPLATES_CONFIG['editing-tab-item'], {
        'art': article
    }, (err, res) => {
        if (err) {
            logger.error(err)
            return
        }
        var ele = document.getElementById("id-editing-tab-list")
        ele.lastElementChild.insertAdjacentHTML('beforebegin', res);
    })
}

function addIssuedArticleTab(article) {
    let env = getTemplateEnv()
    env.render(TEMPLATES_CONFIG['issued-tab-item'], {
        'art': article
    }, (err, res) => {
        if (err) {
            logger.error(err)
            return
        }

        var ele = document.getElementById('id-issued-tab-list')
        ele.lastElementChild.insertAdjacentHTML('beforebegin', res)
    })
}

function addNewEditingPanel(article, show = false) {
    let env = getTemplateEnv()
    env.render(TEMPLATES_CONFIG['editing-panel-item'], {
        'art': article
    }, (err, res) => {
        if (err) {
            logger.error(err)
            return
        }
        var ele = document.getElementById("id-editing-panel-list")
        if (!ele) {
            logger.info('编辑器panel列表未找到！')
            return
        }
        ele.lastElementChild.insertAdjacentHTML('beforebegin', res)
        showEditingDetailTab(article)
    })
}

function addIssuedArticlePanel(article, show = false) {
    let env = getTemplateEnv()
    var md = new Markdown(article.filePath ? path.dirname(article.filePath) : null)
    var notoc = true
    article.content = md.convert(article.mdContent, notoc, true)

    env.render(TEMPLATES_CONFIG['issued-panel-item'], {
        'art': article
    }, (err, res) => {
        if (err) {
            logger.error(err)
            return
        }
        var ele = document.getElementById('id-issued-panel-list')
        ele.lastElementChild.insertAdjacentHTML('beforebegin', res)
        document.querySelectorAll(`#${ElementInfo.IssuedRenderedHtml}${article.id} pre code`).forEach((el) => {
            hljs = require('../node_modules/highlight.js')
            hljs.highlightElement(el)
        });
        if (show) {
            showIssuedDetailTab(article)
        }
    })
}

function addEditingToNew(article, show = false) {
    addNewEditingTab(article)
    addNewEditingPanel(article, show)
}

function addIssuedArticle(article, show = false) {
    if (issuedArticleSet.has(article.id)) {
        logger.warn(`article has been added: ${article.id}`)
        if (show) { showIssuedDetailTab(article) }
        return
    }
    addIssuedArticleTab(article)
    addIssuedArticlePanel(article, show)

    issuedArticleSet.add(article.id)
}

function showTab(elementId) {
    var ele = document.getElementById(elementId)
    if (!ele) {
        return false
    }
    const bootstrap = require('bootstrap')
    var tabTrigger = new bootstrap.Tab(ele)
    tabTrigger.show()

    return true
}

function showEditingDetailTab(article) {
    var ele = document.getElementById(`${ElementInfo.EditingTabTrigger}${article.id}`)
    if (!ele) return false

    const bootstrap = require('bootstrap')
    var tabTrigger = new bootstrap.Tab(ele)
    var boxid = ele.getAttribute('editor-boxid')
    initMarkdownEditor(boxid, article.id)
    showTab(ElementInfo.NavEditingTab)

    tabTrigger.show()
    return true
}

function showIssuedDetailTab(article) {
    let ele = document.getElementById(`${ElementInfo.IssuedTabTrigger}${article.id}`)
    if (!ele) {
        logger.error(`issued detail tab not found: ${article.id}`)
        return false
    }

    const bootstrap = require('bootstrap')
    let tabTrigger = new bootstrap.Tab(ele)
    showTab(ElementInfo.NavIssuedTab)
    tabTrigger.show()

    return true
}

function getActiveEditor() {
    var active = document.querySelector("#id-editing-tab-list .active")
    if (!active) return null

    var boxid = active.getAttribute('editor-boxid')
    var editor = editorBuf.get(boxid)
    return editor
}

ipcRenderer.on('article:insert', (event, type) => {
    var editor = getActiveEditor()
    insertToMarkdownEditor(editor, type)
})

ipcRenderer.on('article:format', (event, type) => {
    var editor = getActiveEditor()
    formatText(editor, type)
})

ipcRenderer.on('article:sync-to-local-reply', (event, article) => {
    addEditingToNew(article)
})

ipcRenderer.on('article:create-reply', (event, article) => {
    addEditingToNew(article, true)

    ArticleInfoFetcher.clearAll()
    var editor = editorBuf.get(CreationBoxId)
    if (!editor) return

    editor.getModel().setValue("")
    setEditorSaved(CreationArtId)
})

ipcRenderer.on('article:show-rendered', (event, article) => {
    if (showEditingDetailTab(article)) {
        return
    }
    if (showIssuedDetailTab(article)) {
        return
    }

    logger.info(_("Element id not found, the article id is") + `: ${article.id}`)
})

function createArticle() {
    var art = new ArticleInfoFetcher(null)
    var editor = articleEditors.get(CreationArtId)
    ipcRenderer.send(
        'article:create', // channel
        editor.getValue(), // markdown text
        art.fetchArticleInfo()
    )
}


function updateArticle(articleId) {
    var art = new ArticleInfoFetcher(articleId)
    var editor = articleEditors.get(articleId)
    if (editor) {
        ipcRenderer.send(
            'article:content-update',
            articleId,
            editor.getValue()
        )
    } else {
        logger.info(`Article save failed, the article id is: ${articleId}`)
    }

    var info = art.fetchArticleInfo()
    ipcRenderer.send(
        'article:meta-update',
        articleId,
        info
    )

    if (!articleId) return

    var titleEle = document.getElementById(`${TitleSelectorPrefix}${articleId}`)
    var showTitle = null
    if (info.title) {
        showTitle = info.title
    } else {
        showTitle = info.paperId
    }

    titleEle.innerText = showTitle
}

function checkArticleMeta(articleId) {
    var art = new ArticleInfoFetcher(articleId)
    var info = art.fetchArticleInfo()

    if (info.paperId) {
        ipcRenderer.send('article:paper-title', info.paperId, articleId)
    }
}

function setCheckIndicator(articleId, ok) {
    var okEle = document.getElementById(`${ElementInfo.CheckOkIndicatorPrefix}${articleId}`)
    var nokEle = document.getElementById(`${ElementInfo.CheckNOkIndicatorPrefix}${articleId}`)
    if (ok) {
        okEle.removeAttribute('hidden')
        nokEle.setAttribute('hidden', 'hidden')
    } else {
        okEle.setAttribute('hidden', 'hidden')
        nokEle.removeAttribute('hidden')
    }
}

ipcRenderer.on('article:paper-title-reply', (event, paperId, articleId, title, info) => {
    var infoEle = document.getElementById(`${ArticleInfoBoxPrefix}${articleId}`)
    if (!title) {
        let env = getTemplateEnv()
        env.render(TEMPLATES_CONFIG['article-info-box'], { infos: [info] },
            (err, res) => {
                if (err) logger.error(err)
                infoEle.innerHTML = res
            })
        setCheckIndicator(articleId, false)
        return
    }
    infoEle.innerHTML = ""
    setCheckIndicator(articleId, true)
})

function synArticleToCloud(articleId) {
    var art = new ArticleInfoFetcher(articleId)
    let info = art.fetchArticleInfo()
    if (!info.tags) {
        showArticleInfo(articleId, _("Tags field is required!"))
        return
    } else {
        showArticleInfo(articleId, null)
    }

    if (!info.paperId && !info.title) {
        showArticleInfo(articleId, _("The paper ID and title fields cannot both be empty!"))
        return
    } else {
        showArticleInfo(articleId, null)
    }
    ipcRenderer.send('article:syn-to-cloud', articleId)
    disableArticleSyncBtn(articleId)
}

ipcRenderer.on('article:syn-to-cloud-reply', (event, articleId, cloudInfo) => {
    disableArticleSyncBtn(articleId, false)
})

function articleIssue(articleId) {
    ipcRenderer.send('article:issue-article', articleId)
}

function articleDelete(articleId) {
    ipcRenderer.send('article:delete', articleId, true, false)
}

function articleInsertTable(row, col) {
    var editor = getActiveEditor()
    insertTableDetail(editor, row, col)
}

function showArticleInfo(localId, info) {
    var infoEle = document.getElementById(`${ArticleInfoBoxPrefix}${localId}`)
    if (!info) {
        infoEle.innerHTML = ""
        return
    }

    let env = getTemplateEnv()
    env.render(TEMPLATES_CONFIG['article-info-box'], { infos: [info] },
        (err, res) => {
            if (err) logger.error(err)
            infoEle.innerHTML = res
        })
}

function articleMetaChange(localId, fieldType, value) {
    let info = {}
    const N_MAX_TAGS = 5
    info[fieldType] = value
    ipcRenderer.send(
        'article:meta-update',
        localId, info
    )

    if (fieldType == 'title' && value) {
        var titleEle = document.getElementById(`${TitleSelectorPrefix}${localId}`)
        titleEle.innerText = value
        return
    } else if (fieldType == 'title') {
        var titleEle = document.getElementById(`${TitleSelectorPrefix}${localId}`)
        titleEle.innerText = _('No Title')
    }

    if (fieldType == 'tags') {
        if (value == "") {
            // show error info, tags can not be empty
            showArticleInfo(localId, _("Tags field is required!"))
            return
        } else {
            let tags = value.split(',')
            if (tags.length > N_MAX_TAGS) {
                // show error info: max tag number cannot be larger than ${N_MAX_TAGS}
                showArticleInfo(localId, _("The number of tags should not be larger than ") + N_MAX_TAGS)
            } else {
                showArticleInfo(localId, null)
            }
        }
        return
    }

    if (fieldType == 'paperId') {
        if (!value) {
            return
        }
        if (navigator.onLine) {
            ipcRenderer.send('article:check-paper-id', localId, value)
        } else {
            // push event to todo list
        }
        return
    }
}

ipcRenderer.on('article:check-paper-id-reply', (event, paperId, localId, title) => {
    let inputEle = document.getElementById(`id-article-${localId}-title`)

    if (!title) {
        if (inputEle.hasAttribute('disabled')) {
            logger.info('移除 disabled')
            inputEle.removeAttribute('disabled')
        }
        showArticleInfo(localId, _("Paper ID does not exist!"))
        return
    }

    // TODO: if title is empty, set the title
    let titleEle = document.getElementById(`${TitleSelectorPrefix}${localId}`)
    titleEle.innerText = title
    inputEle.value = title

    if (!inputEle.hasAttribute('disabled')) {
        inputEle.setAttribute('disabled', 'disabled')
    }
    showArticleInfo(localId, "")
})

function disableArticleSyncBtn(articleId, disabled = true) {

    var issueBtn = document.getElementById(`${ElementInfo.ArticleSyncButton}${articleId}`)
    if (!issueBtn) {
        logger.info('同步按键不存在：', articleId)
        return
    }

    if (disabled) {
        issueBtn.setAttribute('disabled', 'disabled')
    } else {
        issueBtn.removeAttribute('disabled')
    }
}

function disableArticleIssuedBtn(articleId, disabled = true) {
    var issueBtn = document.getElementById(`${ElementInfo.ArticleIssuedButton}${articleId}`)
    if (!issueBtn) {
        logger.info('投稿按键不存在：', articleId)
        return
    }

    if (disabled) {
        issueBtn.setAttribute('disabled', 'disabled')
    } else {
        issueBtn.removeAttribute('disabled')
    }
}

function updateArticleStatus(articleId, status) {
    var statusEle = document.getElementById(`${ElementInfo.ArticleStatus}${articleId}`)
    if (!statusEle) {
        logger.info('状态元素未找到：', articleId)
        return
    }

    statusEle.innerText = status
}

ipcRenderer.on('article:issue-article-reply', (event, localId, success, cloudInfo) => {
    if (!success) {
        logger.error('投稿失败: ', localId)
        return
    }

    disableArticleIssuedBtn(localId)
    updateArticleStatus(localId, cloudInfo.status)
    registerArticleSyncTask(localId)
})

ipcRenderer.on('profile:login-success', (event, username) => {
    ipcRenderer.send('article:render', 'editing')
    ipcRenderer.send('article:render', 'issued')
    setWinLogin(username)
})
ipcRenderer.on('profile:logout-success', (event) => {
    setWinLogout()
    clearEditing()
    clearIssued()
})

function removeChildren(cssSelector, parentId) {
    var parentNode = document.getElementById(parentId);
    var elements = parentNode.querySelectorAll(cssSelector);
    let fragment = document.createDocumentFragment();
    fragment.textContent = ' ';
    fragment.firstChild.replaceWith(...elements);
}

function clearIssued() {
    removeChildren("li.nav-item", "id-issued-tab-list")
    removeChildren(".tab-pane", "id-issued-panel-list")
}

function clearEditing() {
    removeChildren("li[id^=editing-tab-]", "id-editing-tab-list")
    removeChildren("div[id^=editing-detail-panel-]", "id-editing-panel-list")
}

function showLogin() {
    ipcRenderer.send('profile:login-show')
}

function showUserinfo() {
    ipcRenderer.send('profile:userinfo-show')
}

window.addEventListener('DOMContentLoaded', () => {
    // renderIssued(indexContext['articleInfo']['issued'])
    if (navigator.onLine) {
        ipcRenderer.send('profile:login-check', true)
    } else {
        ipcRenderer.send('profile:login-check', false)
    }

    setInterval(() => {
        // run tasks
        let finishedIndexes = [];

        for (const [idx, task] of taskList.entries()) {
            try {
                var finished = task.run()
                if (finished) {
                    finishedIndexes.push(idx)
                }
            } catch (err) {
                logger.error(`Task "${task}" execution error: ${err}`)
            }
        }

        for (let idx of finishedIndexes) {
            unregisterArticleSyncTask(idx)
        }
    }, 333)
})

ipcRenderer.on('article:content-reply', (event, localId, renderedId, content) => {
    var editor = articleEditors.get(localId)
    if (!editor) {
        logger.info(`ID ${localId} 无对应编辑器`)
        return
    }

    new Promise((resolve, reject) => { editor.getModel().setValue(content) }).then(
        (value) => { }
    ).catch((reason) => logger.error(reason))

    new Promise((resolve, reject) => {
        var htmlView = document.getElementById(renderedId)
        if (!htmlView) {
            logger.info('No htmlview')
            return
        }

        var sfpath = htmlView.getAttribute('sfpath')
        var md = new Markdown(path.dirname(sfpath))
        var notoc = true
        var innerHTML = md.convert(content, notoc, true)
        htmlView.innerHTML = innerHTML

        document.querySelectorAll(`#${renderedId} pre code`).forEach((el) => {
            hljs = require('../node_modules/highlight.js')
            hljs.highlightElement(el)
        });

        var buf = new Map()
        htmlOriginBuf.set(renderedId, buf)

        var newCopy = document.createElement('div')
        newCopy.innerHTML = innerHTML
        for (let ele of newCopy.children) {
            buf.set(ele.id, ele)
        }

        setEditorSaved(localId)
        resolve(localId)
    }).then((value) => {
        logger.info(`init render success: ${value}`)
    }).catch((reason) => {
        logger.error(`An error happened: ${reason}`)
    })
})

ipcRenderer.on('article:render-reply', (event, type, articles) => {
    var articleArray = []

    for (let k in articles) {
        let md = new Markdown(path.dirname(articles[k].filePath))
        articles[k].content = md.convert(articles[k].mdContent, true, true)
        articleArray.push(articles[k])
        if (articles[k].contributed && !articles[k].issued && articles[k].cloudId) {
            ipcRenderer.send('article:check-status', k, articles[k].cloudId)
        }
    }

    if (type == 'editing') {
        renderEditing(articleArray)
    } else {
        renderIssued(articleArray)
    }
})

ipcRenderer.on('article:check-status-changed', (event, localId, status) => {
    var ele = document.getElementById(`${ElementInfo.ArticleStatus}${localId}`)
    if (!ele) return
    if (status == '已通过') {
        removeEditingElement(localId)
    } else {
        ele.innerText = status
        if (status == '已拒绝') {
            disableArticleIssuedBtn(localId, false)
        }
    }
})

ipcRenderer.on('article:add-issued', (event, article) => {
    addIssuedArticle(article)
    taskFinished.set(article.id, true)
})

ipcRenderer.on('article:show-markdown-help', (event) => {
    var lang = getLanguage()
    var fpath = path.join(__dirname, `docs/markdown-help.${lang}.md`)
    var mdContent = readFileSync(fpath).toString()
    var article = {
        id: 'local-id-markdown-help',
        title: _('Markdown Help'),
        tags: [_('Markdown Help')],
        mdContent: mdContent,
        filePath: fpath
    }
    logger.info(`add command line help for lang: ${lang}`)
    addIssuedArticle(article, true)
})

function openExternalLink(link) {
    ipcRenderer.send('link:open', link)
}

function setWinLogin(username) {
    // var ele = document.getElementById("usernameShown")
    // ele.innerText = username

    var usernameBox = document.getElementById("username-box")
    usernameBox.hidden = false

    var profileBox = document.getElementById("profile-box")
    profileBox.hidden = true
    profileBox.setAttribute("login", "true")
}

function setWinLogout() {
    // var ele = document.getElementById("usernameShown")
    // ele.innerText = ""

    var usernameBox = document.getElementById("username-box")
    usernameBox.hidden = true

    var profileBox = document.getElementById("profile-box")
    profileBox.hidden = false
    profileBox.setAttribute("login", "false")
}

ipcRenderer.on('profile:login-check-reply', (event, isLogin, username) => {
    if (!isLogin && navigator.onLine || !username) {
        showLogin()
        return
    }

    // If offline, allow the user using
    setWinLogin(username)
    ipcRenderer.send('article:render', 'editing')
    ipcRenderer.send('article:render', 'issued')
})

ipcRenderer.on('config:language', (event, language) => {
    setLocaleLang(language)
})
ipcRenderer.on('config:supported-languages', (event, supported_languages) => {
    addSupportedLanguage(supported_languages)
})


function removeEditingElement(articleId) {
    var tabEle = document.getElementById(`${ElementInfo.EditingTab}${articleId}`)
    tabEle.remove()

    var panelEle = document.getElementById(`${ElementInfo.EditingPanel}${articleId}`)
    panelEle.remove()
}

ipcRenderer.on('article:element-delete', (event, articleId) => {
    removeEditingElement(articleId)
})

function fileDropped(fpath, clientX, clientY) {
    const SUPPORTED_IMAGE_EXTS = [
        '.png', '.jpg', '.apng', '.gif', '.ico', '.cur',
        '.jpg', '.jpeg', '.jfif', '.pjpeg', '.pjp', '.avif',
        '.svg', '.webp'
    ]
    if (fpath.endsWith('.md')) {
        ipcRenderer.send('article:file-dropped', fpath)
    } else {
        // insert image
        let editor = getActiveEditor()
        if (!editor) {
            return
        }

        for (let ends of SUPPORTED_IMAGE_EXTS) {
            if (fpath.endsWith(ends)) {
                dropImageAt(editor, fpath, clientX, clientY)
            }
        }
    }
}

function logPosition(x, y) {
    setPostionAtStart(getActiveEditor(), x, y)
}

contextBridge.exposeInMainWorld('monaco', {
    'initMarkdownEditor': initMarkdownEditor
})

contextBridge.exposeInMainWorld('article', {
    'checkArticleMeta': checkArticleMeta,
    'createArticle': createArticle,
    'synArticleToCloud': synArticleToCloud,
    'updateArticle': updateArticle,
    'articleIssue': articleIssue,
    'articleDelete': articleDelete,
    'articleInsertTable': articleInsertTable,
    'articleMetaChange': articleMetaChange,
    'logPosition': logPosition
})

contextBridge.exposeInMainWorld('profile', {
    'showLogin': showLogin,
    'showUserinfo': showUserinfo
})

contextBridge.exposeInMainWorld('default', {
    'openExternalLink': openExternalLink,
    'fileDropped': fileDropped
})