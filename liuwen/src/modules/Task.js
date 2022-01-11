class ArticleStateSync {

    constructor(localId, callback, checkStatus = null, cloudId = null) {
        this.localId = localId
        this.cloudId = cloudId
        this.callback = callback
        this.checkStatus = checkStatus
        this.nChecks = 0
        this.lastRun = null
        this.Interval = 600 * 1000 // ms
        this.Name = 'Article Status Sync'
    }

    checkFinished() {
        if (this.checkStatus) {
            return this.checkStatus(this.localId)
        }
        return false
    }

    run() {
        this.nChecks += 1
        var finished = this.checkFinished()
        if (finished) {
            this.lastRun = Date.now()
                // console.log(`finish task: ${this.localId}`)
            return finished
        }

        if (this.lastRun == null) {
            this.lastRun = Date.now()
            this.callback(this.localId)
                // console.log(`first run task: ${this.localId}`)
            return this.checkFinished()
        }

        if (Date.now() - this.lastRun > this.Interval) {
            this.lastRun = Date.now()
            this.callback(this.localId)
                // console.log(`consecutive run task: ${this.localId}`)
            return this.checkFinished()
        }

        return false
    }

    toString() {
        let date = null
        if (this.lastRun) {
            date = (new Date(this.lastRun)).toLocaleDateString();
        } else {
            date = null
        }
        return `Task [${this.Name}], LocalId: ${this.localId}, has run ${this.nChecks} times. Last run: ${date}`
    }
}

module.exports = {
    ArticleStateSync
}