const db = require('../db/index')

// 添加标签的处理函数
exports.addTag = (req, res) => {
    const { tag_name, type } = req.body

    const sql = `INSERT INTO tags (tag_name, type) VALUES (?, ?)`;
    db.query(sql, [tag_name, type], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        res.send({
            status: 0,
            message: '添加成功',
            data: { tagid: results.insertId, tag_name, type }
        });
    });
}

// 获取所有标签的处理函数
exports.getAllTags = (req, res) => {
    const sql = `SELECT * FROM tags`;
    db.query(sql, (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        res.send({
            status: 0,
            message: '获取标签成功',
            data: results
        });
    });
}

// 获取type为tag的美食标签的处理函数
exports.getFoodTags = (req, res) => {
    const sql = `SELECT * FROM tags WHERE type = 'tag'`;
    db.query(sql, (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        res.send({
            status: 0,
            message: '获取美食标签成功',
            data: results
        });
    });
}

// 删除标签的处理函数
exports.deleteTag = async (req, res) => {
    const { tag_id } = req.body;

    try {
        // 首先检查标签是否存在且类型为 'tag'
        const checkResult = await new Promise((resolve, reject) => {
            const checkSql = `SELECT * FROM tags WHERE tag_id = ? AND type = 'tag'`;
            db.query(checkSql, [tag_id], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        if (checkResult.length === 0) {
            return res.send({
                status: 1,
                message: '标签不存在或不是可删除的标签类型'
            });
        }
        // 按正确顺序删除：先删除引用表，再删除主表
        const deleteOperations = [
            { sql: 'DELETE FROM user_tags WHERE tagid = ?', name: '用户标签关联' },
            { sql: 'DELETE FROM food_tags WHERE tag_id = ?', name: '食物标签关联' },
            { sql: 'DELETE FROM tags WHERE tag_id = ? AND type = "tag"', name: '标签主表' }
        ];

        // 执行删除操作
        for (const operation of deleteOperations) {
            try {
                const result = await new Promise((resolve, reject) => {
                    db.query(operation.sql, [tag_id], (err, results) => {
                        if (err) reject(err);
                        else resolve(results);
                    });
                });
            } catch (error) {
                console.error(`删除${operation.name}失败:`, error.message);
                // 对于引用表的删除失败，可以继续执行
                if (operation.name === '标签主表') {
                    throw error; // 主表删除失败则抛出错误
                }
            }
        }

        res.send({
            status: 0,
            message: '删除成功'
        });

    } catch (error) {
        console.error('删除标签失败:', error);
        res.send({
            status: 1,
            message: '删除失败: ' + error.message
        });
    }
}