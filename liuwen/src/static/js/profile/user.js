$(() => {
    $("#userinfo-close-modal").on('click', (event) => {
        window.profile.closeUserinfo()
    })

    $("#id-logout").on('click', (evnet) => {
        window.profile.logout()
    })
})