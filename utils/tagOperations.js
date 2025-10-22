const db = require('../db/index');

// 根据标签名查询标签ID
const getTagIdByName = (tagName) => {
    const sql = `SELECT tag_id FROM tags WHERE tag_name=?`;
    return new Promise((resolve, reject) => {
        db.query(sql, tagName, (err, results) => {
            if (err) {
                reject(err);
                return;
            }

            if (!results || results.length === 0) {
                reject(new Error(`标签 '${tagName}' 不存在`));
                return;
            }

            resolve(
                {
                    tag_id: results[0].tag_id,
                    message: `${tagName}绑定成功`
                }
            );
        });
    });
};

// 根据标签ID获取食物ID
const getFoodIdsByTagId = (tagId) => {
    const sql = `SELECT foodid FROM food_tags WHERE tag_id=?`;
    return new Promise((resolve, reject) => {
        db.query(sql, tagId, (err, results) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(results ? results.map(item => item.foodid) : []);
        });
    });
};

module.exports = {
    getTagIdByName,
    getFoodIdsByTagId
};