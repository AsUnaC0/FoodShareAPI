const bcrypt = require('bcryptjs');
const db = require('../db');
const { createUploader, toImageUrl, toRelativeImagePath, extractLocalImagePath, removeLocalFile } = require('../utils/fileStorage');
const tagOperations = require('../utils/tagOperations');

const avatarUpload = createUploader('userAvatar', 'avatar');
const merchantUpload = createUploader('licenseImage', 'license');

async function enrichFoods(rows) {
    if (!rows.length) {
        return [];
    }

    const foodIds = rows.map((item) => item.foodid);
    const images = await db.promiseQuery('SELECT foodid, imageurl FROM images WHERE foodid IN (?) ORDER BY imageid ASC', [foodIds]).catch(() => []);
    const imageMap = new Map();

    images.forEach((item) => {
        const current = imageMap.get(item.foodid) || [];
        current.push(item.imageurl);
        imageMap.set(item.foodid, current);
    });

    return rows.map((item) => ({
        ...item,
        images: imageMap.get(item.foodid) || [],
        publishType: item.videourl ? 'video' : 'image',
    }));
}

async function getFoodsByIds(foodIds) {
    if (!foodIds.length) {
        return [];
    }
    const rows = await db.promiseQuery('SELECT * FROM foods WHERE foodid IN (?) ORDER BY createdtime DESC', [foodIds]);
    return enrichFoods(rows);
}

exports.getUserInfo = async (req, res) => {
    try {
        const rows = await db.promiseQuery(
            'SELECT userid, account, nickname, email, avatar, user_type, account_status, function_restriction FROM users WHERE userid = ? LIMIT 1',
            [req.auth.userid]
        );

        if (!rows.length) {
            return res.send({ status: 1, message: '获取用户基本信息失败' });
        }

        res.send({ status: 0, message: '获取用户基本信息成功', data: rows[0] });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.updateUserInfo = async (req, res) => {
    try {
        const result = await db.promiseQuery('UPDATE users SET nickname = ?, email = ? WHERE userid = ?', [
            req.body.nickname,
            req.body.email,
            req.auth.userid,
        ]);

        if (!result.affectedRows) {
            return res.send({ status: 1, message: '更新用户基本信息失败' });
        }

        res.send({ status: 0, message: '更新用户基本信息成功' });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.updateMyTags = async (req, res) => {
    try {
        const tags = Array.isArray(req.body.tags) ? req.body.tags : JSON.parse(req.body.tags || '[]');
        if (!tags.length) {
            return res.send({ status: 1, message: '标签数据不能为空' });
        }

        const successTags = [];
        const failedTags = [];
        const validTagIds = [];

        for (const tag of tags) {
            try {
                const tagInfo = await tagOperations.getTagIdByName(tag);
                successTags.push(tag);
                validTagIds.push(tagInfo.tag_id);
            } catch (error) {
                failedTags.push(`${tag}: ${error.message}`);
            }
        }

        await db.promiseQuery('DELETE FROM user_tags WHERE userid = ?', [req.auth.userid]);

        for (const tagId of [...new Set(validTagIds)]) {
            await db.promiseQuery('INSERT INTO user_tags (userid, tagid) VALUES (?, ?)', [req.auth.userid, tagId]);
        }

        res.send({
            status: failedTags.length ? 1 : 0,
            message: '更新用户喜好标签完成',
            data: { successTags, failedTags },
        });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.updateAvatar = (req, res) => {
    avatarUpload.single('avatar')(req, res, async (err) => {
        try {
            if (err) {
                return res.send({ status: 1, message: err.message });
            }
            if (!req.file) {
                return res.send({ status: 1, message: '请上传头像文件' });
            }

            const oldRows = await db.promiseQuery('SELECT avatar FROM users WHERE userid = ? LIMIT 1', [req.auth.userid]);
            const relativePath = toRelativeImagePath('userAvatar', req.file.filename);
            const avatarUrl = toImageUrl(relativePath);

            const result = await db.promiseQuery('UPDATE users SET avatar = ? WHERE userid = ?', [avatarUrl, req.auth.userid]);
            if (!result.affectedRows) {
                return res.send({ status: 1, message: '更新用户头像失败' });
            }

            if (oldRows.length) {
                const oldAvatarPath = extractLocalImagePath(oldRows[0].avatar);
                if (oldAvatarPath && !oldAvatarPath.endsWith('defaultboy.png') && !oldAvatarPath.endsWith('defaultgirl.png')) {
                    removeLocalFile(oldAvatarPath);
                }
            }

            res.send({ status: 0, message: '更新用户头像成功', data: avatarUrl });
        } catch (error) {
            res.send({ status: 1, message: error.message });
        }
    });
};

exports.updatePassword = async (req, res) => {
    try {
        const rows = await db.promiseQuery('SELECT password FROM users WHERE userid = ? LIMIT 1', [req.auth.userid]);
        if (!rows.length) {
            return res.send({ status: 1, message: '用户不存在' });
        }

        const compareResult = bcrypt.compareSync(req.body.oldPwd, rows[0].password);
        if (!compareResult) {
            return res.send({ status: 1, message: '旧密码错误' });
        }

        const newPassword = bcrypt.hashSync(req.body.newPwd, 10);
        const result = await db.promiseQuery('UPDATE users SET password = ? WHERE userid = ?', [newPassword, req.auth.userid]);

        if (!result.affectedRows) {
            return res.send({ status: 1, message: '更新密码失败' });
        }

        res.send({ status: 0, message: '更新密码成功' });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.getLikeFood = async (req, res) => {
    try {
        const rows = await db.promiseQuery('SELECT foodid FROM likes WHERE userid = ?', [req.auth.userid]);
        const foods = await getFoodsByIds(rows.map((item) => item.foodid));
        res.send({ status: 0, message: '获取用户点赞的美食信息成功', data: foods });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.getFavoriteFood = async (req, res) => {
    try {
        const rows = await db.promiseQuery('SELECT foodid FROM favorites WHERE userid = ?', [req.auth.userid]);
        const foods = await getFoodsByIds(rows.map((item) => item.foodid));
        res.send({ status: 0, message: '获取用户收藏的美食信息成功', data: foods });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.getFoodList = async (req, res) => {
    try {
        const rows = await db.promiseQuery('SELECT * FROM foods WHERE userid = ? ORDER BY createdtime DESC', [req.auth.userid]);
        const foods = await enrichFoods(rows);
        res.send({ status: 0, message: '获取用户发布的美食信息成功', data: foods });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.follow = async (req, res) => {
    try {
        const followedid = Number(req.body.followedid);
        if (!followedid) {
            return res.send({ status: 1, message: '缺少被关注用户 ID' });
        }
        if (followedid === Number(req.auth.userid)) {
            return res.send({ status: 1, message: '不能关注自己' });
        }

        const result = await db.promiseQuery('INSERT IGNORE INTO follows (userid, followedid) VALUES (?, ?)', [req.auth.userid, followedid]);
        if (!result.affectedRows) {
            return res.send({ status: 1, message: '用户已关注' });
        }

        res.send({ status: 0, message: '关注成功' });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.unfollow = async (req, res) => {
    try {
        const result = await db.promiseQuery('DELETE FROM follows WHERE userid = ? AND followedid = ?', [req.auth.userid, req.body.followedid]);
        if (!result.affectedRows) {
            return res.send({ status: 1, message: '取消关注失败' });
        }
        res.send({ status: 0, message: '取消关注成功' });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.merchant = (req, res) => {
    merchantUpload.single('licenseImage')(req, res, async (err) => {
        try {
            if (err) {
                return res.send({ status: 1, message: `文件上传失败: ${err.message}` });
            }
            if (!req.file) {
                return res.send({ status: 1, message: '请上传营业执照图片' });
            }

            const { licensenumber } = req.body;
            if (!licensenumber) {
                return res.send({ status: 1, message: '请提供营业执照号码' });
            }

            const relativePath = toRelativeImagePath('licenseImage', req.file.filename);
            const licenseImageUrl = toImageUrl(relativePath);
            const exists = await db.promiseQuery('SELECT verifyid, licenseImage FROM verifications WHERE userid = ? LIMIT 1', [req.auth.userid]);

            if (exists.length) {
                await db.promiseQuery(
                    'UPDATE verifications SET licensenumber = ?, licenseImage = ? WHERE userid = ?',
                    [licensenumber, licenseImageUrl, req.auth.userid]
                );
                removeLocalFile(extractLocalImagePath(exists[0].licenseImage));
                return res.send({ status: 0, message: '更新商家认证信息成功', data: { licensenumber, licenseImageUrl } });
            }

            await db.promiseQuery('INSERT INTO verifications (userid, licensenumber, licenseImage) VALUES (?, ?, ?)', [
                req.auth.userid,
                licensenumber,
                licenseImageUrl,
            ]);

            res.send({ status: 0, message: '上传商家认证信息成功', data: { licensenumber, licenseImageUrl } });
        } catch (error) {
            res.send({ status: 1, message: error.message });
        }
    });
};
