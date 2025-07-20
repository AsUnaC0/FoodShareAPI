const express = require('express')

const app = express()

const cors = require('cors')
const joi = require('joi')
const config = require('./config')
// 解析token的中间件
const { expressjwt } = require('express-jwt')

// 使用 .unless({ path: [/^\/api\//] }) 指定哪些接口不需要进行 Token 的身份认证
app.use(expressjwt({ secret: config.jwtSecretKey, algorithms: ['HS256'] }).unless({ path: [/^\/api\//, /^\/food\/foodlist$/, /^\/fooddetail\//] }))

app.use(cors())

app.use(express.urlencoded({ extended: false }))

// 导入并注册用户路由模块
const userRouter = require('./router/user')
app.use('/api', userRouter)

// 导入并使用用户信息路由模块
const userinfoRouter = require('./router/userinfo')
// 注意：以 /my 开头的接口，都是有权限的接口，需要进行 Token 身份认证
app.use('/my', userinfoRouter)

// 导入并注册美食路由模块 获取美食列表 不需要验证token，其余的对美食进行操作需要验证
const foodRouter = require('./router/food')
app.use('/food', foodRouter)

// 导入并注册美食详情路由模块
const fooddetailRouter = require('./router/fooddetail')
app.use('/fooddetail', fooddetailRouter)

// 错误中间件
app.use(function (err, req, res, next) {
    // 参数校验失败
    if (err instanceof joi.ValidationError)
        return res.send({ status: 1, message: err.message })
    // 捕获身份认证失败的错误
    if (err.name === 'UnauthorizedError') {
        return res.send({ status: 1, message: '身份认证失败！' })
    }
    // // 未知错误
    res.send({ status: 1, message: err.message })
})

app.listen(3007, function () {
    console.log('api server running at http://127.0.0.1:3007')
})