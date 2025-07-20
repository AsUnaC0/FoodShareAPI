const joi = require('joi')

// title的验证规则
const title = joi.string().required()
// 食物描述的验证规则
const description = joi.string().required()
// 位置的验证规则
const location = joi.string().required()
// 食物图片的验证规则
const foodimg = joi.string().required()
// 分类的验证规则
const category = joi.string().required()


exports.add_food_schema = {
    body: {
        title,
        description,
        location,
        foodimg,
        category
    }
}