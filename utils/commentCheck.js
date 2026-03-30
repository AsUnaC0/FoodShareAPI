const db = require('../db/index');

// 评论检测
const checkComment = (userid) => {
    return new Promise((resolve, reject) => {
        // 如果用户1分钟内发表过评论 且评论数>3 存在刷好评行为 将第三条评论设置为异常评论
        const sql = `SELECT * FROM comments WHERE userid=? AND createdtime >= DATE_SUB(NOW(), INTERVAL 1 MINUTE) ORDER BY createdtime DESC`;
        db.query(sql, userid, (err, results) => {
            if (err) {
                reject(err);
                return;
            }

            if (results.length < 3) {
                resolve('正常');
            } else {
                resolve('异常-待处理')
            }
        });
    });
};

module.exports = {
    checkComment
};