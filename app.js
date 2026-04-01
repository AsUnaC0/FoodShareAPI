const express = require('express');
const path = require('path');
const cors = require('cors');
const joi = require('joi');
const { expressjwt } = require('express-jwt');
const config = require('./config');
const { ensureDir } = require('./utils/fileStorage');

const app = express();

ensureDir(path.join(__dirname, 'images'));

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'images')));

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

const { startAllTasks } = require('./tasks');
startAllTasks();

app.use((err, req, res, next) => {
    if (err instanceof joi.ValidationError) {
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
