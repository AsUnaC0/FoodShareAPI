const db = require('../db/index');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

const hotFoodRankingPath = path.join(__dirname, '../router_handler/hotfoodRanking.json');

// 热门食物排行榜更新任务
const updateHotFoodRanking = async () => {
    console.log('定时任务开始执行:', new Date().toLocaleString());
    const today = new Date().toISOString().split('T')[0];

    try {
        // 热度计算SQL：按"点赞*1 + 评论*3 + 收藏*5"加权，取前10名ID
        const sql = `SELECT f.foodid, (COUNT(DISTINCT l.likeid) * 1 + COUNT(DISTINCT c.commentid) * 3 + COUNT(DISTINCT fav.favoriteid) * 5) AS hotness
                   FROM foods f
                   LEFT JOIN likes l ON f.foodid = l.foodid
                   LEFT JOIN comments c ON f.foodid = c.foodid
                   LEFT JOIN favorites fav ON f.foodid = fav.foodid
                   GROUP BY f.foodid
                   ORDER BY hotness DESC
                   LIMIT 10`;

        const results = await new Promise((resolve, reject) => {
            db.query(sql, (err, results) => {
                if (err) reject(err);
                const hot = {
                    date: today,
                    hotFood: results
                };
                resolve(hot);
            });
        });

        // 将结果写入JSON文件
        await fs.writeFile(hotFoodRankingPath, JSON.stringify(results));
        console.log('热门食物排行榜更新完成:', results.hotFood.length, '条记录');
    } catch (error) {
        console.error('定时任务执行失败:', error);
    }
};

// 启动定时任务
const startHotFoodRankingTask = () => {
    console.log('热门食物排行榜定时任务已注册');

    // 测试用：每分钟执行一次，正式环境改为 '0 2 * * *'（每天凌晨2点）
    cron.schedule('* 2 * * *', updateHotFoodRanking);

};

module.exports = {
    startHotFoodRankingTask,
    updateHotFoodRanking
};