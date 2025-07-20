const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 配置multer存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // 创建美食图片上传目录
        const uploadDir = path.join(__dirname, '../images/foodimages');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // 生成唯一文件名：时间戳+随机数+扩展名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'food-' + uniqueSuffix + ext);
    }
});

// 文件过滤：只允许图片类型
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('只允许上传JPEG、PNG格式的图片'), false);
    }
};

// 初始化multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 限制5MB
    }
});

// 美食图片上传路由
exports.upload = (req, res) => {
    // 使用upload.single('file')处理单个文件上传
    // 'file'对应前端form-data中的字段名
    upload.single('file')(req, res, function (err) {
        if (err) {
            // 处理multer错误
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({
                    code: 413,
                    message: '图片大小不能超过5MB'
                });
            }
            return res.status(400).json({
                code: 400,
                message: err.message || '文件上传失败'
            });
        }

        // 检查是否有文件上传
        if (!req.file) {
            return res.status(400).json({
                code: 400,
                message: '请上传有效的图片文件'
            });
        }

        // 获取上传的文件信息
        const fileInfo = {
            originalName: req.file.originalname,
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype,
            // 生成可访问的URL
            url: `/images/foodimages/${req.file.filename}`
        };

        // 返回成功响应
        res.json({
            code: 200,
            message: '美食图片上传成功',
            data: fileInfo
        });
    });
};
