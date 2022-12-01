$(() => {
    $("#article-preview-close-modal").on('click', (event) => {
        var localId = $("#id_article_id").val()
        window.article.closePreviewModal(localId)
    });

    function isValidHttpUrl(string) {
        let url;

        try {
            url = new URL(string);
        } catch (_) {
            return false;
        }

        return url.protocol === "http:" || url.protocol === "https:";
    }

    $(document).on('click', 'a', function (event) {
        event.preventDefault();
        if (this.href && isValidHttpUrl(this.href)) {
            window.default.openExternalLink(this.href);
        } else {
            window.default.openLocalFile(this.href);
        }
    });

})