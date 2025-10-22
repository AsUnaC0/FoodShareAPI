const db = require('../db/index');

// 获取待审核的美食贴子
exports.getPendingFood = (req, res) => {
    const sql = 'SELECT * FROM food WHERE approved = ?';
    db.query(sql, 0, (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        res.send({
            status: 0,
            message: '获取待审核的美食贴子成功！',
            data: results
        });
    });
};

// 获取用户信息
exports.getUserInfo = (req, res) => {
    const start = parseInt(req.body.start) || 0;
    const size = parseInt(req.body.size) || 10;
    const sql = `SELECT * FROM users LIMIT ?, ?`;
    db.query(sql, [start, size], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        res.send({
            status: 0,
            message: '获取用户信息成功！',
            data: results
        });
    });
};

// 封禁用户账号
exports.banUser = (req, res) => {
    const userId = req.body.userId; // 从请求体中获取用户ID
    if (!userId) {
        return res.send({ status: 1, message: '用户ID不能为空！' });
    }
    const sql = 'UPDATE users SET account_status = ? WHERE userid = ?';
    db.query(sql, ['封禁', userId], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        res.send({
            status: 0,
            message: '用户账号封禁成功！',
        });
    })
};

// 设置异常评论类型
exports.setAbnormalComment = (req, res) => {
    const { commentId, action, type } = req.body;
    if (!commentId) {
        return res.send({ status: 1, message: '评论ID不能为空！' });
    }
    switch (action) {
        case 'normal':
            const sql1 = 'UPDATE comments SET comment_status = ? WHERE commentid = ?';
            db.query(sql1, ['正常', commentId], (err, results) => {
                if (err) return res.send({ status: 1, message: err.message });
                res.send({
                    status: 0,
                    message: '评论设置为正常成功！',
                });
            })
            break;

        case 'abnormal':
            const sql2 = 'UPDATE comments SET abnormal_type = ? WHERE commentid = ?';
            db.query(sql2, [type, commentId], (err, results) => {
                if (err) return res.send({ status: 1, message: err.message });
                res.send({
                    status: 0,
                    message: `评论设置为${type}成功！`,
                });
            })
            break;
    }
};