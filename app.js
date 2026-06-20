const express = require('express');
const path = require('path');
const cors = require('cors');
const joi = require('joi');
const { expressjwt } = require('express-jwt');
const config = require('./config');
const { ensureDir } = require('./utils/fileStorage');

const app = express();

// 启动时确保 images 目录存在，如果不存在则创建
ensureDir(path.join(__dirname, 'images'));

// 启用跨域请求支持
app.use(cors());

// 解析请求体（URL编码和JSON格式）
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// 将 images 目录设为静态文件目录，外部可访问图片
app.use('/images', express.static(path.join(__dirname, 'images')));

//验证所有请求的JWT token，但排除掉部分不需要登录的接口，只接受使用 HS256 算法签名的 token，其他一律拒绝
app.use(
    expressjwt({ secret: config.jwtSecretKey, algorithms: ['HS256'] }).unless({
        path: [
            /^\/api\//,
            /^\/food\/foodlist$/,
            /^\/food\/hotfoodlist$/,
            /^\/food\/foodlistbytime$/,
            /^\/fooddetail\//,
            /^\/tag\//,
            /^\/admin\/login$/,
        ],
    })
);

app.use('/api', require('./router/user'));
app.use('/my', require('./router/userinfo'));
app.use('/food', require('./router/food'));
app.use('/fooddetail', require('./router/fooddetail'));
app.use('/tag', require('./router/tag'));
app.use('/admin', require('./router/admin'));

// 启动所有定时任务
const { startAllTasks } = require('./tasks');
startAllTasks();

// 错误处理中间件
app.use((err, req, res, next) => {
    if (err instanceof joi.ValidationError) { //Joi验证错误
        return res.status(400).send({ status: 1, message: err.message });
    }

    if (err && err.name === 'UnauthorizedError') {
        if (err.inner && err.inner.name === 'TokenExpiredError') {
            return res.status(401).json({ status: 1, message: 'Token 已过期，请重新登录' });
        }
        if (err.code === 'credentials_required' || /credentials_required/.test(err.message || '')) {
            return res.status(401).json({ status: 1, message: '未提供 token' });
        }
        return res.status(401).json({ status: 1, message: '无效的 token' });
    }

    return res.status(500).send({ status: 1, message: err.message || '服务器内部错误' });
});

app.listen(config.server.port, () => {
    console.log(`api server running at ${config.server.baseUrl}`);
});
