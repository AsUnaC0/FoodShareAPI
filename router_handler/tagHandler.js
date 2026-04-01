const db = require('../db');

exports.addTag = async (req, res) => {
    try {
        const { tag_name, type } = req.body;
        if (!tag_name || !type) {
            return res.send({ status: 1, message: '标签名和类型不能为空' });
        }

        const exists = await db.promiseQuery('SELECT tag_id FROM tags WHERE tag_name = ? AND type = ? LIMIT 1', [tag_name, type]);
        if (exists.length) {
            return res.send({ status: 1, message: '标签已存在', data: exists[0] });
        }

        const result = await db.promiseQuery('INSERT INTO tags (tag_name, type) VALUES (?, ?)', [tag_name, type]);
        res.send({ status: 0, message: '添加成功', data: { tagid: result.insertId, tag_name, type } });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.getAllTags = async (req, res) => {
    try {
        const rows = await db.promiseQuery('SELECT * FROM tags ORDER BY tag_id DESC');
        res.send({ status: 0, message: '获取标签成功', data: rows });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.getFoodTags = async (req, res) => {
    try {
        const rows = await db.promiseQuery("SELECT * FROM tags WHERE type = 'tag' ORDER BY tag_id DESC");
        res.send({ status: 0, message: '获取美食标签成功', data: rows });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.deleteTag = async (req, res) => {
    try {
        const { tag_id } = req.body;
        const exists = await db.promiseQuery("SELECT * FROM tags WHERE tag_id = ? AND type = 'tag' LIMIT 1", [tag_id]);
        if (!exists.length) {
            return res.send({ status: 1, message: '标签不存在或不允许删除' });
        }

        await db.promiseQuery('DELETE FROM user_tags WHERE tagid = ?', [tag_id]);
        await db.promiseQuery('DELETE FROM food_tags WHERE tag_id = ?', [tag_id]);
        await db.promiseQuery("DELETE FROM tags WHERE tag_id = ? AND type = 'tag'", [tag_id]);

        res.send({ status: 0, message: '删除成功' });
    } catch (error) {
        res.send({ status: 1, message: `删除失败: ${error.message}` });
    }
};
