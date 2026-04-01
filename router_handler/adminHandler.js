const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');

function isBcryptHash(value) {
    return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
}

exports.requireAdmin = (req, res, next) => {
    if (!req.auth) {
        return res.status(401).send({ status: 1, message: '未登录或 token 无效' });
    }

    if (req.auth.role !== 'admin' || !req.auth.admin_id) {
        return res.status(403).send({ status: 1, message: '需要管理员权限' });
    }

    next();
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const rows = await db.promiseQuery('SELECT * FROM admins WHERE username = ? LIMIT 1', [username]);

        if (!rows.length) {
            return res.send({ status: 1, message: '管理员账号或密码错误' });
        }

        const admin = rows[0];
        const passwordMatched = isBcryptHash(admin.password)
            ? bcrypt.compareSync(password, admin.password)
            : admin.password === password;

        if (!passwordMatched) {
            return res.send({ status: 1, message: '管理员账号或密码错误' });
        }

        const payload = {
            admin_id: admin.admin_id,
            username: admin.username,
            role: 'admin',
        };

        const token = jwt.sign(payload, config.jwtSecretKey, { expiresIn: '12h' });

        res.send({
            status: 0,
            message: '管理员登录成功',
            data: {
                admin_id: admin.admin_id,
                username: admin.username,
                role: 'admin',
            },
            token: `Bearer ${token}`,
        });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.getPendingFood = async (req, res) => {
    try {
        const rows = await db.promiseQuery('SELECT * FROM foods WHERE approved = 0 ORDER BY createdtime DESC');
        res.send({ status: 0, message: '获取待审核的美食帖子成功', data: rows });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.approveFood = async (req, res) => {
    try {
        const { foodid } = req.body;
        if (!foodid) {
            return res.send({ status: 1, message: 'foodid 不能为空' });
        }
        await db.promiseQuery('UPDATE foods SET approved = 1 WHERE foodid = ?', [foodid]);
        res.send({ status: 0, message: '审核通过成功' });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.rejectFood = async (req, res) => {
    try {
        const { foodid } = req.body;
        if (!foodid) {
            return res.send({ status: 1, message: 'foodid 不能为空' });
        }
        await db.promiseQuery('UPDATE foods SET approved = -1 WHERE foodid = ?', [foodid]);
        res.send({ status: 0, message: '审核拒绝成功' });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.getUserInfo = async (req, res) => {
    try {
        const start = Number.parseInt(req.body.start, 10) || 0;
        const size = Number.parseInt(req.body.size, 10) || 10;
        const rows = await db.promiseQuery(
            'SELECT userid, account, email, nickname, avatar, user_type, account_status, function_restriction FROM users ORDER BY userid DESC LIMIT ?, ?',
            [start, size]
        );
        res.send({ status: 0, message: '获取用户信息成功', data: rows });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.banUser = async (req, res) => {
    try {
        const userId = req.body.userid;
        if (!userId) {
            return res.send({ status: 1, message: '用户 ID 不能为空' });
        }
        await db.promiseQuery('UPDATE users SET account_status = ? WHERE userid = ?', ['封禁', userId]);
        res.send({ status: 0, message: '用户账号封禁成功' });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.unbanUser = async (req, res) => {
    try {
        const userId = req.body.userid;
        if (!userId) {
            return res.send({ status: 1, message: '用户 ID 不能为空' });
        }
        await db.promiseQuery('UPDATE users SET account_status = ? WHERE userid = ?', ['正常', userId]);
        res.send({ status: 0, message: '用户账号解封成功' });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.limitUser = async (req, res) => {
    try {
        const { function_restriction, userId } = req.body;
        if (!userId) {
            return res.send({ status: 1, message: '用户 ID 不能为空' });
        }
        await db.promiseQuery('UPDATE users SET function_restriction = ? WHERE userid = ?', [function_restriction || '', userId]);
        res.send({ status: 0, message: '用户功能限制设置成功' });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.getAbnormalComment = async (req, res) => {
    try {
        const rows = await db.promiseQuery("SELECT * FROM comments WHERE comment_status LIKE '异常%' ORDER BY createdtime DESC");
        res.send({ status: 0, message: '获取异常评论成功', data: rows });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.setCommentType = async (req, res) => {
    try {
        const { commentId, action, type } = req.body;
        if (!commentId) {
            return res.send({ status: 1, message: '评论 ID 不能为空' });
        }

        if (action === 'normal') {
            await db.promiseQuery('UPDATE comments SET comment_status = ?, abnormal_type = ? WHERE commentid = ?', ['正常', '已检查', commentId]);
            return res.send({ status: 0, message: '评论已设置为正常' });
        }

        if (action === 'abnormal') {
            await db.promiseQuery('UPDATE comments SET abnormal_type = ? WHERE commentid = ?', [type || '待确认', commentId]);
            return res.send({ status: 0, message: `评论异常类型已设置为 ${type || '待确认'}` });
        }

        return res.send({ status: 1, message: '未知操作类型' });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.setCommentStatus = async (req, res) => {
    try {
        const { commentId, status } = req.body;
        if (!commentId) {
            return res.send({ status: 1, message: '评论 ID 不能为空' });
        }
        await db.promiseQuery('UPDATE comments SET comment_status = ? WHERE commentid = ?', [status, commentId]);
        res.send({ status: 0, message: '评论状态更新成功' });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const { commentId } = req.body;
        if (!commentId) {
            return res.send({ status: 1, message: '评论 ID 不能为空' });
        }
        await db.promiseQuery('DELETE FROM comments WHERE commentid = ?', [commentId]);
        res.send({ status: 0, message: '评论删除成功' });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};
