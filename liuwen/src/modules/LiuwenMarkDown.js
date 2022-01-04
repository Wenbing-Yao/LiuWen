const marked = require('marked')
const { v4: uuidv4 } = require('uuid');
const JSSoup = require('jssoup').default

const renderer = {

    table(header, body) {
        if (body) body = '<tbody>' + body + '</tbody>';

        return '<table class="table">\n' +
            '<thead>\n' +
            header +
            '</thead>\n' +
            body +
            '</table>\n';
    },

    heading(text, level, raw, slugger) {
        if (this.options.headerIds) {
            return `<h${level} level="${level}" id="${this.options.headerPrefix}${uuidv4()}"
                     class="heading heading-${level}">${text}</h${level}>\n`
        }
        // ignore IDs
        return `<h${level}>${text}</h${level}>\n`
    },

    // image(href, title, text) {
    //     if (title) {
    //         return `<figure class="d-block mx-auto">
    //                 <img src="${href}" alt="${text}">
    //                 <figcaption class="mt-2 px-3 text-center">${marked.parseInline(title)}</figcaption>
    //             </figure>`
    //     } else {
    //         return `
    //             <figure class="d-block mx-auto">
    //                 <img src="${href}" alt="${text}">
    //             </figure>`
    //     }
    // }
}

const richimage = {
    name: 'richimage',
    level: 'block',
    start(src) {
        return src.indexOf('!')
    },
    tokenizer(src) {
        // const rulepure = /!\[([^\]]*)\][\(]([^()\[\] \t]*)[ \t]*(\"[^\"]*\")?[\)](?=!\{)/
        // if (rulepure.exec(src)) {
        //     return false
        // }

        const rule = /^!\[([^\]]*)\][\(]([^()\[\] \t]*)[ \t]*(\"[^\"]*\")?[\)](\{[^\}]*\})?/
        const match = rule.exec(src)

        if (match) {
            var titles = []
            if (match[3]) {
                this.lexer.inline(match[3].slice(1, match[3].length - 1), titles)
            }
            if (match[4]) {
                addedattrs = match[4].slice(1, match[4].length - 1).trim()
            } else {
                addedattrs = ""
            }

            return {
                type: 'richimage',
                raw: match[0],
                alttext: match[1].trim(),
                source: match[2].trim(),
                title: titles,
                addedattrs: addedattrs
            }
        }
    },
    renderer(token) {
        if (token.title && token.title.length) {
            return `<figure class="d-block mx-auto">
                    <img src="${token.source}" alt="${token.alttext}" ${token.addedattrs}>
                    <figcaption class="mt-2 px-3 text-center">${this.parser.parseInline(token.title)}</figcaption>
                </figure>`
        } else {
            return `
                <figure class="d-block mx-auto">
                    <img src="${token.source}" alt="${token.alttext}" ${token.addedattrs}>
                </figure>`
        }
    }
}

const inlinelatex = {
    name: 'inlinelatex',
    level: 'inline',
    start(src) {
        const rule = /(?<![$])[$]{1,}(?![$])/
        var matched = rule.exec(src)
        if (matched) return matched.index
    },
    tokenizer(src) {
        const rule = /^[$]([^$\n]+)[$]/
        const match = rule.exec(src)
        if (!match) return false
        return {
            type: 'inlinelatex',
            raw: match[0],
            latext: match[1]
        }
    },
    renderer(token) {
        return `<span>\$${token.latext}\$</span>`
    }
}

const blocklatex = {
    name: 'blocklatex',
    level: 'block',
    start(src) {
        const rule = /[$]{2,}\n/
        var matched = rule.exec(src)
        if (matched) return matched.index
    },
    tokenizer(src) {
        // const rule = /^([$]{2,})\n([^$]*?)+\n[$]{2,}(?:\n+)$/
        const rule = /^([$]{2,}(?=[^`\n]*\n))([^\n]*)\n(?:|([\s\S]*?)\n) *\1(?: *(?=\n|$)|$)/
        const match = rule.exec(src)
        if (!match) {
            return false
        }
        return {
            type: 'blocklatex',
            raw: match[0],
            latext: match[3]
        }
    },
    renderer(token) {
        return `<div>\$\$
        ${token.latext}
        \$\$</div>`
    }
}

marked.setOptions({
    // highlight: function(code, lang) {
    //     const hljs = require('highlight.js');
    //     const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    //     return hljs.highlight(code, { language }).value;
    // },
    langPrefix: 'hljs language-'
})
marked.use({ extensions: [richimage, blocklatex, inlinelatex], renderer })

class ToCNode {
    constructor(id, title, level, children, parent, tag = 'ol') {
        this.id = id
        this.title = title
        this.level = level
        if (!children) {
            this.children = []
        } else {
            this.children = children
        }
        this.parent = parent
        this.tag = tag
        this.isRoot = false
    }

    setRoot() {
        this.isRoot = true
    }

    addChild(child) {
        if (child.level > this.level) {
            if (!this.children || this.children.length == 0) {
                child.parent = this
                this.children = [child]
                return this
            }
            child.parent = this
            this.children[this.children.length - 1].addChild(child)
            return this
        }

        if (child.level == this.level && this.parent) {
            child.parent = this.parent
            this.parent.children.push(child)
            return this.parent
        }

        var parent = new ToCNode(null, null, child.level - 1, [this, child], null)
        this.parent = parent
        child.parent = parent

        return parent
    }

    toString() {
        var children = ""
        for (let child of this.children) {
            children += child.toString()
        }

        if (this.children && this.children.length != 0) {
            if (this.title) {
                let res = `<li><a href="#${this.id}">${this.title}</a><${this.tag}>${children}</${this.tag}></li>`
                if (this.isRoot) {
                    res = `<${this.tag}>${res}</${this.tag}>`
                }
                return res
            } else {
                return `<${this.tag}>${children}</${this.tag}>`
            }
        } else {
            if (this.title) {
                let res = `<li><a href="#${this.id}">${this.title}</a></li>`
                if (this.isRoot) {
                    res = `<${this.tag}>${res}</${this.tag}>`
                }
                return res
            } else {
                return ""
            }
        }
    }
}

class Markdown {
    constructor() {
        this.marked = marked
        this.dirRoot = null
        this.soup = null
        this.figPrefix = '图'
        this.figSuffix = '：'
        this.figNumber = 1
    }

    numberAllFigureCaptain(html, soupOnly = false) {
        if (!this.soup) {
            console.log('new a soup in captain')
            this.soup = new JSSoup(html)
        }
        var soup = this.soup

        var figures = soup.findAll('figure')
        if (!figures) {
            return html
        }
        for (let fig of figures) {
            var cap = fig.find('figcaption')
            if (!cap) {
                var capdata = `<figcaption class="mt-2 px-3 text-center">${this.figPrefix} ${this.figNumber}</figcaption>`
                cap = new JSSoup(capdata)
                fig.append(cap)
            } else {
                if (cap.string) {
                    cap.string.replaceWith(`${this.figPrefix} ${this.figNumber}${this.figSuffix}${cap.string}`)
                } else {
                    cap.extract()
                    var capdata = `<figcaption class="mt-2 px-3 text-center">${this.figPrefix} ${this.figNumber}${this.figSuffix}</figcaption>`
                    var capsoup = new JSSoup(capdata)
                    var newcap = capsoup.nextElement
                    for (let c of cap.contents) {
                        newcap.append(c)
                    }
                    fig.append(newcap)
                }

            }
            this.figNumber += 1
        }

        if (soupOnly) {
            return this.soup
        }

        return this.soup.toString()
    }

    buildDirectory(html) {
        this.dirRoot = null
        if (!this.soup) {
            this.soup = new JSSoup(html)
        }
        var soup = this.soup
        var allHeaders = []
        var headings = soup.findAll(undefined, "heading")
        if (!headings) {
            return ""
        }

        for (let h of headings) {
            allHeaders.push({
                id: h.attrs.id,
                level: parseInt(h.attrs.level),
                title: h.string.toString()
            })
            var node = new ToCNode(h.attrs.id, h.string.toString(), parseInt(h.attrs.level), [], null)
            if (this.dirRoot == null) {
                this.dirRoot = node
            } else {
                this.dirRoot = this.dirRoot.addChild(node)
            }
        }

        this.dirRoot.setRoot()
        var tocBody = this.dirRoot.toString()
        var tocHead = "<p>文章目录</p>"
        console.log('body:')
        console.log(tocBody)
        return `<div class="article-directory" id="article-directory">${tocHead}<hr>${tocBody}</div>`
    }

    addIdForAll(html = null) {
        if (!this.soup) {
            if (html != null) this.soup = new JSSoup(html)
        }
        var soup = this.soup
        if (soup == null) return

        var firstEl = soup.nextElement

        if (!firstEl) return

        // console.log(firstEl.toString())
        // console.log(firstEl)
        if (firstEl.attrs.id === undefined) {
            firstEl.attrs.id = uuidv4()
            console.log('add element for', firstEl)
        }

        var allSiblings = firstEl.nextSiblings
        if (!allSiblings || allSiblings.length == 0) return

        for (let el of allSiblings) {
            if (el.attrs.id === undefined)
                el.attrs.id = uuidv4()
        }
    }

    convert(mdText, notoc = false, numberFigure = false, addids = true) {
        var html = this.marked.parse(mdText)
        this.soup = null
        if (addids) {
            this.addIdForAll(html)
        }
        if (numberFigure) {
            html = this.numberAllFigureCaptain(html)
        }

        if (notoc) {
            return html
        } else {
            console.log('add directory')
            var toc = this.buildDirectory(html)
            return toc + html
        }
    }

    convertToSoup(mdText, numberFigure) {
        var html = this.marked.parse(mdText)
        this.soup = null

        if (numberFigure) {
            this.numberAllFigureCaptain(html)
            return this.soup
        }

        this.soup = new JSSoup(html)
        return this.soup
    }
}

module.exports = {
    Markdown
}