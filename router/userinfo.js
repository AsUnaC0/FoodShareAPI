// 导入 express
const express = require('express')
// 创建路由对象
const router = express.Router()
// 获取用户基本信息的处理函数
const userinfoHandler = require('../router_handler/userInfoHandler')

const expressJoi = require('@escook/express-joi')
// 获取更新用户基本信息的验证规则
const { update_userinfo_schema, update_password_schema, update_avatar_schema } = require('../data_validation/userCheck')

// 获取登录用户的基本信息
router.get('/userinfo', userinfoHandler.getUserInfo)

// 更新用户的基本信息
router.post('/userinfo', expressJoi(update_userinfo_schema), userinfoHandler.updateUserInfo)

// 更新用户头像
router.post('/update/avatar', expressJoi(update_avatar_schema), userinfoHandler.updateAvatar)

// 重置密码
router.post('/updatepwd', expressJoi(update_password_schema), userinfoHandler.updatePassword)

// 获取用户点赞的食物信息
router.get('/likefood', userinfoHandler.getLikeFood)

// 获取用户收藏的食物信息
router.get('/favoritefood', userinfoHandler.getFavoriteFood)

// 获取用户发布的食物信息
router.get('/foodlist', userinfoHandler.getFoodList)


// 向外共享路由对象
module.exports = router