const db = require('../db/index');
const fs = require('fs').promises;
const path = require('path');
const tagOperations = require('../utils/tagOperations');
const hotFoodRankingPath = path.join(__dirname, '../router_handler/hotfoodRanking.json');

const timeTagsMap = {
    breakfast: ['早餐', '面包'],  // 早餐相关标签
    lunch: ['中餐', '午餐', '工作餐', '盖饭', '米饭'],  // 午餐相关标签
    dinner: ['晚餐', '西餐', '炒菜'],  // 晚餐相关标签
};

// 根据食物ID数组获取食物详情列表
const getFoodDetailsByIds = (foodIds) => {
    if (foodIds.length === 0) return Promise.resolve([]);
    const sql = `SELECT * FROM foods WHERE foodid IN (?)`;
    return new Promise((resolve, reject) => {
        db.query(sql, [foodIds], (err, results) => {
            if (err) reject(err);
            resolve(results);
        });
    });
};

// 获取食物列表 按start和size获取食物数据
exports.getFoodList = (req, res) => {
    const start = parseInt(req.body.start) || 0;
    const size = parseInt(req.body.size) || 10;

    const sql = `SELECT * FROM foods LIMIT ?, ?`;
    db.query(sql, [start, size], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });

        if (results.length === 0) return res.send({ status: 1, message: '暂无数据' });
        res.send({
            status: 0,
            message: '获取成功',
            data: results
        });
    });
};

// 根据时间段获取食物列表
exports.getFoodListByTime = (req, res) => {
    const hour = new Date().getHours();
    let timeCondition = '';

    if (hour >= 5 && hour < 11) {
        timeCondition = 'breakfast';
    } else if (hour >= 11 && hour < 17) {
        timeCondition = 'lunch';
    } else {
        timeCondition = 'dinner';
    }

    const tags = timeTagsMap[timeCondition];
    console.log(`当前时间: ${hour}点, 时间段: ${timeCondition}, 标签: ${tags}`);

    if (!tags || tags.length === 0) {
        return res.send({ status: 1, message: '暂无数据' });
    }
    // 查询标签ID
    const tagIdPromises = tags.map(tag => tagOperations.getTagIdByName(tag));
    Promise.all(tagIdPromises)
        .then(tagIds => {
            // tagIds 现在是对象数组，需要提取 tag_id
            const foodIdPromises = tagIds.map(tagId => tagOperations.getFoodIdsByTagId(tagId.tag_id));
            return Promise.all(foodIdPromises);
        })
        .then(foodIds => {
            const foodDetailsPromise = getFoodDetailsByIds(foodIds.flat());
            return foodDetailsPromise;
        })
        .then(results => {
            res.send({
                status: 0,
                message: '获取成功',
                data: results
            });
        })
        .catch(err => {
            console.error('getFoodListByTime 错误:', err);
            res.send({
                status: 1,
                message: err.message,
                debug: `时间段: ${timeCondition}, 标签: ${tags.join(', ')}`
            });
        });
}

// 个性化化推荐食物列表
exports.getFoodListByUser = async (req, res) => {
    const userid = req.auth.userid;

    const history = req.body.history || false;

    const tagIds = [];

    if (history) {
        await Promise.all(
            history.map(async item => {
                const tagId = await tagOperations.getTagIdByName(item);
                tagIds.push(tagId);
            })
        );
    }

    const sql = `SELECT tagid FROM user_tags WHERE userid=?`;
    db.query(sql, userid, async (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        results.forEach(item => {
            if (item.tagid != null) {
                tagIds.push(item.tagid);
            }
        });
        if (tagIds.length === 0) return res.send({ status: 1, message: '暂无数据' });
        const foodIds = tagIds.filter(tagId => tagId != null).map(tagId => tagOperations.getFoodIdsByTagId(tagId));
        const foodDetails = await Promise.all(foodIds).then(id => {
            return getFoodDetailsByIds(id.flat());
        });

        res.send({
            status: 0,
            message: '获取成功',
            data: foodDetails
        });
    });
}

// 热门美食推荐
exports.getHotFoodList = async (req, res) => {

    try {
        // 读取热门食物数据
        const data = require('fs').readFileSync(hotFoodRankingPath, 'utf8');
        const hotFoodData = JSON.parse(data);

        if (!hotFoodData.hotFood || hotFoodData.hotFood.length === 0) {
            return res.send({
                status: 0,
                message: '暂无热门食物数据',
                data: { date: hotFoodData.date, hotFood: [] }
            });
        }

        // 获取食物ID列表
        const foodIds = hotFoodData.hotFood.map(item => item.foodid);

        // 从数据库获取完整的食物信息
        const foodDetails = await getFoodDetailsByIds(foodIds);

        // 合并热度信息和食物详情
        const hotFoodWithDetails = hotFoodData.hotFood.map(hotItem => {
            const foodDetail = foodDetails.find(food => food.foodid === hotItem.foodid);
            if (foodDetail) {
                return {
                    ...foodDetail,
                    hotness: hotItem.hotness
                };
            }
            return null;
        }).filter(item => item !== null); // 过滤掉找不到详情的食物

        res.send({
            status: 0,
            message: '获取成功',
            data: {
                date: hotFoodData.date,
                hotFood: hotFoodWithDetails
            }
        });
    } catch (error) {
        console.error('获取热门食物失败:', error);
        res.send({
            status: 1,
            message: '获取热门食物数据失败: ' + error.message
        });
    }
}

// 用户发布食物
exports.addFood = (req, res) => {
    const sql = `INSERT INTO foods (userid,title,description,location,foodimg,categoryid) VALUES (?, ?, ?,?,?,?)`;
    const { title, description, location, foodimg, categoryid, tags } = req.body;

    db.query(sql, [req.auth.userid, title, description, location, foodimg, categoryid], async (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        if (results.affectedRows !== 1) return res.send({ status: 1, message: '发布失败' });

        try {
            const tagsArray = tags ? JSON.parse(tags) : [];
            const successTags = [];
            const failedTags = [];

            // 处理每个标签，收集成功和失败的信息
            for (const tag of tagsArray) {
                try {
                    // const tagId = await getTagIdByName(tag);
                    const tagId = await tagOperations.getTagIdByName(tag);
                    const sqlTag = `INSERT INTO food_tags (foodid,tag_id) VALUES (?,?)`;

                    await new Promise((resolve, reject) => {
                        db.query(sqlTag, [results.insertId, tagId.tag_id], (err, results) => {
                            if (err) reject(err);
                            else if (results.affectedRows !== 1) reject(new Error('标签绑定失败'));
                            else resolve();
                        });
                    });

                    successTags.push(tagId.message);
                } catch (error) {
                    failedTags.push(`${tag}: ${error.message}`);
                }
            }

            // 发送详细的响应信息
            res.send({
                status: failedTags.length > 0 ? 1 : 0,
                message: '发布完成',
                data: {
                    successTags,
                    failedTags,
                }
            });
        } catch (error) {
            res.send({ status: 1, message: error.message });
        }
    });
}


// 用户删除贴子
exports.deleteFood = (req, res) => {
    const sql = `DELETE FROM foods WHERE foodid=?`;
    const { foodid } = req.body;
    db.query(sql, foodid, (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        if (results.affectedRows !== 1) return res.send({ status: 1, message: '删除失败' });
        res.send({
            status: 0,
            message: '删除成功'
        })
    })
}

// 用户点赞食物贴子
exports.likeFood = (req, res) => {
    const sql = `INSERT INTO likes (userid,foodid) VALUES (?,?)`;
    const { userid, foodid } = req.body;
    db.query(sql, [userid, foodid], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        if (results.affectedRows !== 1) return res.send({ status: 1, message: '点赞失败' });
        res.send({
            status: 0,
            message: '点赞成功'
        })
    })
}

// 用户取消点赞
exports.unlikeFood = (req, res) => {
    const sql = `DELETE FROM likes WHERE userid=? AND foodid=?`;
    const { userid, foodid } = req.body;
    db.query(sql, [userid, foodid], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        if (results.affectedRows !== 1) return res.send({ status: 1, message: '取消点赞失败' });
        res.send({
            status: 0,
            message: '取消点赞成功'
        })
    })
}

// 用户收藏该美食贴子
exports.favoritefood = (req, res) => {
    let sql = `SELECT * FROM favorites WHERE userid=? AND foodid=?`;
    const { userid, foodid } = req.body;
    db.query(sql, [userid, foodid], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        if (results.length !== 0) return res.send({ status: 1, message: '已收藏' });

        sql = `INSERT INTO favorites (userid,foodid) VALUES (?,?)`;
        db.query(sql, [userid, foodid], (err, results) => {
            if (err) return res.send({ status: 1, message: err.message });
            if (results.affectedRows !== 1) return res.send({ status: 1, message: '收藏失败' });
            res.send({
                status: 0,
                message: '收藏成功'
            })
        })
    })
}

// 用户取消收藏该美食贴子
exports.unfavoritefood = (req, res) => {

    let sql = `SELECT * FROM favorites WHERE userid=? AND foodid=?`;
    const { userid, foodid } = req.body;
    db.query(sql, [userid, foodid], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        if (results.length === 0) return res.send({ status: 1, message: '未找到该收藏信息' });
        sql = `DELETE FROM favorites WHERE userid=? AND foodid=?`;
        db.query(sql, [userid, foodid], (err, results) => {
            if (err) return res.send({ status: 1, message: err.message });
            if (results.affectedRows !== 1) return res.send({ status: 1, message: '取消收藏失败' });
            res.send({
                status: 0,
                message: '取消收藏成功'
            })
        })
    })


}

// 用户对该食物贴子的文本评论
exports.commentfood = (req, res) => {
    const sql = `INSERT INTO comments (userid,foodid,content) VALUES (?,?,?)`;
    const { userid, foodid, content } = req.body;
    db.query(sql, [userid, foodid, content], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        if (results.affectedRows !== 1) return res.send({ status: 1, message: '评论失败' });
        res.send({
            status: 0,
            message: '评论成功'
        })
    })
}

// 评论检测(该用户在一分钟内对同一个食物贴子进行多次评论，将该贴子下的该用户评论标记为异常评论)
exports.commentCheck = (req, res) => {
    const { userid, foodid } = req.body;
    const sql = `SELECT * FROM comments WHERE userid=? AND foodid=? ORDER BY comment_time DESC LIMIT 1`;
    db.query(sql, [userid, foodid], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        if (results.length === 0) return res.send({ status: 1, message: '未找到该评论信息' });
        const time = moment(results[0].comment_time).add(1, 'minute');
        if (moment().isBefore(time)) {
            const sqlUpdate = `UPDATE comments SET comment_status=? WHERE commentid=?`;
            db.query(sqlUpdate, ['异常', results[0].commentid], (err, results) => {
                if (err) return res.send({ status: 1, message: err.message });
                if (results.affectedRows !== 1) return res.send({ status: 1, message: '评论标记失败' });
                res.send({
                    status: 0,
                    message: '评论标记异常成功'
                })
            });
        }
    })
}


// 用户对该食物贴子的星级评论
exports.ratefood = (req, res) => {
    let sql = `SELECT * FROM rating WHERE userid=? AND foodid=?`;
    const { userid, foodid, rating } = req.body;
    db.query(sql, [userid, foodid], (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        if (results.length !== 0) return res.send({ status: 1, message: '已评分' });

        sql = `INSERT INTO rating (userid,foodid,rating) VALUES (?,?,?)`;
        db.query(sql, [userid, foodid, rating], (err, results) => {
            if (err) return res.send({ status: 1, message: err.message });
            if (results.affectedRows !== 1) return res.send({ status: 1, message: '评分失败' });
            res.send({
                status: 0,
                message: '评分成功',
                data: rating
            })
        })
    })



}

// 用户搜索美食信息
exports.searchFood = async (req, res) => {
    // 根据关键字模糊匹配标签名
    const { keyword } = req.body;
    const tagId = [];
    const foodDetails = [];

    let sql = `SELECT tag_id FROM tags WHERE name LIKE ?`;
    db.query(sql, [`%${keyword}%`], async (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        tagId.push(...results.map(v => v.tag_id));
        // 根据tagid获取食物ID
        // const foodIds = tagId.map(id => getFoodIdsByTagId(id));
        const foodIds = tagId.map(id => tagOperations.getFoodIdsByTagId(id));
        const foodDetailsArr = await Promise.all(foodIds).then(id => {
            return getFoodDetailsByIds(id.flat());
        });
        foodDetails.push(...foodDetailsArr);
    })

    // 根据关键字模糊匹配食物标题
    sql = `SELECT * FROM foods WHERE title LIKE ?`;
    db.query(sql, [`%${keyword}%`], async (err, results) => {
        if (err) return res.send({ status: 1, message: err.message });
        res.send({
            status: 0,
            message: '获取成功',
            data: [...foodDetails, ...results]
        })
    })
}