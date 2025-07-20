const express = require('express')
const router = express.Router()

const getFoodInfo = require('../router_handler/getFoodInfo')

// 获取食物发布者的用户信息
router.get('/foodcreater', getFoodInfo.getFoodUser)

// 获取该食物的评论
router.get('/foodcomment', getFoodInfo.getFoodComment)

// 获取该食物的点赞量和收藏量
router.get('/foodlike', getFoodInfo.getFoodLike)

module.exports = router