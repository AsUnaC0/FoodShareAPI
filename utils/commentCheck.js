const db = require('../db');

async function checkComment(userid) {
    const rows = await db.promiseQuery(
        `SELECT commentid
         FROM comments
         WHERE userid = ? AND createdtime >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
         ORDER BY createdtime DESC`,
        [userid]
    );

    return rows.length < 3 ? '正常' : '异常-待处理';
}

module.exports = {
    checkComment,
};
