const db = require('../db/index')

// 获取食物列表 按start和size获取食物数据
exports.getFoodList = (req, res) => {
    const start = parseInt(req.body.start) || 0;
    const size = parseInt(req.body.size) || 10;

    const sql = `SELECT * FROM foods LIMIT ?, ?`;
    db.query(sql, [start, size], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });

        if (results.length === 0) return res.send({ status: 1, message: '暂无数据' });
        res.send({
            status: 0,
            message: '获取成功',
            data: results
        });
    });
};

// 用户发布食物
exports.addFood = (req, res) => {
    const sql = `INSERT INTO foods (userid,title,description,location,foodimg,category) VALUES (?, ?, ?,?,?,?)`;
    const { title, description, location, foodimg, category } = req.body;
    db.query(sql, [req.auth.userid, title, description, location, foodimg, category], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        if (results.affectedRows !== 1) return res.send({ status: 1, message: '发布失败' });
        res.send({
            status: 0,
            message: '发布成功'
        })
    });
}

// 用户删除贴子
exports.deleteFood = (req, res) => {
    const sql = `DELETE FROM foods WHERE foodid=?`;
    const { foodid } = req.body;
    db.query(sql, foodid, (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        if (results.affectedRows !== 1) return res.send({ status: 1, message: '删除失败' });
        res.send({
            status: 0,
            message: '删除成功'
        })
    })
}

// 用户点赞食物贴子
exports.likeFood = (req, res) => {
    const sql = `INSERT INTO likes (userid,foodid) VALUES (?,?)`;
    const { userid, foodid } = req.body;
    db.query(sql, [userid, foodid], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        if (results.affectedRows !== 1) return res.send({ status: 1, message: '点赞失败' });
        res.send({
            status: 0,
            message: '点赞成功'
        })
    })
}

// 用户取消点赞
exports.unlikeFood = (req, res) => {
    const sql = `DELETE FROM likes WHERE userid=? AND foodid=?`;
    const { userid, foodid } = req.body;
    db.query(sql, [userid, foodid], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        if (results.affectedRows !== 1) return res.send({ status: 1, message: '取消点赞失败' });
        res.send({
            status: 0,
            message: '取消点赞成功'
        })
    })
}

// 用户收藏该美食贴子
exports.favoritefood = (req, res) => {
    let sql = `SELECT * FROM favorites WHERE userid=? AND foodid=?`;
    const { userid, foodid } = req.body;
    db.query(sql, [userid, foodid], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        if (results.length !== 0) return res.send({ status: 1, message: '已收藏' });

        sql = `INSERT INTO favorites (userid,foodid) VALUES (?,?)`;
        db.query(sql, [userid, foodid], (err, results) => {
            if (err) return res.send({ status: 1, message: err.message });
            if (results.affectedRows !== 1) return res.send({ status: 1, message: '收藏失败' });
            res.send({
                status: 0,
                message: '收藏成功'
            })
        })
    })


}

// 用户取消收藏该美食贴子
exports.unfavoritefood = (req, res) => {

    let sql = `SELECT * FROM favorites WHERE userid=? AND foodid=?`;
    const { userid, foodid } = req.body;
    db.query(sql, [userid, foodid], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        if (results.length === 0) return res.send({ status: 1, message: '未找到该收藏信息' });
        sql = `DELETE FROM favorites WHERE userid=? AND foodid=?`;
        db.query(sql, [userid, foodid], (err, results) => {
            if (err) return res.send({ status: 1, message: err.message });
            if (results.affectedRows !== 1) return res.send({ status: 1, message: '取消收藏失败' });
            res.send({
                status: 0,
                message: '取消收藏成功'
            })
        })
    })


}

// 用户对该食物贴子的文本评论
exports.commentfood = (req, res) => {
    const sql = `INSERT INTO comments (userid,foodid,content) VALUES (?,?,?)`;
    const { userid, foodid, content } = req.body;
    db.query(sql, [userid, foodid, content], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        if (results.affectedRows !== 1) return res.send({ status: 1, message: '评论失败' });
        res.send({
            status: 0,
            message: '评论成功'
        })
    })
}

// 用户对该食物贴子的星级评论
exports.ratefood = (req, res) => {
    let sql = `SELECT * FROM rating WHERE userid=? AND foodid=?`;
    const { userid, foodid, rating } = req.body;
    db.query(sql, [userid, foodid], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        if (results.length !== 0) return res.send({ status: 1, message: '已评分' });

        sql = `INSERT INTO rating (userid,foodid,rating) VALUES (?,?,?)`;
        db.query(sql, [userid, foodid, rating], (err, results) => {
            if (err) return res.send({ status: 1, message: err.message });
            if (results.affectedRows !== 1) return res.send({ status: 1, message: '评分失败' });
            res.send({
                status: 0,
                message: '评分成功',
                data: rating
            })
        })
    })



}