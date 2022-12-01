const { contextBridge, ipcRenderer } = require('electron')

function openExternalLink(link) {
    ipcRenderer.send('link:open', link)
}

function openLocalFile(fpath) {
    ipcRenderer.send('localfile:open', fpath)
}


contextBridge.exposeInMainWorld('article', {
    'closePreviewModal': (localId) => ipcRenderer.send('article:modal-preview-close', localId)
})

contextBridge.exposeInMainWorld('default', {
    'openExternalLink': openExternalLink,
    'openLocalFile': openLocalFile
})
