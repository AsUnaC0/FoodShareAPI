const db = require('../db/index');

// 获取待审核的美食贴子
exports.getPendingFood = (req, res) => {
    const sql = 'SELECT * FROM foods WHERE approved = ?';
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
    const userId = req.body.userid;
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

// 解封用户账号
exports.unbanUser = (req, res) => {
    const userId = req.body.userid;
    if (!userId) {
        return res.send({ status: 1, message: '用户ID不能为空！' });
    }
    const sql = 'UPDATE users SET account_status = ? WHERE userid = ?';
    db.query(sql, ['正常', userId], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        res.send({
            status: 0,
            message: '用户账号解封成功！',
        });
    })
};

// 对用户进行功能禁用
exports.limitUser = (req, res) => {
    const { function_restriction, userId } = req.body;
    if (!userId) {
        return res.send({ status: 1, message: '用户ID不能为空！' });
    }
    const sql = 'UPDATE users SET function_restriction = ? WHERE userid = ?';
    db.query(sql, [function_restriction, userId], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        res.send({
            status: 0,
            message: '用户功能设置成功！',
        });
    })

}

//获取异常评论
exports.getAbnormalComment = (req, res) => {
    const sql = 'SELECT * FROM comments WHERE comment_status = ?';
    db.query(sql, '异常', (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        res.send({
            status: 0,
            message: '获取异常评论成功！',
            data: results
        });
    });
};

// 设置异常评论类型 abnormal_type
exports.setCommentType = (req, res) => {
    const { commentId, action, type } = req.body;
    if (!commentId) {
        return res.send({ status: 1, message: '评论ID不能为空！' });
    }
    switch (action) {
        case 'normal':
            const sql1 = 'UPDATE comments SET comment_status = ? AND abnormal_type = ? WHERE commentid = ?';
            db.query(sql1, ['正常', '已检查', commentId], (err, results) => {
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

// 更新评论的comment_status
exports.setCommentStatus = (req, res) => {
    const { commentId, status } = req.body;
    if (!commentId) {
        return res.send({ status: 1, message: '评论ID不能为空！' });
    }
    const sql = 'UPDATE comments SET comment_status = ? WHERE commentid = ?';
    db.query(sql, [status, commentId], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        res.send({
            status: 0,
            message: '评论状态更新成功！',
        });
    })
};