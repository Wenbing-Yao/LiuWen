$(() => {
    $("#article-delete-close-modal").on('click', (event) => {
        var localId = $("#id_article_id").val()
        window.article.closeDeleteModal(localId)
    })

    $("body").on('click', ".article-delete-cancel", (event) => {
        var localId = $("#id_article_id").val()
        window.article.cancelArticleDelete(localId)
    })

    $("body").on('click', ".article-delete-confirm", (event) => {
        var localId = $("#id_article_id").val()
        window.article.confirmArticleDelete(localId)
    })
})
