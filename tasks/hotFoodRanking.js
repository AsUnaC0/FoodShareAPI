const fs = require('fs').promises;
const path = require('path');
const cron = require('node-cron');
const db = require('../db');

const hotFoodRankingPath = path.join(__dirname, '../hotfoodRanking.json');

async function updateHotFoodRanking() {
    const today = new Date().toISOString().split('T')[0];

    try {
        const results = await db.promiseQuery(
            `SELECT
                f.foodid,
                (COUNT(DISTINCT l.likeid) * 1 + COUNT(DISTINCT c.commentid) * 3 + COUNT(DISTINCT fav.favoriteid) * 5) AS hotness
             FROM foods f
             LEFT JOIN likes l ON f.foodid = l.foodid
             LEFT JOIN comments c ON f.foodid = c.foodid
             LEFT JOIN favorites fav ON f.foodid = fav.foodid
             GROUP BY f.foodid
             ORDER BY hotness DESC
             LIMIT 10`
        );

        await fs.writeFile(
            hotFoodRankingPath,
            JSON.stringify(
                {
                    date: today,
                    hotFood: results,
                },
                null,
                2
            ),
            'utf8'
        );
    } catch (error) {
        console.error('热门美食排行榜任务执行失败:', error);
    }
}

function startHotFoodRankingTask() {
    console.log('热门美食排行榜定时任务已注册');
    cron.schedule('0 2 * * *', updateHotFoodRanking);
}

module.exports = {
    startHotFoodRankingTask,
    updateHotFoodRanking,
};
