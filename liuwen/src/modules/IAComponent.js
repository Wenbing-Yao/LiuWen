
class IArticle {
    constructor() {
        this.sections = []
    }
    add(component) {
        if (component.constructor.name == 'IASection') {
            if (component.level <= 2 || this.sections.length == 0) {
                component.level = 2
                this.sections.push(component)
            } else {
                this.sections[this.sections.length - 1].add(component)
            }
            return
        }

        if (this.sections.length == 0) {
            var section = new IASection()
            this.sections.push(section)
        }

        this.sections[this.sections.length - 1].add(component)
    }

    toDict() {
        var children = []
        for (let child of this.sections) {
            children.push(child.toDict())
        }
        return {
            'type': 'iarticle',
            'children': children
        }
    }
}

class IASection {
    constructor(title = "", level = 2) {
        this.title = title
        this.level = level
        this.subcomponents = []
        this.last_subsection = null
    }

    add(component) {
        if (component.constructor.name == 'IASection') {
            if (!this.last_subsection) {
                component.level = this.level + 1
            }

            if (component.level == this.level + 1) {
                this.subcomponents.push(component)
                this.last_subsection = component
            } else {
                this.last_subsection.add(component)
            }
            return
        }

        if (this.last_subsection) {
            this.last_subsection.add(component)
        } else {
            this.subcomponents.push(component)
        }
    }

    toDict() {
        var children = []
        for (let child of this.subcomponents) {
            children.push(child.toDict())
        }

        return {
            'type': 'iasection',
            'title': this.title,
            'level': this.level,
            'children': children
        }
    }
}

class IAParagraph {
    constructor(content) {
        this.content = content
    }

    toDict() {
        return {
            'type': 'iaparagraph',
            'content': this.content
        }
    }
}

class IASimpleQA {
    constructor(desc, answer) {
        this.desc = desc
        this.answer = answer
    }

    toDict() {
        return {
            'type': 'iasimpleqa',
            'desc': this.desc,
            'answer': this.answer
        }
    }
}

class IASelectionQA {
    constructor(desc, choices) {
        this.desc = desc
        this.choices = choices
    }

    toDict() {
        return {
            'type': 'iaselectionqa',
            'desc': this.desc,
            'choices': this.choices
        }
    }
}

class IACodeExecutionQA {
    constructor(desc, code) {
        this.desc = desc
        this.code = code
    }
    toDict() {
        return {
            'type': 'iacodeexecutionqa',
            'desc': this.desc,
            'code': this.code
        }
    }
}

class IAEncoder {
    constructor(soup) {
        this.soup = soup
    }

    encode() {
        if (!this.soup) {
            return null
        }

        let firstEl = this.soup.nextElement
        if (!firstEl) {
            return null
        }

        var ia = new IArticle()
        let children = [firstEl]

        var allSiblings = firstEl.nextSiblings
        if (allSiblings && allSiblings.length != 0) {
            for (let ele of allSiblings) {
                children.push(ele)
            }
        }

        let idx = 0
        while (idx < children.length) {
            let info = this.getComponent(idx, children)
            if (info.component) {
                ia.add(info.component)
            }
            idx = info.idx
        }

        return ia.toDict()
    }

    getComponent(idx, children) {
        if (!children[idx].name || idx >= children.length) {
            return {
                idx: idx + 1,
                component: null
            }
        }

        let start = idx
        let end = idx

        if (['h2', 'h3', 'h4', 'h5', 'h6'].includes(children[start].name)) {
            let h = children[start]
            return {
                idx: idx + 1,
                component: new IASection(h.string ? h.string.toString() : h.contents.toString(), parseInt(h.attrs.level))
            }
        }

        if (children[start].name == 'div' && children[start].attrs.class &&
            children[start].attrs.class.includes('qa')) {

            var qa = {}
            let classes = children[start].attrs.class

            if (classes.includes('simple')) {
                let fst = children[start].nextElement
                for (let el of fst.nextSiblings) {
                    if (el && el.attrs.class && el.attrs.class.includes('description')) {
                        qa.description = el.string ? el.string.toString() : el.contents.toString()
                    } else if (el && el.attrs.class && el.attrs.class.includes('answer')) {
                        qa.answer = el.string ? el.string.toString() : el.contents.toString()
                    }
                }
                return {
                    idx: start + 1,
                    component: new IASimpleQA(qa.description, qa.answer)
                }
            }
            else if (classes.includes('selection')) {

                let fst = children[start].nextElement
                for (let el of fst.nextSiblings) {
                    if (el && el.attrs.class && el.attrs.class.includes('description')) {
                        qa.description = el.string ? el.string.toString() : el.contents.toString()
                    } else if (el && el.attrs.class && el.attrs.class.includes('answer')) {
                        var choices = []
                        for (let cc of el.findAll('li')) {
                            choices.push({
                                'is_correct': cc.attrs['is-correct'] == 'true',
                                'desc': cc.string ? cc.string.toString() : cc.contents.toString()
                            })
                        }
                        qa.choices = choices
                    }
                }
                return {
                    idx: start + 1,
                    component: new IASelectionQA(qa.description, qa.choices)
                }
            }
            else if (classes.includes('code-execution')) {
                let fst = children[start].nextElement

                for (let el of fst.nextSiblings) {
                    if (el && el.attrs.class && el.attrs.class.includes('description')) {
                        qa.description = el.string ? el.string.toString() : el.contents.toString()
                    } else if (el && el.attrs.class && el.attrs.class.includes('answer')) {
                        let code = el.find('code')
                        qa.code = code.string.toString()
                    }
                }
                return {
                    idx: start + 1,
                    component: new IACodeExecutionQA(qa.description, qa.code)
                }
            }
        }

        while (end < children.length) {
            if (this.isSpecialComponent(children[end])) {
                break
            }
            end += 1
        }
        return {
            idx: end,
            component: new IAParagraph(children.slice(start, end).join('\n'))
        }
    }

    isSpecialComponent(child) {
        return ['h2', 'h3', 'h4', 'h5', 'h6'].includes(child.name) || (
            child.name == 'div' && child.attrs.class && child.attrs.class.includes('qa')
        )
    }
}

module.exports = {
    IAEncoder
}
