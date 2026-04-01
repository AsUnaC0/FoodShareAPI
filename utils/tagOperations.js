const db = require('../db');

async function getTagIdByName(tagName) {
    const rows = await db.promiseQuery('SELECT tag_id FROM tags WHERE tag_name = ?', [tagName]);
    if (!rows.length) {
        throw new Error(`标签 "${tagName}" 不存在`);
    }

    return {
        tag_id: rows[0].tag_id,
        message: `${tagName} 绑定成功`,
    };
}

async function getFoodIdsByTagId(tagId) {
    const rows = await db.promiseQuery('SELECT foodid FROM food_tags WHERE tag_id = ?', [tagId]);
    return rows.map((item) => item.foodid);
}

async function getTagsByFoodId(foodId) {
    const rows = await db.promiseQuery(
        `SELECT t.tag_id, t.tag_name, t.type
         FROM food_tags ft
         INNER JOIN tags t ON t.tag_id = ft.tag_id
         WHERE ft.foodid = ?`,
        [foodId]
    );
    return rows;
}

module.exports = {
    getTagIdByName,
    getFoodIdsByTagId,
    getTagsByFoodId,
};
