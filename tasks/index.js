const { startHotFoodRankingTask } = require('./hotFoodRanking');

// 启动所有定时任务
const startAllTasks = () => {
    // 启动热门食物排行榜任务
    startHotFoodRankingTask();

    console.log('所有定时任务启动完成');
};

module.exports = {
    startAllTasks
};