// document.getElementById('toggle-dark-mode').addEventListener('click', async() => {
//     const isDarkMode = await window.darkMode.toggle()
//     document.getElementById('theme-source').innerHTML = isDarkMode ? 'Dark' : 'Light'
// })

// document.getElementById('reset-to-system').addEventListener('click', async() => {
//     await window.darkMode.system()
//     document.getElementById('theme-source').innerHTML = 'System'
// })

const SAVE_BASIC_ROLE_ART = "article";
const SAVE_BASIC_ROLE_ADD = "creation";
var globalMDEditors = new Map();
var displayBuffer = new Map();

window.addEventListener("load", function() {
    // var addEle = document.getElementById('issued-detail-tab-add');
    // if (addEle) {
    //     addEle.addEventListener('click', async() => {
    //         console.log('new clicked!')
    //     });
    // } else {
    //     console.error('Add element does not exist!')
    // }
});

function getCreatedBasic() {
    const baseFields = ['id-paper-id', 'id-article-title', 'id-article-desc', 'id-article-tags']
    var data = new Map();
    for (const fieldName of baseFields) {
        value = $(`#${fieldName}`).val()
        if (value) {
            data.set(fieldName, value)
        } else {
            data.set(fieldName, '')
        }
    }
    return data
}

function registerHide(eleId) {
    $('body').on('click', '#' + eleId, () => {
        var $ele = $('#' + eleId);
        var targetId = $ele.attr('target-id');
        var $target = $("#" + targetId);
        var curDis = $target.css('display')
        if (curDis == 'none') {
            var preDis = displayBuffer.get(eleId)
            if (!preDis) {
                preDis = 'block';
            }
            displayBuffer.delete(eleId)
            $target.css('display', preDis);
            $ele.text($ele.attr('default-char'));
        } else {
            displayBuffer.set(eleId, curDis);
            $target.css('display', 'none');
            $ele.text($ele.attr('hidden-char'));
        }
    });
}

function registerHideByClass(cls) {
    $('body').on('click', `.${cls}`, (event) => {
        var eleId = event.target.id;
        var $ele = $('#' + eleId);
        var targetId = $ele.attr('target-id');
        var $target = $("#" + targetId);
        var curDis = $target.css('display')
        if (curDis == 'none') {
            var preDis = displayBuffer.get(eleId)
            if (!preDis) {
                preDis = 'block';
            }
            displayBuffer.delete(eleId)
            $target.css('display', preDis);
            $ele.text($ele.attr('default-char'));
        } else {
            displayBuffer.set(eleId, curDis);
            $target.css('display', 'none');
            $ele.text($ele.attr('hidden-char'));
        }
    })
}

$('body').on('click', '#save-basic-button', () => {
    basicData = getCreatedBasic()
    window.article.saveContent({})
})

$(() => {
    var changedBuffer = {}
    var workingBuffer = {}

    registerHide("hide-editing-list");
    registerHide("hide-issued-list");
    registerHideByClass("hide-article-basic");

    function dropHandler(event) {
        event.preventDefault();

        var ev = null
        if (!event.dataTransfer) {
            ev = event.originalEvent
            if (!ev.dataTransfer) {
                console.log('出错了！没有发现传输数据！')
            }
        } else {
            ev = event
        }

        if (ev.dataTransfer.items) {
            for (let item of ev.dataTransfer.items) {
                if (item.kind === 'file') {
                    var file = item.getAsFile();
                    window.default.fileDropped(file.path)
                }
            }
        } else {
            for (let file of ev.dataTransfer.files) {
                window.default.fileDropped(file.path)
            }
        }
    }

    function dragOverHandler(ev) {
        ev.preventDefault();
    }
    $("body").on('dragover', "main", (e) => {
        dragOverHandler(e)
    })

    $("body").on('drop', "main", (e) => {
        dropHandler(e)
    })

    $("body").on('click', ".issued-detail-tab", (event) => {
        try {
            var boxid = $(event.currentTarget).attr('editor-boxid')
            var articleid = $(event.currentTarget).attr('article-id')
            if (globalMDEditors.has(boxid)) {
                return
            }
            window.monaco.initMarkdownEditor(boxid, articleid)
            globalMDEditors.set(boxid, null)

        } catch (error) {
            console.log('error: ', error)
        }
    })

    $("body").on("click", ".save-article-basic", (event) => {
        var articleId = $(event.currentTarget).attr('article-id')
        var role = $(event.currentTarget).attr('role')

        if (articleId) {
            window.article.updateArticle(articleId)
        } else if (role == SAVE_BASIC_ROLE_ADD) {
            window.article.createArticle()
        }
    })

    $("body").on("click", ".check-article-basic", (event) => {
        var articleId = $(event.currentTarget).attr('article-id')
        window.article.checkArticleMeta(articleId)
    })

    $("body").on("click", ".syn-to-cloud", (event) => {
        var articleId = $(event.currentTarget).attr('article-id')
        if (articleId) {
            window.article.synArticleToCloud(articleId)
        }
    })

    $("body").on("click", ".article-issue", (event) => {
        var articleId = $(event.currentTarget).attr('article-id')
        if (articleId) {
            window.article.articleIssue(articleId)
        }
    })

    $("body").on('DOMSubtreeModified', ".rendered-html-for-article", (event) => {
        if (!changedBuffer[event.currentTarget.id]) {
            changedBuffer[event.currentTarget.id] = true
        }
    });

    $("body").on('DOMSubtreeModified', "#nav-issued-panels", (event) => {
        var eleId = event.currentTarget.getAttribute('id')

        if (!changedBuffer[eleId]) {
            changedBuffer[eleId] = true
        }
    });

    $("body").on('click', "#insert-add-table-button", (event) => {
        event.preventDefault()
        let row = parseInt(document.getElementById("insertTableRow").value)
        let col = parseInt(document.getElementById("insertTableCol").value)
        window.article.articleInsertTable(row, col)
    })

    $("body").on("click", ".article-delete", (event) => {
        event.preventDefault()
        var articleId = $(event.currentTarget).attr('article-id')
        if (articleId) {
            window.article.articleDelete(articleId)
        }
    })

    $(document).on('click', 'a[href^="http"]', function(event) {
        event.preventDefault();
        window.default.openExternalLink(this.href);
    });

    setInterval(() => {
        for (let k in changedBuffer) {
            if (changedBuffer[k] == true) {
                var ele = document.getElementById(k)
                if (!ele) {
                    console.log('ele not found: ', k)
                    return
                }
                if (workingBuffer[k]) {
                    return
                }

                workingBuffer[k] = true
                try {
                    MathJax.typesetPromise([ele]).then(() => {
                        workingBuffer[k] = false
                        changedBuffer[k] = false
                    });
                } catch (exc) {
                    workingBuffer[k] = false
                }
            }
        }
    }, 333);


    $("#profile").on('click', (event) => {
        window.profile.showLogin()
    })

    $("#usernameShown").on('click', (event) => {
        window.profile.showUserinfo()
    })

    function resizeContentWindow() {
        // var winWidth = window.innerWidth
        // var navWidth = $("#id-main-nav-div").width()
        // $("#id-main-content-div").css('width', winWidth - navWidth)

        // var navEditingTabWidth = $("#nav-editing-tabs").width()
        // var tabPanelPaddingWidth = $("#tab-panel-padding").width()
        // var navEditingPanelDivWidth = $("#nav-editing-panel-div").width()
        // var remainingWidth = navEditingPanelDivWidth - tabPanelPaddingWidth - navEditingTabWidth
        // $("#nav-editing-panels").css("width", remainingWidth)
    }
    $(window).on('resize', function() {
        resizeContentWindow()
    })
    resizeContentWindow()
})