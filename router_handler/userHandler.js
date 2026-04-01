const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');
const { toImageUrl } = require('../utils/fileStorage');

exports.regUser = async (req, res) => {
    try {
        const { account, password, email } = req.body;
        console.log('Received registration data:', { account, email });
        const rows = await db.promiseQuery('SELECT userid FROM users WHERE account = ? LIMIT 1', [account]);

        if (rows.length) {
            return res.send({ status: 1, message: '用户名已被占用，请更换其他用户名' });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        const defaultAvatar = toImageUrl('images/userAvatar/defaultboy.png');

        const result = await db.promiseQuery(
            'INSERT INTO users (account, password, email, nickname, avatar, account_status) VALUES (?, ?, ?, ?, ?, ?)',
            [account, hashedPassword, email, '普通用户', defaultAvatar, '正常']
        );

        if (!result.affectedRows) {
            return res.send({ status: 1, message: '注册失败' });
        }

        res.send({ status: 0, message: '注册成功', data: { userid: result.insertId } });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { account, password } = req.body;
        const rows = await db.promiseQuery('SELECT * FROM users WHERE account = ? LIMIT 1', [account]);

        if (!rows.length) {
            return res.send({ status: 1, message: '登录失败，账号或密码错误' });
        }

        const user = rows[0];
        if (!bcrypt.compareSync(password, user.password)) {
            return res.send({ status: 1, message: '登录失败，账号或密码错误' });
        }

        if (user.account_status && user.account_status !== '正常') {
            return res.send({ status: 1, message: `当前账号状态为 ${user.account_status}，暂时无法登录` });
        }

        const payload = {
            userid: user.userid,
            account: user.account,
            nickname: user.nickname,
            user_type: user.user_type,
            account_status: user.account_status,
        };

        const tokenStr = jwt.sign(payload, config.jwtSecretKey, { expiresIn: '10h' });

        delete user.password;
        res.send({
            status: 0,
            message: '登录成功',
            data: user,
            token: `Bearer ${tokenStr}`,
        });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};
