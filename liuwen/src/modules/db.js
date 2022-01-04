const isValid = require('is-valid-path');
const { Sequelize, DataTypes, Model } = require('sequelize')

const { dirConfig, accountConfig } = require('./config')


const dbPath = dirConfig.dbPath()
class User extends Model {}
class Article extends Model {
    async saveArticleToFile() {}
}

getSequelize = async function() {
    let pw = await accountConfig.dbPassword();
    return new Sequelize({
        dialect: 'sqlite',
        storage: dbPath,
        username: accountConfig.passwordAccount,
        password: pw
    })
};

var sequelize = null;

(async function() { // Model Definition
    sequelize = await getSequelize()

    try {
        await sequelize.authenticate()
        console.log('Connection has been established successfully.')
    } catch (error) {
        console.log('Unable to connect to the database: ', error)
    }

    User.init({
        id: {
            type: DataTypes.UUID,
            allowNull: false,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        username: {
            'type': DataTypes.STRING,
            allowNull: false
        },
        nickname: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: ''
        }
    }, {
        sequelize,
        modelName: 'User'
    })
    Article.init({
        id: {
            type: DataTypes.UUID,
            allowNull: false,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        title: {
            type: DataTypes.STRING(256),
            allowNull: false,
            defaultValue: ''
        },
        desc: {
            type: DataTypes.STRING(512),
            allowNull: false,
            defaultValue: ''
        },
        filePath: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: '',
            validate: {
                isFilePath(value) {
                    if (!isValid(value)) {
                        throw new Error(`无效文件路径: ${value}`)
                    }
                }
            }
        },
        tags: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: ''
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: ''
        },
        paperId: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: ''
        },
        articleId: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: ''
        },
        issued: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        posted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        lastSync: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        artType: {
            /*
                Article
                IArticle
                Grocery Article
                Grocery IArticle
            */
            type: DataTypes.STRING,
            defaultValue: '',
            allowNull: false
        },
        mdContent: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: ''
        },
        renderedHtml: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: ''
        }
    }, {
        sequelize,
        modelName: 'Article'
    })

    // await sequelize.sync({ alter: true })
})();


class LiuwenDB {

    constructor() {
        this.dbPath = dbPath
        this.sequelize = sequelize
    }

    async addArticleBasic(info) {
        return Article.create(info)
    }

    async getArticleById(id) {
        return Article.findByPk(id)
    }

    async deleteArticlebyId(id) {
        Article.destroy({
            where: {
                id: id
            }
        })
    }

    async updateArticleById(id, newInfo) {
        Article.update(newInfo, {
            where: {
                id: id
            }
        })
    }

    async updateArticleFieldById(id, fieldName, fieldValue) {
        let article = await this.getArticleById(id)
        article[fieldName] = fieldValue
        article.save({ fields: [fieldName] })
    }

}

module.exports = {
    'db': new LiuwenDB(),
    'User': User,
    'Article': Article
}