const db = require('../db/index')
const bcrypt = require('bcryptjs')
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const tagOperations = require('../utils/tagOperations');
const config = require('../config');

// 获取登录用户基本信息的处理函数
// 注意：req 对象上的 auth 属性，是 Token 解析成功，express-jwt 中间件帮我们挂载上去的
exports.getUserInfo = (req, res) => {
    // 根据用户的 userid，查询用户的基本信息 为了防止用户的密码泄露，需要排除 password 字段
    const sql = `select userid, account, nickname, email, avatar from users where userid=?`

    db.query(sql, req.auth.userid, (err, results) => {
        // 1. 执行 SQL 语句失败
        if (err) return res.send({ status: 1, message: err.message })
        // 2. 执行 SQL 语句成功，但是查询到的数据条数不等于 1
        if (results.length !== 1) return res.send({ status: 1, message: '获取用户基本信息失败！' })
        // 3. 将用户信息响应给客户端
        res.send({
            status: 0,
            message: '获取用户基本信息成功！',
            data: results[0],
        })
    })
}

// 更新用户基本信息
exports.updateUserInfo = (req, res) => {
    const sql = `update users set ? where userid=?`
    db.query(sql, [req.body, req.auth.userid], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message })
        if (results.affectedRows !== 1) return res.send({ status: 1, message: '更新用户基本信息失败！' })
        res.send({
            status: 0,
            message: '更新用户基本信息成功！',
        })
    })
}

// 更新用户喜好标签
exports.updateMyTags = (req, res) => {
    try {
        const tags = JSON.parse(req.body.tags)

        if (!tags || tags.length === 0) {
            return res.send({ status: 1, message: '标签数据不能为空' });
        }

        // 处理每个标签，收集成功和失败的信息
        const processTagsAsync = async () => {
            const successTags = [];
            const failedTags = [];
            const validTagIds = [];

            for (const tag of tags) {
                try {
                    const tagId = await tagOperations.getTagIdByName(tag);
                    successTags.push(tagId.message);
                    validTagIds.push(tagId.tag_id);
                } catch (error) {
                    failedTags.push(`${tag}: ${error.message}`);
                }
            }

            return { successTags, failedTags, validTagIds };
        };

        processTagsAsync().then(({ successTags, failedTags, validTagIds }) => {
            const sql = `delete from user_tags where userid=?`
            db.query(sql, req.auth.userid, (err, results) => {
                if (err) return res.send({ status: 1, message: err.message })
                // 删除操作不需要检查 affectedRows，因为用户可能原本就没有标签
                if (validTagIds.length === 0) {
                    return res.send({
                        status: failedTags.length > 0 ? 1 : 0,
                        message: '更新用户喜好标签完成',
                        data: {
                            successTags,
                            failedTags,
                        }
                    });
                }

                // 使用 Promise.all 来处理多个插入操作
                const insertPromises = validTagIds.map(tagId => {
                    return new Promise((resolve, reject) => {
                        const sql = `INSERT INTO user_tags (userid, tagid) VALUES (?, ?)`;
                        db.query(sql, [req.auth.userid, tagId], (err, results) => {
                            if (err) reject(err);
                            else resolve(results);
                        });
                    });
                });

                Promise.all(insertPromises)
                    .then(results => {
                        res.send({
                            status: failedTags.length > 0 ? 1 : 0,
                            message: '更新用户喜好标签完成',
                            data: {
                                successTags,
                                failedTags,
                            }
                        });
                    })
                    .catch(err => {
                        res.send({
                            status: 1,
                            message: '插入标签时出错: ' + err.message,
                            data: {
                                successTags,
                                failedTags,
                                summary: `成功验证 ${successTags.length} 个标签，失败 ${failedTags.length} 个标签，但插入时出错`
                            }
                        });
                    });
            })
        })
            .catch(err => {
                res.send({ status: 1, message: err.message });
            });
    } catch (error) {
        res.send({ status: 1, message: '数据格式错误: ' + error.message });
    }
}

// 配置multer存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../images/userAvatar'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// 文件过滤：只允许图片类型
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('只允许上传JPEG、PNG格式的图片'), false);
    }
};

// 初始化multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 限制5MB
    }
});

// 更新用户头像
exports.updateAvatar = (req, res) => {
    const sql = `update users set avatar=? where userid=?`
    upload.single('avatar')(req, res, function (err) {
        if (err) {
            return res.send({ status: 1, message: err.message })
        }
        if (!req.file) {
            return res.send({ status: 1, message: '请上传文件！' })
        }
        // 删除旧头像
        if (req.body.oldAvatar && req.body.oldAvatar !== 'null') {
            try {
                // 从URL中提取文件名
                const url = new URL(req.body.oldAvatar);
                const filename = path.basename(url.pathname);

                // 只删除非默认头像
                if (filename !== 'defaultboy.png' && filename !== 'defaultgirl.png') {
                    const oldAvatarPath = path.join(__dirname, '../images/userAvatar', filename);
                    if (fs.existsSync(oldAvatarPath)) {
                        fs.unlinkSync(oldAvatarPath);
                        console.log('已删除旧头像:', filename);
                    }
                }
            } catch (error) {
                console.error('删除旧头像失败:', error.message);
            }
        }

        const avatarUrl = `${config.server.baseUrl}/images/userAvatar/${req.file.filename}`;

        db.query(sql, [avatarUrl, req.auth.userid], (err, results) => {
            if (err) return res.send({ status: 1, message: err.message })
            if (results.affectedRows !== 1) return res.send({ status: 1, message: '更新用户头像失败！' })
            res.send({
                status: 0,
                message: '更新用户头像成功！',
                data: avatarUrl
            })
        })
    })
}

// 重置密码
exports.updatePassword = (req, res) => {
    const sql = `select * from users where userid=?`
    // 检查用户是否存在
    db.query(sql, req.auth.userid, (err, results) => {
        if (err) return res.send({ status: 1, message: err.message })
        if (results.length !== 1) return res.send({ status: 1, message: '用户不存在！' })
        const compareResult = bcrypt.compareSync(req.body.oldPwd, results[0].password)
        if (!compareResult) return res.send({ status: 1, message: '旧密码错误！' })
        const sql = `update users set password=? where userid=?`
        const newPassword = bcrypt.hashSync(req.body.newPwd, 10)
        db.query(sql, [newPassword, req.auth.userid], (err, results) => {
            if (err) return res.send({ status: 1, message: err.message })
            if (results.affectedRows !== 1) return res.send({ status: 1, message: '更新密码失败！' })
            res.send({
                status: 0,
                message: '更新密码成功！',
            })
        })

    })
}

// 获取用户点赞的食物信息
exports.getLikeFood = (req, res) => {
    const sql = `select * from likes where userid=?`
    db.query(sql, req.auth.userid, (err, results) => {
        if (err) return res.send({ status: 1, message: err.message })
        const foodIds = results.map(v => v.foodid)
        const sql = `select * from foods where foodid in (?)`
        db.query(sql, [foodIds], (err, results) => {
            if (err) return res.send({ status: 1, message: err.message })
            res.send({
                status: 0,
                message: '获取用户点赞的食物信息成功！',
                data: results
            })
        })
    })
}

// 获取用户收藏的食物信息
exports.getFavoriteFood = (req, res) => {
    const sql = `select * from favorites where userid=?`
    db.query(sql, req.auth.userid, (err, results) => {
        if (err) return res.send({ status: 1, message: err.message })
        const foodIds = results.map(v => v.foodid)
        const sql = `select * from foods where foodid in (?)`
        db.query(sql, [foodIds], (err, results) => {
            if (err) return res.send({ status: 1, message: err.message })
            res.send({
                status: 0,
                message: '获取用户收藏的食物信息成功！',
                data: results
            })
        })
    })
}


// 获取用户发布的食物信息
exports.getFoodList = (req, res) => {
    const sql = `select * from foods where userid=?`
    db.query(sql, req.auth.userid, (err, results) => {
        if (err) return res.send({ status: 1, message: err.message })
        res.send({
            status: 0,
            message: '获取用户发布的食物信息成功！',
            data: results
        })
    })
}