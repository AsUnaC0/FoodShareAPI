const express = require('express')
const router = express.Router()

// 获取管理员登录的处理函数
const adminHandler = require('../router_handler/adminHandler')

// 获取待审核美食贴子
router.get('/pendingfood', adminHandler.getPendingFood)

// 获取用户信息
router.post('/userinfo', adminHandler.getUserInfo)

// 封禁用户账号
router.post('/banuser', adminHandler.banUser)

module.exports = router