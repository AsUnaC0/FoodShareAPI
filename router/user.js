const express = require('express')
const router = express.Router()

// 导入用户路由处理函数模块
const userHandler = require('../router_handler/userHandler')

// 导入验证数据的中间件
const expressJoi = require('@escook/express-joi')

// 导入验证规则对象
const { reg_reg_schema, reg_login_schema } = require('../data_validation/userCheck')

// 注册新用户
router.post('/reguser', expressJoi(reg_reg_schema), userHandler.regUser)
// 登录
router.post('/login', expressJoi(reg_login_schema), userHandler.login)

module.exports = router