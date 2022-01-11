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
        accelerator: 'Ctrl+o'
    },
    { type: 'separator' },
    {
        label: _('Sync To Local'),
        click: syncToLocal,
        enabled: false
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
            accelerator: 'Ctrl+1'
        },
        {
            label: _('H2'),
            click: (menuItem, browserWindow, event) => {
                insertMarkdownElement(menuItem, browserWindow, event, "h2")
            },
            accelerator: 'Ctrl+2'
        },
        {
            label: _('H3'),
            click: (menuItem, browserWindow, event) => {
                insertMarkdownElement(menuItem, browserWindow, event, "h3")
            },
            accelerator: 'Ctrl+3'
        },
        {
            label: _('H4'),
            click: (menuItem, browserWindow, event) => {
                insertMarkdownElement(menuItem, browserWindow, event, "h4")
            },
            accelerator: 'Ctrl+4'
        },
        {
            label: _('H5'),
            click: (menuItem, browserWindow, event) => {
                insertMarkdownElement(menuItem, browserWindow, event, "h5")
            },
            accelerator: 'Ctrl+5'
        },
        {
            label: _('H6'),
            click: (menuItem, browserWindow, event) => {
                insertMarkdownElement(menuItem, browserWindow, event, "h6")
            },
            accelerator: 'Ctrl+6'
        }
        ]
    },
    { type: 'separator' },
    {
        label: _('Table'),
        click: (menuItem, browserWindow, event) => {
            insertMarkdownElement(menuItem, browserWindow, event, "table")
        },
        accelerator: 'Shift+Ctrl+t'
    },
    {
        label: _('Block Code'),
        click: (menuItem, browserWindow, event) => {
            insertMarkdownElement(menuItem, browserWindow, event, "blockcode")
        },
        accelerator: 'Shift+Ctrl+c'
    },
    {
        label: _('Formula'),
        click: (menuItem, browserWindow, event) => {
            insertMarkdownElement(menuItem, browserWindow, event, "formula")
        },
        accelerator: 'Shift+Ctrl+j'
    },
    { type: 'separator' },
    {
        label: _('Block Quote'),
        click: (menuItem, browserWindow, event) => {
            insertMarkdownElement(menuItem, browserWindow, event, "blockquote")
        },
        accelerator: 'Shift+Ctrl+p'
    },
    { type: 'separator' },
    {
        label: _('List'),
        submenu: [{
            label: _('Ordered List'),
            click: (menuItem, browserWindow, event) => {
                insertMarkdownElement(menuItem, browserWindow, event, "orderedlist")
            },
            accelerator: 'Shift+Ctrl+o'
        },
        {
            label: _('Unordered List'),
            click: (menuItem, browserWindow, event) => {
                insertMarkdownElement(menuItem, browserWindow, event, "unorderedlist")
            },
            accelerator: 'Shift+Ctrl+u'
        },
        ]
    },
    { type: 'separator' },
    {
        label: _('Link'),
        click: (menuItem, browserWindow, event) => {
            insertMarkdownElement(menuItem, browserWindow, event, "link")
        },
        accelerator: 'Shift+Ctrl+i'
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
        accelerator: 'Shift+Ctrl+i'
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
        accelerator: 'Ctrl+b'
    },
    {
        label: _('Italic'),
        click: (menuItem, browserWindow, event) => {
            formatMarkdownElement(menuItem, browserWindow, event, "italic")
        },
        accelerator: 'Ctrl+t'
    },
    {
        label: _('Code'),
        click: (menuItem, browserWindow, event) => {
            formatMarkdownElement(menuItem, browserWindow, event, "code")
        },
        accelerator: 'Ctrl+m'
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
        accelerator: 'Shift+Ctrl+h'
    }]
}
]

module.exports = {
    menuTemplate
}