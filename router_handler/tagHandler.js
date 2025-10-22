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
exports.deleteTag = (req, res) => {
    const { tagid } = req.body;
    const sql = `DELETE FROM tags WHERE tag_id = ?`;
    db.query(sql, [tagid], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        res.send({
            status: 0,
            message: '删除标签成功'
        });
    });
}