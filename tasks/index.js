const { startHotFoodRankingTask } = require('./hotFoodRanking');

function startAllTasks() {
    startHotFoodRankingTask();
    console.log('所有定时任务启动完成');
}

module.exports = {
    startAllTasks,
};
