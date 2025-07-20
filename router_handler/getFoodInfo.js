const db = require('../db/index')

// 根据id获取用户信息
exports.getFoodUser = (req, res) => {
    const sql = `SELECT * FROM users WHERE userid=?`
    db.query(sql, req.query.userid, (err, results) => {
        if (err) return res.send({ status: 1, message: err.message })
        if (results.length !== 1) return res.send({ status: 1, message: '用户不存在！' })
        res.send({
            status: 0,
            message: '获取用户信息成功！',
            data: results[0]
        })
    })
}

// 根据食物id获取该食物的评论信息
exports.getFoodComment = (req, res) => {
    const sql = `SELECT * FROM comments WHERE foodid=?`
    db.query(sql, req.query.foodid, (err, results) => {
        if (err) return res.send({ status: 1, message: err.message })
        res.send({
            status: 0,
            message: '获取食物评论信息成功！',
            data: results
        })
    })
}

// 根据食物id获取该食物的点赞量和收藏量
exports.getFoodLike = (req, res) => {
    const sql = `SELECT 
        (SELECT COUNT(*) FROM favorites WHERE foodid = ${req.query.foodid}) AS user_favorites_count,
        (SELECT COUNT(*) FROM likes WHERE foodid = ${req.query.foodid}) AS user_likes_count`

    db.query(sql, (err, results) => {
        if (err) return res.send({ status: 1, message: err.message })
        res.send({
            status: 0,
            message: '获取食物点赞量和收藏量成功！',
            data: results[0]
        })
    })
}