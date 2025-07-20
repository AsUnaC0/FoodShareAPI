// 导入 mysql 模块
const mysql = require('mysql2')

// 创建数据库连接对象
const db = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '20021005',
    database: 'foodshare',
})

// 向外共享 db 数据库连接对象
module.exports = db