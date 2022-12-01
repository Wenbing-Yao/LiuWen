const { contextBridge, ipcRenderer } = require('electron')

const { getLogger } = require('./modules/render/utils')

const logger = getLogger(__filename)

function cancelLogin () {
  ipcRenderer.send('profile:login-cancel')
}

function submitLogin () {
  var usernameEle = document.getElementById('id_username')
  var passwordEle = document.getElementById('id_password')

  var username = usernameEle.value
  var password = passwordEle.value

  if (!username || !password) {
    logger.info(`用户名和密码不能为空!`)
    return
  }

  ipcRenderer.send('profile:login-submit', username, password)
}

ipcRenderer.on('profile:login-submit-failed', (event, err) => {
  var infoEle = document.getElementById('login-alert-error')
  if (err.__all__ && err.__all__[0]) {
    infoEle.innerText = err.__all__[0]
  }
})

function openExternalLink (link) {
  ipcRenderer.send('link:open', link)
}

contextBridge.exposeInMainWorld('profile', {
  openExternalLink: openExternalLink,
  cancelLogin: cancelLogin,
  submitLogin: submitLogin
})
