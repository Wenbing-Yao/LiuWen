const path = require('path')
const { createReadStream, createWriteStream } = require('fs')
const fetch = require('node-fetch');
const FormData = require('form-data');

const { storeKeyJson, getKeyJson } = require('./RawKeyValueStore')
const { settingStorage } = require('./UserSettings')
const { isDev, URLS } = require('./config')
const { getLogger } = require('../modules/render/utils')

const logger = getLogger(__filename)
const baseUrl = isDev ? URLS['dev-domain'] : URLS.domain


const Paths = {
    'login': 'accounts/login/',
    'checkLogin': 'accounts/amilogin/'
}

const CookieFname = 'Cookie'

function parseSetCookie(cookieStr) {
    var parts = cookieStr.split(";")
    var cookies = {}

    for (let part of parts) {
        var pair = part.split("=")
        cookies[pair[0].trim()] = pair[1]
    }

    return cookies
}

String.prototype.format = function () {
    a = this;
    for (k in arguments[0]) {
        a = a.replace("{" + k + "}", arguments[0][k])
    }
    return a
}

function buildUrlConfs(appName, urls) {
    var urlCopy = JSON.parse(JSON.stringify(urls))

    for (let method in urlCopy) {
        for (let k in urlCopy[method]) {
            urlCopy[method][k] = appName + '/' + urlCopy[method][k]
        }
    }

    return urlCopy
}

function camelCase(input) {
    return input.toLowerCase().replace(/-(.)/g, function (match, group1) {
        return group1.toUpperCase();
    });
}

class PaperExplainedClient {

    constructor(appName, username, onLine = true) {
        this.appName = appName
        this.username = username
        this.onLine = onLine
        this.domain = URLS.domain
        this.funcs = {}
        this.funcPaths = {}
        // this.peSession = session.fromPartition(`persist:${webClientSessionName}`)
        this.cs = this.getCookieString()
        if (!this.cs || !this.cs.includes('csrftoken')) {
            this.initCsrftokenString()
        }
        this.loadUrlConfig('accounts')
        this.loadUrlConfig(appName)

        if (this.onLine) {
            this.amILogin()
        } else {
            this.isLogin = false
            logger.info(`You are not online, skip login check!`)
        }
    }

    loadUrlConfig(appName) {
        this.urls = buildUrlConfs(appName, URLS.urls[appName])

        for (let method in this.urls) {
            this.setFunction(method, this.urls[method])
        }
    }

    setFunction(method, confs) {
        for (let name in confs) {
            var path = confs[name]
            var funcName = camelCase(name)
            this.funcPaths[funcName] = path
            if (name == 'login') {
                continue
            }
            if (method == 'GET') {
                this[funcName] = (fname, success, error, urlParams) => {
                    var newPath = this.funcPaths[fname]
                    if (urlParams) {
                        newPath = newPath.format(urlParams)
                    }
                    return this.ajaxGet(newPath, success, error)
                }
            } else if (method == 'POST') {
                this[funcName] = (fname, data, files, success, error, urlParams) => {
                    var newPath = this.funcPaths[fname]
                    if (urlParams) {
                        newPath = newPath.format(urlParams)
                    }
                    return this.ajaxPost(newPath, data, files, success, error)
                }
            }
        }
    }

    get(fname, success, error, urlParams) {
        if (!error) {
            error = err => {
                try {
                    logger.error(`get error: ${err.toString()}`)
                }
                catch (exc) {
                    logger.error(`get error: ${err.toString()}`)
                }
            }
        }

        if (!this[fname]) {
            error(`Get function not found: ${fname}`)
            return
        }

        return this[fname](fname, success, error, urlParams)
    }

    post(fname, data, files, success, error, urlParams) {

        if (!error) {
            error = err => {
                try {
                    logger.error(`post error: ${err.toString()}`)
                }
                catch (exc) {
                    logger.error(`post error: ${err.toString()}`)
                }
            }

        }

        if (!this[fname]) {
            error(`Post function not found: ${fname}`)
            return
        }
        return this[fname](fname, data, files, success, error, urlParams)
    }

    initCsrftokenString() {
        var url = `${baseUrl}/`
        fetch(url).then(res => {
            var cookiesJson = this.setCookie(res.headers.raw()['set-cookie'])
            this.cs = this.getCookieString(cookiesJson)
        })
    }

    extractFilename(url) {
        let pathname = null
        try {
            let u = new URL(url)
            pathname = u.pathname
        } catch (err) {
            logger.error(`Not valid url: ${url}`)
            pathname = url
        }
        return path.basename(pathname)
    }

    download(url, directory, success, error) {
        let fname = this.extractFilename(url)

        logger.info(`download url: ${url}`)

        return fetch(url).then(response => new Promise((resolve, reject) => {
            if (!response.ok) {
                logger.error(`Url "${url}" download failed!`)
                return reject(null)
            }

            let fpath = path.join(directory, fname)
            let fstream = createWriteStream(fpath)
            response.body.pipe(fstream)
            fstream.on('close', () => {
                if (success) {
                    resolve(success(fname))
                }
                resolve(fpath)
            })
            fstream.on("error", () => {
                if (error) {
                    error()
                }
                reject(null)
            })
        }))
    }

    ajaxGet(path, success, error) {
        var url = `${baseUrl}/${path}`
        logger.info(`Get url: ${url}`)

        return fetch(url, {
            method: 'get',
            headers: {
                "X-Requested-With": "XMLHttpRequest",
                'Cookie': this.cs
            }
        })
            .then(res => {
                if (res.status < 400) {
                    return res.text().then(txt => {
                        var info = txt
                        try {
                            var json = JSON.parse(txt)
                            info = json["info"]
                        } catch (err) { }

                        if (success) {
                            success(info)
                        } else {
                            logger.info('ajax get success, url:', url)
                        }
                        return info
                    })
                } else {
                    return res.text().then(txt => {
                        var info = txt
                        try {
                            var json = JSON.parse(txt)
                            info = json["info"]
                        } catch (err) { }

                        if (isDev) {
                            console.log(info)
                        }
                        if (error) {
                            error(info)
                        } else {
                            console.error('ajax get failed, url:', url, ' error:', info)
                        }

                        return info
                    })
                }
            })
            .catch((err) => {
                if (isDev) {
                    console.log(err)
                }
                if (error) {
                    error(err)
                } else {
                    logger.error(`Get url ${url} failed! Error info: ${err.message}`)
                }
                return {}
            })
    }

    setCookie(cookies) {
        if (!cookies) {
            return
        }
        var cookiesPre = getKeyJson(CookieFname, this.username)

        for (let cs of cookies) {
            var key = cs.split(';')[0].split('=')[0]
            if (!key) continue

            var value = parseSetCookie(cs)
            cookiesPre[key] = value
            if (key == 'csrftoken') {
                this.csrftoken = value.csrftoken
            }
        }
        storeKeyJson(CookieFname, cookiesPre, this.username)
        this.cs = this.getCookieString(cookiesPre)

        return cookiesPre
    }

    getCookieString(cookiesJson) {
        if (!cookiesJson) {
            var cookiesPre = getKeyJson(CookieFname, this.username)
        } else {
            var cookiesPre = cookiesJson
        }
        var cs = ""
        var updated = false

        if (!cookiesPre) {
            return ""
        }

        for (let k in cookiesPre) {
            var value = cookiesPre[k][k]
            if (cookiesPre[k].expires && cookiesPre[k].expires <= Date.now()) {
                delete cookiesPre[k]
                updated = true
                continue
            }
            if (cs) {
                cs += "; "
            }
            cs += `${k}=${value}`
            if (k == 'csrftoken') {
                this.csrftoken = value
            }
        }

        if (updated) {
            storeKeyJson(CookieFname, cookiesPre, this.username)
        }

        this.cs = cs
        return cs
    }


    ajaxPost(path, data, files, success, error, storeCookie) {
        var url = `${baseUrl}/${path}`

        logger.info(`Post url: ${url}`)

        var onlyPost = () => {
            const form = new FormData()

            if (this.csrftoken)
                form.append('csrfmiddlewaretoken', this.csrftoken)

            for (let k in data) {
                form.append(k, data[k])
            }
            if (files) {
                for (let fieldname in files) {
                    form.append(fieldname, createReadStream(files[fieldname]))
                }
            }
            return fetch(url, {
                method: 'post',
                body: form,
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    'Cookie': this.cs
                }
            }).then(res => {
                logger.info(res)
                if (res.status < 400) {
                    return res.json().then(json => {
                        if (storeCookie) {
                            this.setCookie(res.headers.raw()['set-cookie'])
                        }
                        if (success) {
                            success(json["info"])
                        } else {
                            logger.info('ajax post success, url:', url)
                        }
                        return json["info"]
                    })
                } else {
                    return res.text().then(txt => {
                        var info = txt
                        try {
                            var json = JSON.parse(txt)
                            info = json["info"]
                        } catch (err) { }

                        if (isDev) {
                            console.log(info)
                        }

                        if (error) {
                            error(info)
                        } else {
                            console.error('ajax post failed, url:', url, ' error:', info)
                        }
                        return info
                    })
                }
            })
        }

        if (this.csrftoken) {
            return fetch(url).then(res => {
                this.setCookie(res.headers.raw()['set-cookie'])
                return onlyPost()
            })
        } else {
            return onlyPost()
        }
    }

    amILogin(success, error) {
        this.ajaxGet(Paths.checkLogin, res => {
            this.isLogin = res.login
            if (success) {
                success(this.isLogin)
            }
            return this.isLogin
        }, error)
    }

    login(username, password, success, error) {
        var auth = { username: username, password: password }
        this.username = username
        this.ajaxPost(Paths.login, auth, null, (res) => {
            settingStorage.setUsername(username)
            if (success) {
                this.isLogin = true
                success(res)
            }
        }, (err) => {
            if (error) {
                error(err)
            }
        }, true)
    }
}

module.exports = {
    PaperExplainedClient
}