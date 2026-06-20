const fs = require('fs');
const path = require('path');
const multer = require('multer');
const config = require('../config');

// path:处理路径拼接与转换，避免不同系统分隔符问题
const IMAGE_ROOT = path.join(__dirname, '../images');

// fs:Node.js文件系统模块，判断目录是否存在，不存在就创建
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function sanitizeFileName(name) {
    return String(name || 'file').replace(/[^\w.-]/g, '_');
}

// multer: Express文件上传中间件，负责接收 multipart / form - data 上传文件。
// 创建 multer 的磁盘存储配置
function createDiskStorage(subDir, prefix, fallbackExt) {
    return multer.diskStorage({
        // 指定上传路径
        destination(req, file, cb) {
            const uploadDir = path.join(IMAGE_ROOT, subDir);
            ensureDir(uploadDir);
            cb(null, uploadDir);
        },
        // 生成唯一文件名
        filename(req, file, cb) {
            const ext = path.extname(file.originalname || '').toLowerCase() || fallbackExt;
            const uniqueName = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
            cb(null, sanitizeFileName(uniqueName));
        },
    });
}

// 创建文件类型过滤器 如果在允许列表中，继续上传
function createMimetypeFilter(allowedTypes, message) {
    return (req, file, cb) => {
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
            return;
        }
        cb(new Error(message));
    };
}

// MIME（Multipurpose Internet Mail Extensions）类型，本质就是：
// 文件的“真实类型标识”
// 它不是看文件名（.jpg、.png），而是看文件内容属于什么类型。
function createUploaderWithOptions({ //通用上传器构建器，后面会用它生成图片和视频上传器
    subDir, //保存子目录
    prefix, //文件名前缀
    maxSize = 5 * 1024 * 1024, //最大文件大小
    allowedTypes, //允许的MIME类型
    message, //类型不对时的错误信息
    fallbackExt = '.dat', //默认扩展名
}) {
    return multer({
        storage: createDiskStorage(subDir, prefix, fallbackExt),
        fileFilter: createMimetypeFilter(allowedTypes, message),
        limits: { fileSize: maxSize },
    });
}

function createUploader(subDir, prefix, maxSize = 10 * 1024 * 1024) { //创建图片上传器
    return createUploaderWithOptions({
        subDir,
        prefix,
        maxSize,
        allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
        message: '仅支持 JPG、JPEG、PNG、WEBP 格式图片',
        fallbackExt: '.jpg',
    });
}

function createVideoUploader(subDir, prefix, maxSize = 100 * 1024 * 1024) { //创建视频上传器
    return createUploaderWithOptions({
        subDir,
        prefix,
        maxSize,
        allowedTypes: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'],
        message: '仅支持 MP4、MOV、WEBM、MKV 格式视频',
        fallbackExt: '.mp4',
    });
}

// 把本地图片路径转换为可访问的 URL
function toImageUrl(relativePath) {
    if (!relativePath) {
        return null;
    }
    const normalized = String(relativePath).replace(/\\/g, '/').replace(/^\/+/, '');
    return `${config.server.baseUrl}/${normalized}`;
}

// 生成相对存储路径 保存到数据库时，记录相对路径用于后续访问
function toRelativeImagePath(subDir, filename) {
    return path.posix.join('images', subDir, filename);
}

// 从完整 URL 或相对路径提取本地文件系统路径
function extractLocalImagePath(storedPathOrUrl) { //用来删除或读取本地文件时，将数据库中的 URL/路径转换为实际文件路径
    if (!storedPathOrUrl) {
        return null;
    }

    try {
        const pathname = new URL(storedPathOrUrl).pathname;
        if (!pathname.startsWith('/images/')) {
            return null;
        }
        return path.join(__dirname, '..', pathname);
    } catch (error) {
        const normalized = String(storedPathOrUrl).replace(/\//g, path.sep);
        const marker = `images${path.sep}`;
        const markerIndex = normalized.indexOf(marker);
        if (markerIndex === -1) {
            return null;
        }
        return path.join(__dirname, '..', normalized.substring(markerIndex));
    }
}

// 删除本地文件
function removeLocalFile(filePath) {
    if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

module.exports = {
    IMAGE_ROOT,
    ensureDir,
    createUploader,
    createVideoUploader,
    toImageUrl,
    toRelativeImagePath,
    extractLocalImagePath,
    removeLocalFile,
};

// 本模块的作用
// 1.确保图片文件目录存在
// 2.生成文件上传存储策略
// 3.过滤上传文件类型
// 4.生成可访问 URL
// 5.将 URL / 路径转换为本地文件路径
// 6.删除本地文件