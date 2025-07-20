const db = require('../db/index')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const config = require('../config')

// 注册用户的处理函数
exports.regUser = (req, res) => {
    // 接收表单数据
    const userinfo = req.body
    // 判断数据是否合法
    if (!userinfo.account || !userinfo.password || !userinfo.email) {
        return res.send({ status: 1, message: '请完整填写所有必填项' })
    }
    const sql = `select * from users where account=?`
    db.query(sql, [userinfo.account], function (err, results) {
        // 执行 SQL 语句失败
        if (err) {
            return res.send({ status: 1, message: err.message })
        }
        // 用户名被占用
        if (results.length > 0) {
            return res.send({ status: 1, message: '用户名被占用，请更换其他用户名！' })
        }
        // 对用户的密码,进行 bcrype 加密，返回值是加密之后的密码字符串
        userinfo.password = bcrypt.hashSync(userinfo.password, 10)
        const sql = `insert into users (account,password,email,nickname,avatar) values (?,?,?,?,?)`
        db.query(sql, [userinfo.account, userinfo.password, userinfo.email, '普通用户', 'fakeavatar'], function (err, results) {
            // SQL 语句执行失败
            if (err) {
                return res.send({ status: 1, message: err.message })
            }
            // SQL 语句执行成功，但是影响行数不是 1
            if (results.affectedRows !== 1) {
                return res.send({ status: 1, message: '注册用户失败！' })
            }
            // 注册用户成功
            res.send({ status: 0, message: '注册成功！' })
        })
    })
}

// 登录的处理函数
exports.login = (req, res) => {
    // 接收表单数据
    const userinfo = req.body
    const sql = `select * from users where account=?`
    db.query(sql, userinfo.account, function (err, results) {
        // 执行 SQL 语句失败
        if (err) {
            return res.send({ status: 1, message: err.message })
        }
        // 执行 SQL 语句成功，但是查询到数据条数不等于 1
        if (results.length !== 1) {
            return res.send({ status: 1, message: '登录失败！' })
        }
        // 用户信息查询成功
        const compareResult = bcrypt.compareSync(userinfo.password, results[0].password)
        if (!compareResult) {
            return res.send({ status: 1, message: '登录失败！' })
        }
        // 生成 JWT 的 Token 字符串 一定要剔除密码和头像的值
        const user = { ...results[0], password: '', avatar: '', email: '', createdtime: '' }
        const tokenStr = jwt.sign(user, config.jwtSecretKey, { expiresIn: '10h' }) //token有效期十小时

        delete results[0].password,
            res.send({
                status: 0,
                message: '登录成功！',
                data: results[0],
                // 为了方便客户端使用 Token，在服务器端直接拼接上 Bearer 的前缀
                token: 'Bearer ' + tokenStr,
            })
    })
}
