const express = require('express')
const router = express.Router()

const foodHandler = require('../router_handler/foodHandler')

const uploadHandler = require('../router_handler/upload')

const expressJoi = require('@escook/express-joi')

const { add_food_schema } = require('../data_validation/foodShare')

// 获取美食列表 不需要验证token
router.post('/foodlist', foodHandler.getFoodList)

// 美食图片的发送
router.post('/upload', uploadHandler.upload)

// 用户发布美食信息
router.post('/addfood', expressJoi(add_food_schema), foodHandler.addFood)

// 用户删除贴子
router.post('/deletefood', foodHandler.deleteFood)

// 用户对该食物贴子进行点赞
router.post('/likefood', foodHandler.likeFood)

// 用户对该食物贴子取消点赞
router.post('/unlikefood', foodHandler.unlikeFood)

// 用户对该食物贴子收藏
router.post('/favoritefood', foodHandler.favoritefood)

// 用户对该食物贴子取消收藏
router.post('/unfavoritefood', foodHandler.unfavoritefood)

// 用户对该食物贴子进行评论
router.post('/commentfood', foodHandler.commentfood)

// 用户对该贴子进行评分
router.post('/ratefood', foodHandler.ratefood)

module.exports = router