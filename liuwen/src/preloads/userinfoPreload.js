const { configure } = require('nunjucks')
const { contextBridge, ipcRenderer } = require('electron')
const path = require('path')

const USERINFO_TEMPLATE_NAME = 'profile/userinfo.html'

function closeUserinfo() {
    ipcRenderer.send('profile:userinfo-close')
}

function logout() {
    ipcRenderer.send('profile:logout')
}

function loadUserinfo(user) {
    env = configure(path.join(__dirname, '../templates'))
    env.render(USERINFO_TEMPLATE_NAME, {
        user: user
    }, (err, res) => {
        console.log('err: ', err)
        console.log('render res: ', res)
        const element = document.getElementById('id-userinfo')
        if (element) {
            element.innerHTML = res
        }
    })
}

window.addEventListener('DOMContentLoaded', () => {
    ipcRenderer.send('userinfo:render')
})

ipcRenderer.on('userinfo:render-reply', (event, userinfo) => {
    loadUserinfo(userinfo)
})

contextBridge.exposeInMainWorld('profile', {
    'closeUserinfo': closeUserinfo,
    'logout': logout
})