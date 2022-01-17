const { app } = require('electron')
const { gettext: _ } = require('../locale/i18n')
const { insertMarkdownElement, formatMarkdownElement, openLocalMarkdown, showMarkdownHelp, syncToLocal } = require('./handler')


const menuTemplate = [{
        label: _(app.getName()),
        submenu: [{
                role: 'about',
                label: _('About') + " " + _('LiuWen')
            },
            { type: 'separator' },
            {
                role: 'quit',
                label: _('Quit') + " " + _('LiuWen')
            }
        ]
    },
    {
        label: _('File'),
        submenu: [{
                label: _('Open Markdown File'),
                click: openLocalMarkdown,
                accelerator: 'Cmd+o'
            },
            { type: 'separator' },
            {
                label: _('Sync To Local'),
                click: syncToLocal,
                accelerator: 'Cmd+Shift+s'
            }
        ]
    },
    {
        // undo, redo, cut, copy, paste
        label: _("Edit"),
        submenu: [{
                label: _('Undo'),
                role: 'undo',
                accelerator: 'Cmd+z'
            },
            {
                label: _('Redo'),
                role: 'redo',
                accelerator: 'Cmd+Shift+z'
            },
            { type: 'separator' },
            {
                label: _('Copy'),
                role: 'copy',
                accelerator: 'Cmd+c'
            },
            {
                label: _('Paste'),
                role: 'paste',
                accelerator: 'Cmd+v'
            },
            {
                label: _('Cut'),
                role: 'cut',
                accelerator: 'Cmd+x'
            },
            { type: 'separator' },
            {
                label: _('SelectAll'),
                role: 'selectAll',
                accelerator: 'Cmd+a'
            }
        ]
    },
    {
        label: _('Insert'),
        submenu: [{
                label: _('Header'),
                submenu: [{
                        label: _('H1'),
                        click: (menuItem, browserWindow, event) => {
                            insertMarkdownElement(menuItem, browserWindow, event, "h1")
                        },
                        accelerator: 'Cmd+1'
                    },
                    {
                        label: _('H2'),
                        click: (menuItem, browserWindow, event) => {
                            insertMarkdownElement(menuItem, browserWindow, event, "h2")
                        },
                        accelerator: 'Cmd+2'
                    },
                    {
                        label: _('H3'),
                        click: (menuItem, browserWindow, event) => {
                            insertMarkdownElement(menuItem, browserWindow, event, "h3")
                        },
                        accelerator: 'Cmd+3'
                    },
                    {
                        label: _('H4'),
                        click: (menuItem, browserWindow, event) => {
                            insertMarkdownElement(menuItem, browserWindow, event, "h4")
                        },
                        accelerator: 'Cmd+4'
                    },
                    {
                        label: _('H5'),
                        click: (menuItem, browserWindow, event) => {
                            insertMarkdownElement(menuItem, browserWindow, event, "h5")
                        },
                        accelerator: 'Cmd+5'
                    },
                    {
                        label: _('H6'),
                        click: (menuItem, browserWindow, event) => {
                            insertMarkdownElement(menuItem, browserWindow, event, "h6")
                        },
                        accelerator: 'Cmd+6'
                    }
                ]
            },
            { type: 'separator' },
            {
                label: _('Table'),
                click: (menuItem, browserWindow, event) => {
                    insertMarkdownElement(menuItem, browserWindow, event, "table")
                },
                accelerator: 'Shift+Cmd+t'
            },
            {
                label: _('Block Code'),
                click: (menuItem, browserWindow, event) => {
                    insertMarkdownElement(menuItem, browserWindow, event, "blockcode")
                },
                accelerator: 'Shift+Cmd+c'
            },
            {
                label: _('Formula'),
                click: (menuItem, browserWindow, event) => {
                    insertMarkdownElement(menuItem, browserWindow, event, "formula")
                },
                accelerator: 'Shift+Cmd+j'
            },
            { type: 'separator' },
            {
                label: _('Block Quote'),
                click: (menuItem, browserWindow, event) => {
                    insertMarkdownElement(menuItem, browserWindow, event, "blockquote")
                },
                accelerator: 'Shift+Cmd+p'
            },
            { type: 'separator' },
            {
                label: _('List'),
                submenu: [{
                        label: _('Ordered List'),
                        click: (menuItem, browserWindow, event) => {
                            insertMarkdownElement(menuItem, browserWindow, event, "orderedlist")
                        },
                        accelerator: 'Shift+Cmd+o'
                    },
                    {
                        label: _('Unordered List'),
                        click: (menuItem, browserWindow, event) => {
                            insertMarkdownElement(menuItem, browserWindow, event, "unorderedlist")
                        },
                        accelerator: 'Shift+Cmd+u'
                    },
                ]
            },
            { type: 'separator' },
            {
                label: _('Link'),
                click: (menuItem, browserWindow, event) => {
                    insertMarkdownElement(menuItem, browserWindow, event, "link")
                },
                accelerator: 'Shift+Cmd+i'
            },
            // {
            //     label: _('Footnote'),
            //     click: (menuItem, browserWindow, event) => {
            //         insertMarkdownElement(menuItem, browserWindow, event, "footnote")
            //     }
            // },
            {
                label: _('Image'),
                click: (menuItem, browserWindow, event) => {
                    insertMarkdownElement(menuItem, browserWindow, event, "image")
                },
                accelerator: 'Shift+Cmd+i'
            },
        ]
    },
    {
        label: _('Format'),
        submenu: [{
                label: _('Bold'),
                click: (menuItem, browserWindow, event) => {
                    formatMarkdownElement(menuItem, browserWindow, event, "bold")
                },
                accelerator: 'Cmd+b'
            },
            {
                label: _('Italic'),
                click: (menuItem, browserWindow, event) => {
                    formatMarkdownElement(menuItem, browserWindow, event, "italic")
                },
                accelerator: 'Cmd+t'
            },
            {
                label: _('Code'),
                click: (menuItem, browserWindow, event) => {
                    formatMarkdownElement(menuItem, browserWindow, event, "code")
                },
                accelerator: 'Cmd+m'
            }
        ]
    },
    {
        label: _('Theme'),
        submenu: [
            { label: _('Default'), enabled: false },
            { label: _('Dark'), checked: true, type: 'radio' },
            { label: _('Light'), enabled: false }
        ]
    },
    {
        label: _('Help'),
        role: 'help',
        submenu: [{
            label: _('Markdown Syntax'),
            click: showMarkdownHelp,
            accelerator: 'Shift+Cmd+h'
        }]
    }
]

module.exports = {
    menuTemplate
}