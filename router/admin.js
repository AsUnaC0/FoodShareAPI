const express = require('express')
const router = express.Router()

// 获取管理员的处理函数
const adminHandler = require('../router_handler/adminHandler')

// 获取待审核美食贴子
router.get('/pendingfood', adminHandler.getPendingFood)

// 获取用户信息
router.post('/userinfo', adminHandler.getUserInfo)

// 封禁用户账号
router.post('/banuser', adminHandler.banUser)

// 解封用户账号
router.post('/unbanuser', adminHandler.unbanUser)

// 对用户功能进行限制
router.post('/limituser', adminHandler.limitUser)

// 获取异常评论
router.get('/abnormalcomment', adminHandler.getAbnormalComment)

// 设置异常评论类型
router.post('/setcommenttype', adminHandler.setCommentType)

// 设置评论状态
router.post('/setcommentstatus', adminHandler.setCommentStatus)

module.exports = router