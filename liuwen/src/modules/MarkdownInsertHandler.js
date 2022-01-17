const amdLoader = require('monaco-editor/min/vs/loader.js');
const amdRequire = amdLoader.require;
const path = require('path')
let monaco = null
let monacoSeted = false

const ADD_TABLE_MODAL_ID = "addTableModal"


function uriFromPath(_path) {
    var pathName = path.resolve(_path).replace(/\\/g, '/');
    if (pathName.length > 0 && pathName.charAt(0) !== '/') {
        pathName = '/' + pathName;
    }
    return encodeURI('file://' + pathName);
}

function setMonaco() {
    if (monacoSeted) {
        return
    }
    amdRequire.config({
        baseUrl: uriFromPath(path.join(__dirname, '../../node_modules/monaco-editor/min'))
    })
    self.module = undefined

    amdRequire(['vs/editor/editor.main'], function(m) {
        monaco = m
        monacoSeted = true
    })
}

setMonaco()


function insertHeader(editor, level) {
    var model = editor.getModel()

    var pos = editor.getPosition()
    var prefix = `${"#".repeat(level)} `
    var line = model.getLineContent(pos.lineNumber)
    if (line.startsWith(prefix)) {
        var column = pos.column
        if (column > prefix.length) {
            column -= prefix.length
        } else {
            column = 1
        }

        editor.executeEdits("", [{
            range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, prefix.length + 1),
            text: ""
        }])
        editor.setPosition(new monaco.Position(pos.lineNumber, column))

        return
    }
    editor.executeEdits("", [{
        range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, 1),
        text: prefix
    }])
    editor.setPosition(new monaco.Position(pos.lineNumber, pos.column + level + 1))
}

function insertH1(editor, type) {
    insertHeader(editor, 1)
}

function insertH2(editor, type) {
    insertHeader(editor, 2)
}

function insertH3(editor, type) {
    insertHeader(editor, 3)
}

function insertH4(editor, type) {
    insertHeader(editor, 4)
}

function insertH5(editor, type) {
    insertHeader(editor, 5)
}

function insertH6(editor, type) {
    insertHeader(editor, 6)
}

function insertTable(editor, type) {
    const bootstrap = require('bootstrap')
    var ele = document.getElementById(ADD_TABLE_MODAL_ID)
    if (!ele) {
        console.log(`Insert table element not found: ${ADD_TABLE_MODAL_ID}`)
        return
    }
    var addModal = bootstrap.Modal.getOrCreateInstance(ele)
    addModal.toggle()
}

function insertTableDetail(editor, row, col) {
    const bootstrap = require('bootstrap')
    var ele = document.getElementById(ADD_TABLE_MODAL_ID)
    if (!ele) {
        console.log(`Insert table element not found: ${ADD_TABLE_MODAL_ID}`)
        return
    }
    var addModal = bootstrap.Modal.getOrCreateInstance(ele)
    addModal.toggle()

    var tableMd = "\n" + '|'.repeat(col + 1).split("").join("      ") + "\n"
    if (row > 1) {
        tableMd += '|'.repeat(col + 1).split("").join(" :--- ") + "\n"
        tableMd += ('|'.repeat(col + 1).split("").join("      ") + "\n").repeat(row - 1)
    }

    var pos = editor.getPosition()
    editor.executeEdits("", [{
        range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
        text: tableMd
    }])

    editor.focus()
    editor.setPosition(new monaco.Position(pos.lineNumber + 1, 3))
}

function insertBlockcode(editor, type) {

    var pos = editor.getPosition()

    editor.executeEdits("", [{
        range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, 1),
        text: "\n```\n\n```\n"
    }])

    editor.setPosition(new monaco.Position(pos.lineNumber + 2, 1))
}

function insertFormula(editor, type) {

    var pos = editor.getPosition()

    editor.executeEdits("", [{
        range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, 1),
        text: "\n$$\n\n$$\n"
    }])

    editor.setPosition(new monaco.Position(pos.lineNumber + 2, 1))
}

function insertBlockquote(editor, type) {
    var pos = editor.getPosition()

    editor.executeEdits("", [{
        range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, 1),
        text: "\n> \n"
    }])

    editor.setPosition(new monaco.Position(pos.lineNumber + 1, 3))
}

function insertOrderedList(editor, type) {
    var selection = editor.getSelection()
    var pos = editor.getPosition()
    let start = 1
    let newPos = pos

    for (let lineNo = selection.startLineNumber; lineNo <= selection.endLineNumber; lineNo += 1) {
        var prefix = `${start}. `
        if (lineNo == pos.lineNumber) {
            newPos = new monaco.Position(pos.lineNumber, pos.column + prefix.length)
        }
        editor.executeEdits("", [{
            range: new monaco.Range(lineNo, 1, lineNo, 1),
            text: prefix
        }])
        start += 1
    }

    editor.setPosition(newPos)
}

function insertUnOrderedList(editor, type) {
    var selection = editor.getSelection()
    var pos = editor.getPosition()
    let newPos = pos

    for (let lineNo = selection.startLineNumber; lineNo <= selection.endLineNumber; lineNo += 1) {
        var prefix = `- `
        if (lineNo == pos.lineNumber) {
            newPos = new monaco.Position(pos.lineNumber, pos.column + prefix.length)
        }
        editor.executeEdits("", [{
            range: new monaco.Range(lineNo, 1, lineNo, 1),
            text: prefix
        }])
    }

    editor.setPosition(newPos)
}

function insertLink(editor, type) {
    var selection = editor.getSelection();
    // TODO: Add indication
    if (selection.startLineNumber != selection.endLineNumber) return

    // No selection
    if (selection.startColumn == selection.endColumn) {
        editor.executeEdits("", [{
            range: new monaco.Range(
                selection.startLineNumber,
                selection.startColumn,
                selection.startLineNumber,
                selection.startColumn),
            text: "[]()"
        }])
        editor.setPosition(new monaco.Position(selection.startLineNumber, selection.startColumn + 1))
        return
    }

    editor.executeEdits("", [{
        range: new monaco.Range(
            selection.startLineNumber,
            selection.startColumn,
            selection.startLineNumber,
            selection.startColumn),
        text: "["
    }])
    editor.executeEdits("", [{
        range: new monaco.Range(
            selection.startLineNumber,
            selection.endColumn + 1,
            selection.startLineNumber,
            selection.endColumn + 1),
        text: "]()"
    }])
    editor.setPosition(new monaco.Position(selection.startLineNumber, selection.endColumn + 3))
}

function insertFootnote(editor, type) {}

function setPostionAtStart(editor, x, y) {
    if (!editor) {
        return
    }

    editor.focus()
    let editorPoint = editor.getTargetAtClientPoint(x, y)

    if (!editorPoint) {
        return
    }

    editor.setPosition(new monaco.Position(
        editorPoint.position.lineNumber, 1
    ))
}

function dropImageAt(editor, fpath, x, y) {
    editor.focus()
    insertImage(editor, null, fpath, true)
}

function insertImage(editor, type, fpath = "", newLine = false) {
    var selection = editor.getSelection();
    // TODO: Add indication
    if (selection.startLineNumber != selection.endLineNumber) return

    // No selection
    if (selection.startColumn == selection.endColumn) {
        let lineSep = newLine ? "\n" : ""
        editor.executeEdits("", [{
            range: new monaco.Range(
                selection.startLineNumber,
                selection.startColumn,
                selection.startLineNumber,
                selection.startColumn),
            text: `![](${fpath}){style="max-width:500px;"}${lineSep}`
        }])
        editor.setPosition(new monaco.Position(selection.startLineNumber, selection.startColumn + 2))
        return
    }

    var selectedText = editor.getModel().getValueInRange(selection)
    editor.executeEdits("", [{
        range: new monaco.Range(
            selection.startLineNumber,
            selection.startColumn,
            selection.startLineNumber,
            selection.startColumn),
        text: `![`
    }])
    editor.executeEdits("", [{
        range: new monaco.Range(
            selection.startLineNumber,
            selection.endColumn + 2,
            selection.startLineNumber,
            selection.endColumn + 2
        ),
        text: `]( "${selectedText}"){style="max-width:500px;"}`
    }])
    editor.setPosition(
        new monaco.Position(
            selection.startLineNumber,
            selection.endColumn + 4))
}

function insertToMarkdownEditor(editor, type) {
    if (!editor) {
        console.log(`No editor found for type ${type}`)
        return
    }

    let callfunc = null;
    switch (type) {
        case "h1":
            callfunc = insertH1
            break
        case "h2":
            callfunc = insertH2
            break
        case "h3":
            callfunc = insertH3
            break
        case "h4":
            callfunc = insertH4
            break
        case "h5":
            callfunc = insertH5
            break
        case "h6":
            callfunc = insertH6
            break
        case "table":
            callfunc = insertTable
            break
        case "blockcode":
            callfunc = insertBlockcode
            break
        case "formula":
            callfunc = insertFormula
            break
        case "blockquote":
            callfunc = insertBlockquote
            break
        case "orderedlist":
            callfunc = insertOrderedList
            break
        case "unorderedlist":
            callfunc = insertUnOrderedList
            break
        case "link":
            callfunc = insertLink
            break
        case "footnote":
            callfunc = insertFootnote
            break
        case "image":
            callfunc = insertImage
            break
        default:
            callfunc = (editor, type) => {
                console.log(`Unkown markdown item type: ${type}`)
            }
            break
    }
    return callfunc(editor, type)
}

function formatText(editor, type) {
    let wrapper = null
    switch (type) {
        case 'bold':
            wrapper = "**"
            break
        case 'italic':
            wrapper = "*"
            break
        case 'code':
            wrapper = "`"
            break
        default:
            return
    }

    var selection = editor.getSelection();
    // TODO: Add indication
    if (selection.startLineNumber != selection.endLineNumber) return

    if (selection.startColumn == selection.endColumn) {
        editor.executeEdits("", [{
            range: new monaco.Range(
                selection.startLineNumber,
                selection.startColumn,
                selection.startLineNumber,
                selection.startColumn
            ),
            text: `${wrapper}${wrapper}`
        }])
        editor.setPosition(new monaco.Position(
            selection.startLineNumber, selection.startColumn + wrapper.length))
        return
    }
    var pos = editor.getPosition()

    editor.executeEdits("", [{
        range: new monaco.Range(
            selection.startLineNumber,
            selection.startColumn,
            selection.startLineNumber,
            selection.startColumn
        ),
        text: `${wrapper}`
    }])
    editor.executeEdits("", [{
        range: new monaco.Range(
            selection.startLineNumber,
            selection.endColumn + wrapper.length,
            selection.startLineNumber,
            selection.endColumn + wrapper.length
        ),
        text: `${wrapper}`
    }])
    editor.setPosition(new monaco.Position(
        pos.lineNumber, pos.column + wrapper.length
    ))
}

module.exports = {
    dropImageAt,
    insertTableDetail,
    insertToMarkdownEditor,
    formatText,
    setPostionAtStart
}