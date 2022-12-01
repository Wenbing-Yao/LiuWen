function isValidHttpUrl (string) {
  let url

  try {
    url = new URL(string)
  } catch (_) {
    return false
  }

  return url.protocol === 'http:' || url.protocol === 'https:'
}
$(() => {
  $('#login-cancel').on('click', event => {
    event.preventDefault()
    window.profile.cancelLogin()
  })

  $('#login-submit').on('click', event => {
    event.preventDefault()
    window.profile.submitLogin()
  })

  $(document).on('click', 'a', function (event) {
    event.preventDefault()
    if (this.href && isValidHttpUrl(this.href)) {
      window.profile.openExternalLink(this.href)
    } else {
      //   window.profile.openLocalFile(this.href)
    }
  })
})
