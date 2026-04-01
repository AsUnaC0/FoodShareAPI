const db = require('../db');
const { getTagsByFoodId } = require('../utils/tagOperations');

exports.getFoodUser = async (req, res) => {
    try {
        const rows = await db.promiseQuery(
            'SELECT userid, account, nickname, email, avatar, user_type, account_status FROM users WHERE userid = ? LIMIT 1',
            [req.query.userid]
        );

        if (!rows.length) {
            return res.send({ status: 1, message: '用户不存在' });
        }

        res.send({ status: 0, message: '获取用户信息成功', data: rows[0] });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.getFoodComment = async (req, res) => {
    try {
        const rows = await db.promiseQuery(
            `SELECT c.*, u.nickname, u.avatar
             FROM comments c
             LEFT JOIN users u ON u.userid = c.userid
             WHERE c.foodid = ?
             ORDER BY c.createdtime DESC`,
            [req.query.foodid]
        );

        res.send({ status: 0, message: '获取美食评论信息成功', data: rows });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.getFoodLike = async (req, res) => {
    try {
        const rows = await db.promiseQuery(
            `SELECT
                (SELECT COUNT(*) FROM favorites WHERE foodid = ?) AS favoriteCount,
                (SELECT COUNT(*) FROM likes WHERE foodid = ?) AS likeCount,
                (SELECT COUNT(*) FROM comments WHERE foodid = ?) AS commentCount`,
            [req.query.foodid, req.query.foodid, req.query.foodid]
        );

        const tags = await getTagsByFoodId(req.query.foodid).catch(() => []);
        res.send({
            status: 0,
            message: '获取美食互动信息成功',
            data: {
                ...(rows[0] || { favoriteCount: 0, likeCount: 0, commentCount: 0 }),
                tags,
            },
        });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};
