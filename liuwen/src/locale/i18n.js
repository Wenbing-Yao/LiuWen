const { readFileSync, writeFileSync } = require('fs')
const path = require('path')

let SUPPORTED_LANGUAGES = new Set([
    'zh-CN', 'en'
])
let TOBE_ADDED = new Set()
let isAdding = false
let localeLang = null

function setLocaleLang(lang) {
    localeLang = lang
    SUPPORTED_LANGUAGES.add(lang)
}

function addSupportedLanguage(langs) {
    for (let lang of langs) {
        SUPPORTED_LANGUAGES.add(lang)
    }
}

function getLanguage() {
    if (!localeLang) {
        console.error('Language not set! Return `en`.')
        return 'en'
    }
    return localeLang
}

function getSupportedLanguages() {
    return SUPPORTED_LANGUAGES
}

let translations = new Map()
let translationSeted = false


function setTranslations() {
    let lang = getLanguage()
    let fpath = path.join(__dirname, `langs/${lang}.json`)

    try {
        var data = readFileSync(fpath).toString()
        if (!data) return

        var json = JSON.parse(data)

        for (let k in json) {
            translations.set(k, json[k])
        }

        translationSeted = true
        return json
    } catch (err) {
        console.log('Get translation error: ', err)
    }
}

function setTodoKey(key) {
    TOBE_ADDED.add(key)
    if (isAdding) {
        return
    }
    isAdding = true

    try {
        for (let lang of SUPPORTED_LANGUAGES) {
            let fpath = path.join(__dirname, `langs/${lang}.json`)
            var json = null
            try {
                var data = readFileSync(fpath).toString()
                if (data) {
                    json = JSON.parse(data)
                } else {
                    json = {}
                }
            } catch (err) {
                json = {}
            }

            for (let k of TOBE_ADDED) {
                json[k] = ""
            }
            writeFileSync(fpath, JSON.stringify(json, null, 4))
        }
    } catch (err) {
        console.log('Set todo key error: ', err)
    } finally {
        isAdding = false
    }
}


function gettext(key) {
    if (!translationSeted) {
        setTranslations()
    }
    var value = translations.get(key)
    if (!value) {
        setTodoKey(key)
        return key
    }
    return value
}

function trans(key) {
    return gettext(key)
}

module.exports = {
    addSupportedLanguage,
    getLanguage,
    getSupportedLanguages,
    gettext,
    setLocaleLang,
    trans
}