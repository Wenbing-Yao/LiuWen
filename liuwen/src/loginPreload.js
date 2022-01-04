const { contextBridge, ipcRenderer } = require('electron')

function cancelLogin() {
    ipcRenderer.send('profile:login-cancel')
}

function submitLogin() {
    var usernameEle = document.getElementById("id_username")
    var passwordEle = document.getElementById("id_password")

    var username = usernameEle.value
    var password = passwordEle.value

    if (!username || !password) {
        console.log(`用户名和密码不能为空!`)
        return
    }

    ipcRenderer.send('profile:login-submit', username, password)
}

ipcRenderer.on('profile:login-submit-failed', (event, err) => {
    var infoEle = document.getElementById("login-alert-error")
    if (err.__all__ && err.__all__[0]) {
        infoEle.innerText = err.__all__[0]
    }
})

contextBridge.exposeInMainWorld('profile', {
    'cancelLogin': cancelLogin,
    'submitLogin': submitLogin
})