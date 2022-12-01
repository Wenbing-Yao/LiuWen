const { app, dialog } = require("electron");
const path = require("path");
const { ArticleStorage } = require("../modules/ArticleStorage");
const { settingStorage } = require("../modules/UserSettings");
const { getArticleClient } = require("../modules/backend/utils");
const { getLogger } = require("../modules/render/utils");

const logger = getLogger(__filename);

function getStorage(username = null) {
    if (username == null) {
        username = settingStorage.getUsername();
    }

    return new ArticleStorage(username);
}

function showAboutPanel() {
    app.showAboutPanel();
}

function addLocalFileToEditor(fpath, browserWindow) {
    if (!fpath.endsWith(".md")) {
        logger.info(`This is not markdown file, ignore: ${fpath}`);
        return;
    }
    var store = getStorage();
    var articleInfo = {};
    articleInfo.filePath = fpath;
    var filename = path.parse(fpath).name;
    articleInfo.title = filename;
    articleInfo.paperId = "";
    articleInfo.desc = "";
    articleInfo.tags = "";

    var localId = store.getArticleIdByFilePath(fpath);
    if (localId) {
        var art = store.getArticle(localId);
        if (art) {
            browserWindow.webContents.send("article:show-rendered", art);
            return;
        }
        store.deleteReversePath(fpath);
        localId = null;
    }

    localId = store.createArticle(articleInfo);
    browserWindow.webContents.send(
        "article:create-reply",
        store.getArticle(localId)
    );
}

function fetchFileContent() {
    var fpath = dialog.showOpenDialogSync({
        properties: ["openFile"],
        filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
    });

    if (fpath) {
        logger.info(`文件路径为：${fpath}`);
        return fpath[0];
    }

    logger.info("未选择文件");
    return null;
}

function openLocalMarkdown(menuItem, browserWindow, event) {
    var fpath = fetchFileContent();
    if (!fpath) {
        return;
    }
    addLocalFileToEditor(fpath, browserWindow);
}

function syncToLocal(menuItem, browserWindow, event) {
    let store = getStorage();
    let client = getArticleClient();
    let editings = store.listEditingArticleCloudIds();

    client.syncAllToLocal(editings.join(","), browserWindow);
}

function insertMarkdownElement(menuItem, browserWindow, event, type) {
    browserWindow.webContents.send("article:insert", type);
}

function formatMarkdownElement(menuItem, browserWindow, event, type) {
    browserWindow.webContents.send("article:format", type);
}

function showMarkdownHelp(menuItem, browserWindow, event) {
    browserWindow.webContents.send("article:show-markdown-help");
}

module.exports = {
    addLocalFileToEditor,
    formatMarkdownElement,
    insertMarkdownElement,
    openLocalMarkdown,
    showAboutPanel,
    showMarkdownHelp,
    syncToLocal,
};
