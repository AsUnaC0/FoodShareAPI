const fs = require('fs');
const path = require('path');
const db = require('../db');
const tagOperations = require('../utils/tagOperations');
const { checkComment } = require('../utils/commentCheck');
const { extractLocalImagePath, removeLocalFile } = require('../utils/fileStorage');

const hotFoodRankingPath = path.join(__dirname, '../router_handler/hotfoodRanking.json');

const timeTagsMap = {
    breakfast: ['早餐', '面包'],
    lunch: ['中餐', '午餐', '工作餐', '盖饭', '米饭'],
    dinner: ['晚餐', '西餐', '炒菜'],
};

function parseArrayField(value) {
    if (!value) {
        return [];
    }
    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (error) {
        return [];
    }
}

async function enrichFoods(foods) {
    if (!foods.length) {
        return [];
    }

    const foodIds = foods.map((item) => item.foodid);
    const [tags, counters, images] = await Promise.all([
        db.promiseQuery(
            `SELECT ft.foodid, t.tag_id, t.tag_name, t.type
             FROM food_tags ft
             INNER JOIN tags t ON t.tag_id = ft.tag_id
             WHERE ft.foodid IN (?)`,
            [foodIds]
        ),
        db.promiseQuery(
            `SELECT f.foodid,
                    COUNT(DISTINCT l.likeid) AS likeCount,
                    COUNT(DISTINCT fav.favoriteid) AS favoriteCount,
                    COUNT(DISTINCT c.commentid) AS commentCount
             FROM foods f
             LEFT JOIN likes l ON l.foodid = f.foodid
             LEFT JOIN favorites fav ON fav.foodid = f.foodid
             LEFT JOIN comments c ON c.foodid = f.foodid
             WHERE f.foodid IN (?)
             GROUP BY f.foodid`,
            [foodIds]
        ),
        db.promiseQuery(
            'SELECT foodid, imageurl FROM images WHERE foodid IN (?) ORDER BY imageid ASC',
            [foodIds]
        ).catch(() => []),
    ]);

    const tagMap = new Map();
    const counterMap = new Map();
    const imageMap = new Map();

    tags.forEach((item) => {
        const current = tagMap.get(item.foodid) || [];
        current.push({
            tag_id: item.tag_id,
            tag_name: item.tag_name,
            type: item.type,
        });
        tagMap.set(item.foodid, current);
    });

    counters.forEach((item) => {
        counterMap.set(item.foodid, item);
    });

    images.forEach((item) => {
        const current = imageMap.get(item.foodid) || [];
        current.push(item.imageurl);
        imageMap.set(item.foodid, current);
    });

    return foods.map((food) => {
        const stats = counterMap.get(food.foodid) || {};
        return {
            ...food,
            images: imageMap.get(food.foodid) || [],
            tags: tagMap.get(food.foodid) || [],
            likeCount: Number(stats.likeCount || 0),
            favoriteCount: Number(stats.favoriteCount || 0),
            commentCount: Number(stats.commentCount || 0),
            publishType: food.videourl ? 'video' : 'image',
        };
    });
}

async function getFoodsByIds(foodIds) {
    if (!foodIds.length) {
        return [];
    }

    const rows = await db.promiseQuery('SELECT * FROM foods WHERE foodid IN (?) ORDER BY createdtime DESC', [foodIds]);
    return enrichFoods(rows);
}

async function getApprovedFoods(start, size) {
    const rows = await db.promiseQuery(
        'SELECT * FROM foods WHERE approved = 1 OR approved IS NULL ORDER BY createdtime DESC LIMIT ?, ?',
        [start, size]
    );
    return enrichFoods(rows);
}

exports.getFoodList = async (req, res) => {
    try {
        const start = Number.parseInt(req.body.start, 10) || 0;
        const size = Number.parseInt(req.body.size, 10) || 10;
        const foods = await getApprovedFoods(start, size);
        res.send({ status: 0, message: '获取成功', data: foods });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.getFoodListByTime = async (req, res) => {
    try {
        const hour = new Date().getHours();
        let timeCondition = 'dinner';

        if (hour >= 5 && hour < 11) {
            timeCondition = 'breakfast';
        } else if (hour >= 11 && hour < 17) {
            timeCondition = 'lunch';
        }

        const tags = timeTagsMap[timeCondition] || [];
        const tagIds = await Promise.all(tags.map((tag) => tagOperations.getTagIdByName(tag).catch(() => null)));
        const validTagIds = tagIds.filter(Boolean).map((item) => item.tag_id);

        if (!validTagIds.length) {
            return res.send({ status: 0, message: '暂无数据', data: [] });
        }

        const relatedFoodIds = await Promise.all(validTagIds.map((tagId) => tagOperations.getFoodIdsByTagId(tagId)));
        const foodIds = [...new Set(relatedFoodIds.flat())];
        const foods = await getFoodsByIds(foodIds);
        res.send({ status: 0, message: '获取成功', data: foods });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.getFoodListByUser = async (req, res) => {
    try {
        const history = Array.isArray(req.body.history) ? req.body.history : parseArrayField(req.body.history);
        const tagIds = new Set();
        const foodIds = new Set();

        for (const tag of history) {
            if (!tag || typeof tag !== 'string') {
                continue;
            }
            try {
                const tagInfo = await tagOperations.getTagIdByName(tag.trim());
                tagIds.add(tagInfo.tag_id);
            } catch (error) {
                // Ignore unknown tags from local history.
            }
        }

        if (req.auth && req.auth.userid) {
            const userTags = await db.promiseQuery('SELECT tagid FROM user_tags WHERE userid = ?', [req.auth.userid]);
            userTags.forEach((item) => tagIds.add(item.tagid));
        }

        for (const tagId of tagIds) {
            const ids = await tagOperations.getFoodIdsByTagId(tagId);
            ids.forEach((id) => foodIds.add(id));
        }

        const foods = await getFoodsByIds([...foodIds]);
        res.send({ status: 0, message: '获取成功', data: foods });
    } catch (error) {
        res.send({ status: 1, message: `获取推荐失败: ${error.message}` });
    }
};

exports.getHotFoodList = async (req, res) => {
    try {
        if (!fs.existsSync(hotFoodRankingPath)) {
            return res.send({ status: 0, message: '暂无热门数据', data: { date: null, hotFood: [] } });
        }

        const hotFoodData = JSON.parse(fs.readFileSync(hotFoodRankingPath, 'utf8'));
        const foods = await getFoodsByIds((hotFoodData.hotFood || []).map((item) => item.foodid));
        const foodMap = new Map(foods.map((food) => [food.foodid, food]));

        const hotFood = (hotFoodData.hotFood || [])
            .map((item) => (foodMap.has(item.foodid) ? { ...foodMap.get(item.foodid), hotness: item.hotness } : null))
            .filter(Boolean);

        res.send({
            status: 0,
            message: '获取成功',
            data: {
                date: hotFoodData.date || null,
                hotFood,
            },
        });
    } catch (error) {
        res.send({ status: 1, message: `获取热门美食数据失败: ${error.message}` });
    }
};

exports.addFood = async (req, res) => {
    try {
        const { title, description, location, categoryid } = req.body;
        const tags = Array.isArray(req.body.tags) ? req.body.tags : parseArrayField(req.body.tags);
        const images = Array.isArray(req.body.images) ? req.body.images : parseArrayField(req.body.images);
        const videourl = req.body.videourl || null;
        const videocover = req.body.videocover || null;

        if (!images.length && !videourl) {
            return res.send({ status: 1, message: '请至少上传一张图片，或上传一个视频' });
        }

        const result = await db.promiseQuery(
            `INSERT INTO foods (userid, title, description, location, approved, categoryid, videourl, videocover)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.auth.userid, title, description, location, 0, categoryid, videourl, videocover]
        );

        const foodid = result.insertId;
        const successTags = [];
        const failedTags = [];

        for (const tag of tags) {
            try {
                const tagInfo = await tagOperations.getTagIdByName(tag);
                await db.promiseQuery('INSERT INTO food_tags (foodid, tag_id) VALUES (?, ?)', [foodid, tagInfo.tag_id]);
                successTags.push(tag);
            } catch (error) {
                failedTags.push(`${tag}: ${error.message}`);
            }
        }

        for (const imageurl of images) {
            await db.promiseQuery('INSERT INTO images (foodid, imageurl) VALUES (?, ?)', [foodid, imageurl]);
        }

        const created = await getFoodsByIds([foodid]);
        res.send({
            status: 0,
            message: '发布成功，等待审核',
            data: {
                food: created[0] || null,
                successTags,
                failedTags,
            },
        });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.deleteFood = async (req, res) => {
    try {
        const { foodid } = req.body;
        const rows = await db.promiseQuery('SELECT * FROM foods WHERE foodid = ? LIMIT 1', [foodid]);
        if (!rows.length) {
            return res.send({ status: 1, message: '美食内容不存在' });
        }

        const food = rows[0];
        if (Number(food.userid) !== Number(req.auth.userid)) {
            return res.send({ status: 1, message: '只能删除自己发布的内容' });
        }

        const imageRows = await db.promiseQuery('SELECT imageurl FROM images WHERE foodid = ?', [foodid]).catch(() => []);

        await db.promiseQuery('DELETE FROM comments WHERE foodid = ?', [foodid]);
        await db.promiseQuery('DELETE FROM likes WHERE foodid = ?', [foodid]);
        await db.promiseQuery('DELETE FROM favorites WHERE foodid = ?', [foodid]);
        await db.promiseQuery('DELETE FROM food_tags WHERE foodid = ?', [foodid]);
        await db.promiseQuery('DELETE FROM images WHERE foodid = ?', [foodid]).catch(() => null);
        await db.promiseQuery('DELETE FROM foods WHERE foodid = ?', [foodid]);

        imageRows.forEach((item) => removeLocalFile(extractLocalImagePath(item.imageurl)));
        removeLocalFile(extractLocalImagePath(food.videourl));
        removeLocalFile(extractLocalImagePath(food.videocover));

        res.send({ status: 0, message: '删除成功' });
    } catch (error) {
        res.send({ status: 1, message: `删除失败: ${error.message}` });
    }
};

exports.likeFood = async (req, res) => {
    try {
        const result = await db.promiseQuery('INSERT IGNORE INTO likes (userid, foodid) VALUES (?, ?)', [req.auth.userid, req.body.foodid]);

        if (!result.affectedRows) {
            return res.send({ status: 1, message: '您已点赞' });
        }
        res.send({ status: 0, message: '点赞成功' });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.unlikeFood = async (req, res) => {
    try {
        const result = await db.promiseQuery('DELETE FROM likes WHERE userid = ? AND foodid = ?', [req.auth.userid, req.body.foodid]);
        if (!result.affectedRows) {
            return res.send({ status: 1, message: '取消点赞失败' });
        }
        res.send({ status: 0, message: '取消点赞成功' });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.favoritefood = async (req, res) => {
    try {
        const result = await db.promiseQuery('INSERT IGNORE INTO favorites (userid, foodid) VALUES (?, ?)', [req.auth.userid, req.body.foodid]);
        if (!result.affectedRows) {
            return res.send({ status: 1, message: '已收藏' });
        }
        res.send({ status: 0, message: '收藏成功' });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.unfavoritefood = async (req, res) => {
    try {
        const result = await db.promiseQuery('DELETE FROM favorites WHERE userid = ? AND foodid = ?', [req.auth.userid, req.body.foodid]);
        if (!result.affectedRows) {
            return res.send({ status: 1, message: '未找到该收藏信息' });
        }
        res.send({ status: 0, message: '取消收藏成功' });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.commentfood = async (req, res) => {
    try {
        const { foodid, content } = req.body;
        if (!String(content || '').trim()) {
            return res.send({ status: 1, message: '评论内容不能为空' });
        }

        const state = await checkComment(req.auth.userid);
        const result = await db.promiseQuery(
            'INSERT INTO comments (userid, foodid, content, comment_status) VALUES (?, ?, ?, ?)',
            [req.auth.userid, foodid, content.trim(), state]
        );

        if (!result.affectedRows) {
            return res.send({ status: 1, message: '评论失败' });
        }
        res.send({ status: 0, message: '评论成功' });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};

exports.searchFood = async (req, res) => {
    try {
        const keyword = String(req.body.keyword || '').trim();
        if (!keyword) {
            return res.send({ status: 1, message: '请输入搜索关键词' });
        }

        const titleRows = await db.promiseQuery('SELECT * FROM foods WHERE title LIKE ? ORDER BY createdtime DESC', [`%${keyword}%`]);
        const userRows = await db.promiseQuery(
            `SELECT f.*
             FROM foods f
             INNER JOIN users u ON u.userid = f.userid
             WHERE u.nickname LIKE ? OR u.account LIKE ?
             ORDER BY f.createdtime DESC`,
            [`%${keyword}%`, `%${keyword}%`]
        );
        const tagRows = await db.promiseQuery('SELECT tag_id FROM tags WHERE tag_name LIKE ?', [`%${keyword}%`]);

        let tagFoods = [];
        if (tagRows.length) {
            const idsGroup = await Promise.all(tagRows.map((item) => tagOperations.getFoodIdsByTagId(item.tag_id)));
            const foodIds = [...new Set(idsGroup.flat())];
            tagFoods = await getFoodsByIds(foodIds);
        }

        const allFoods = [...titleRows, ...userRows];
        const mergedMap = new Map();

        (await enrichFoods(allFoods)).forEach((food) => mergedMap.set(food.foodid, food));
        tagFoods.forEach((food) => mergedMap.set(food.foodid, food));

        res.send({
            status: 0,
            message: '获取成功',
            data: [...mergedMap.values()].sort((a, b) => new Date(b.createdtime || 0) - new Date(a.createdtime || 0)),
        });
    } catch (error) {
        res.send({ status: 1, message: error.message });
    }
};
