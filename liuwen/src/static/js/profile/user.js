$(() => {
    $("#userinfo-close-modal").on('click', (event) => {
        event.preventDefault()
        window.profile.closeUserinfo()
    })

    $("#id-logout").on('click', (event) => {
        event.preventDefault()
        window.profile.logout()
    })
})