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

// 配置静态文件服务，让前端可以访问 images 文件夹中的图片
app.use('/images', express.static('images'))

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

// 导入并注册标签路由模块
const tagRouter = require('./router/tag')
app.use('/tag', tagRouter)

// 导入并注册管理员端路由模块
const adminRouter = require('./router/admin')
app.use('/admin', adminRouter)

// 启动定时任务
const { startAllTasks } = require('./tasks/index')
startAllTasks()

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

app.listen(config.server.port, function () {
    console.log(`api server running at ${config.server.baseUrl}`)
})