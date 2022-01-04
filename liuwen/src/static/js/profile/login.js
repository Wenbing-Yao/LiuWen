$(() => {
    $("#login-cancel").on('click', (event) => {
        window.profile.cancelLogin()
    })

    $("#login-submit").on('click', (event) => {
        event.preventDefault()
        window.profile.submitLogin()
    })
})