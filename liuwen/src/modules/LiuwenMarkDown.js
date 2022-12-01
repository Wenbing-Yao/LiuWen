const marked = require('marked')
const { v4: uuidv4 } = require('uuid')
const path = require('path')
const JSSoup = require('jssoup').default
const { getLogger } = require('../modules/render/utils')
const os = require('os')
const { trans } = require('../locale/i18n')

const QCE = 'CODE_EXECUTION'
const QSL = 'SELECTION'
const QSP = 'SIMPLE'

const logger = getLogger(__filename)

const renderer = {
  table (header, body) {
    if (body) body = '<tbody>' + body + '</tbody>'

    return (
      '<table class="table">\n' +
      '<thead>\n' +
      header +
      '</thead>\n' +
      body +
      '</table>\n'
    )
  },

  heading (text, level, raw, slugger) {
    if (this.options.headerIds) {
      return `<h${level} level="${level}" id="${
        this.options.headerPrefix
      }${uuidv4()}"
                     class="heading heading-${level}">${text}</h${level}>\n`
    }
    // ignore IDs
    return `<h${level}>${text}</h${level}>\n`
  }

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
  level: 'inline',
  start (src) {
    return src.indexOf('!')
  },
  tokenizer (src) {
    // const rulepure = /!\[([^\]]*)\][\(]([^()\[\] \t]*)[ \t]*(\"[^\"]*\")?[\)](?=!\{)/
    // if (rulepure.exec(src)) {
    //     return false
    // }

    const rule =
      /^!\[([^\]]*)\][\(]([^()\[\]"\t]*(?![ ]))[ \t]*(["'][^\"]*["'])?[\)](\{[^\}]*\})?/
    const match = rule.exec(src)

    if (match) {
      var titles = []
      if (match[3]) {
        this.lexer.inlineTokens(match[3].slice(1, match[3].length - 1), titles)
      }
      if (match[4]) {
        addedattrs = match[4].slice(1, match[4].length - 1).trim()
      } else {
        addedattrs = ''
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
  renderer (token) {
    if (token.title && token.title.length) {
      return `<figure class="d-block mx-auto">
                    <img src="${token.source}" alt="${token.alttext}" ${
        token.addedattrs
      }>
                    <figcaption class="mt-2 px-3 text-center">${this.parser.parseInline(
                      token.title
                    )}</figcaption>
                </figure>`
    } else {
      return `
                <figure class="d-block mx-auto">
                    <img src="${token.source}" alt="${token.alttext}" ${token.addedattrs}>
                </figure>`
    }
  }
}

function extract_qa_content (question, trim = true) {
  var qts = []
  for (let line of question.trim().split('\n')) {
    let s = line.substring(1)
    if (trim) {
      s = s.trim()
    }
    if (s.length) qts.push(s)
  }
  return qts.join('\n')
}

function parse_qa_code (src) {
  const rule = /\`{3}(?<language>\w*)\s*\n(?<code>((?![\`]).*\n)*)[\`]{3}/

  var matched = rule.exec(src)
  if (!matched) {
    return {
      language: '',
      code: ''
    }
  }

  return matched.groups
}

function parse_qa_selections (src) {
  var selections = []
  const rule = /\[(?<is_correct>[YNyn])\]\s*(?<desc>[^\n]*)/
  for (let line of src.split('\n')) {
    if (!line) continue

    var matched = rule.exec(line)
    if (!matched) {
      logger.info(`line not match: ${line}`)
      continue
    }

    selections.push(matched.groups)
  }

  return selections
}

const questions = {
  name: 'questions',
  level: 'block',
  start (src) {
    const rule = /^:~~(.*)~~/
    var matched = rule.exec(src)
    if (matched) return matched.index
  },
  tokenizer (src) {
    const rule =
      /^:~~\s*QA-(?<qtype>[^\n]*)~~[ \t]*\n(?<question>(:(?<![-])[^-\n]*\n)+):--\s*\n(?<answer>(:(?<![~])[^~\n]*\n)+):[~]{4}[ \t]*/
    const matched = rule.exec(src)
    if (!matched) {
      return false
    }

    var qtype = matched.groups.qtype.trim()
    var answer = ''
    let mid = extract_qa_content(matched.groups.answer)

    var res = {
      type: 'questions',
      raw: matched[0],
      qtype: qtype,
      question: extract_qa_content(matched.groups.question)
    }

    if (qtype == QSP) {
      answer = mid
    } else if (qtype == QCE) {
      answer = parse_qa_code(extract_qa_content(matched.groups.answer, false))
    } else if (qtype == QSL) {
      answer = parse_qa_selections(mid)
    }

    res.answer = answer
    return res
  },
  renderer (token) {
    var template = null
    switch (token.qtype) {
      case QSP:
        template = 'simple.html'
        break
      case QCE:
        template = 'code.html'
        break
      case QSL:
        template = 'selection.html'
        break
      default: {
        logger.info(`question type ${token.qtype} not match!`)
        return ''
      }
    }
    const { configure } = require('nunjucks')
    let env = configure(path.join(__dirname, '../templates/snipets/qas/'))
    env.addFilter('trans', trans)

    var res = env.render(template, {
      qa: token
    })

    return res
  }
}

const richstrong = {
  name: 'richstrong',
  level: 'inline',
  start (src) {
    const rule = /(?<![\\*_])[*_]{1,3}(?![*_])/
    var matched = rule.exec(src)
    if (matched) return matched.index
  },
  tokenizer (src) {
    const rule = /^([*_]{1,3})([^*_]+)\1(?![*_])/
    var matched = rule.exec(src)
    if (!matched) return false
    var TAGS = {
      1: 'em',
      2: 'strong',
      3: 'emstrong'
    }
    var inlineContents = []
    this.lexer.inline(matched[2], inlineContents)
    return {
      type: 'richstrong',
      raw: matched[0],
      tag: TAGS[matched[1].length],
      content: inlineContents
    }
  },
  renderer (token) {
    return `<${token.tag}>${this.parser.parseInline(token.content)}</${
      token.tag
    }>`
  }
}

const filext = {
  name: 'filext',
  level: 'inline',
  start (src) {
    const rule = /^(?<![\\])!\(([^)\n]+)\)[\[]([^\]\n]+)[\]]/
    var matched = rule.exec(src)
    if (matched) return matched.index
  },
  tokenizer (src) {
    const rule = /^(?<![\\])!\(([^)\n]*)\)[\[]([^\]\n]*)[\]]/
    const matched = rule.exec(src)
    if (!matched) {
      return false
    }

    return {
      type: 'filext',
      raw: matched[0],
      showntext: matched[1].trim() || path.basename(matched[2]),
      source: matched[2].trim()
    }
  },
  renderer (token) {
    return `<a role="mdlink" class="link" href="${token.source}"><span class="me-1">📜</span>${token.showntext}</a>`
  }
}

const inlinelink = {
  name: 'inlinelink',
  level: 'inline',
  start (src) {
    const rule = /(?<![!])[[]/
    var matched = rule.exec(src)
    if (matched) {
      return matched.index
    }
  },
  tokenizer (src) {
    const rule1 = /^[[]([^\]\n]*)[\]][(][<]([^\]\n>]*)[>][)]/
    const rule2 = /^[[]([^\]\n]*)[\]][(]([^\]\n)]*)[)]/
    let match = rule1.exec(src)
    if (!match) {
      match = rule2.exec(src)
      if (!match) return false
    }

    return {
      type: 'inlinelink',
      raw: match[0],
      text: match[1],
      href: match[2]
    }
  },
  renderer (token) {
    return `<a href="${token.href}">${token.text}</a>`
  }
}

const inlinelatex = {
  name: 'inlinelatex',
  level: 'inline',
  start (src) {
    const rule = /(?<![$])[$]{1,}(?![$])/
    var matched = rule.exec(src)
    if (matched) return matched.index
  },
  tokenizer (src) {
    const rule = /^[$]([^$\n]+)[$]/
    const match = rule.exec(src)
    if (!match) return false
    return {
      type: 'inlinelatex',
      raw: match[0],
      latext: match[1]
    }
  },
  renderer (token) {
    return `<span>\$${token.latext}\$</span>`
  }
}

const blocklatex = {
  name: 'blocklatex',
  level: 'block',
  start (src) {
    const rule = /[$]{2,}\n/
    var matched = rule.exec(src)
    if (matched) return matched.index
  },
  tokenizer (src) {
    // const rule = /^([$]{2,})\n([^$]*?)+\n[$]{2,}(?:\n+)$/
    const rule =
      /^([$]{2,}(?=[^`\n]*\n))([^\n]*)\n(?:|([\s\S]*?)\n) *\1(?: *(?=\n|$)|$)/
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
  renderer (token) {
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
marked.use({
  extensions: [
    // inlinelink,
    filext,
    richimage,
    blocklatex,
    inlinelatex,
    richstrong,
    questions
  ],
  renderer
})

class ToCNode {
  constructor (id, title, level, children, parent, tag = 'ol') {
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

  setRoot () {
    this.isRoot = true
  }

  addChild (child) {
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

  toString () {
    var children = ''
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
        return ''
      }
    }
  }
}

class Markdown {
  constructor (relDir = null) {
    this.marked = marked
    this.dirRoot = null
    this.soup = null
    this.figPrefix = trans('图')
    this.figSuffix = trans('：')
    this.figNumber = 1
    this.relDir = relDir
  }

  numberAllFigureCaptain (html, soupOnly = false) {
    if (!this.soup) {
      this.soup = new JSSoup(html)
    }
    var soup = this.soup

    var links = soup.findAll('a')
    if (links) {
      for (let link of links) {
        if (
          !link ||
          !link.attrs ||
          link.attrs.role != 'mdlink' ||
          !link.attrs.href
        ) {
          continue
        }

        let href = link.attrs.href
        if (href.startsWith('http') || href.startsWith('/')) {
          continue
        }

        if (href.startsWith('~/')) {
          link.attrs.href = path.join(os.homedir(), href.slice(2))
          continue
        }

        link.attrs.href = path.join(this.relDir, href)
      }
    }

    var figures = soup.findAll('figure')
    if (!figures) {
      return soup.toString()
    }
    for (let fig of figures) {
      var cap = fig.find('figcaption')
      if (!cap) {
        var capdata = `<figcaption class="mt-2 px-3 text-center">${this.figPrefix} ${this.figNumber}</figcaption>`
        cap = new JSSoup(capdata)
        fig.append(cap)
      } else {
        if (cap.string) {
          cap.string.replaceWith(
            `${this.figPrefix} ${this.figNumber}${this.figSuffix}${cap.string}`
          )
        } else {
          cap.extract()
          var capdata = `<figcaption class="mt-2 px-3 text-center">${this.figPrefix} ${this.figNumber}${this.figSuffix}</figcaption>`
          var capsoup = new JSSoup(capdata)
          var newcap = capsoup.nextElement
          for (let c of cap.contents) {
            if (c.name) newcap.append(c)
            else newcap.append(new JSSoup(`<span>${c.toString()}</span>`))
          }
          fig.append(newcap)
        }
      }
      this.figNumber += 1

      if (!this.relDir) {
        continue
      }

      var img = fig.find('img')
      if (
        !img ||
        !img.attrs ||
        !img.attrs.src ||
        // || !img.attrs.src.startsWith('.')
        img.attrs.src.startsWith('http://') ||
        img.attrs.src.startsWith('https://') ||
        img.attrs.src.startsWith('/')
      )
        continue

      if (img.attrs.src.startsWith('~/')) {
        img.attrs.src = path.join(os.homedir(), img.attrs.src.slice(2))
        continue
      }
      img.attrs.src = path.join(this.relDir, img.attrs.src)
    }

    if (soupOnly) {
      return this.soup
    }

    return this.soup.toString()
  }

  buildDirectory (html) {
    this.dirRoot = null
    if (!this.soup) {
      this.soup = new JSSoup(html)
    }
    var soup = this.soup
    var allHeaders = []
    var headings = soup.findAll(undefined, 'heading')
    if (!headings) {
      return ''
    }

    for (let h of headings) {
      allHeaders.push({
        id: h.attrs.id,
        level: parseInt(h.attrs.level),
        title: h.string ? h.string.toString() : h.contents.toString()
      })
      var node = new ToCNode(
        h.attrs.id,
        h.string ? h.string.toString() : h.contents.join(''),
        parseInt(h.attrs.level),
        [],
        null
      )
      if (this.dirRoot == null) {
        this.dirRoot = node
      } else {
        this.dirRoot = this.dirRoot.addChild(node)
      }
    }

    if (this.dirRoot) {
      this.dirRoot.setRoot()
      var tocBody = this.dirRoot.toString()
      var tocHead = '<p>文章目录</p>'
      return `<div class="article-directory" id="article-directory">${tocHead}<hr>${tocBody}</div>`
    }

    return ''
  }

  addIdForAll (html = null) {
    if (!this.soup) {
      if (html != null) this.soup = new JSSoup(html)
    }
    var soup = this.soup
    if (soup == null) return

    var firstEl = soup.nextElement

    if (!firstEl) return

    if (firstEl.attrs.id === undefined) {
      firstEl.attrs.id = uuidv4()
    }

    var allSiblings = firstEl.nextSiblings
    if (!allSiblings || allSiblings.length == 0) return

    for (let el of allSiblings) {
      if (el.attrs.id === undefined) el.attrs.id = uuidv4()
    }
  }

  convert (mdText, notoc = false, numberFigure = false, addids = true) {
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
      var toc = this.buildDirectory(html)
      return toc + html
    }
  }

  convertToSoup (mdText, numberFigure) {
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
