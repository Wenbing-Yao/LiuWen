const { settingStorage } = require('../UserSettings')

function getPeClient(username = null) {
    if (username == null) {
        username = settingStorage.getUsername()
    }
    const { PaperExplainedClient } = require('../Communication')
    let client = new PaperExplainedClient('articles', username)

    return client
}

function getArticleClient(localId, username = null) {
    const { CloudArticle } = require('../CloudArticle')

    if (username == null) {
        username = settingStorage.getUsername()
    }

    return new CloudArticle(localId, username)
}


module.exports = {
    getArticleClient,
    getPeClient
}