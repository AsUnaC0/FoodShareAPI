const fs = require('fs');
const path = require('path');
const multer = require('multer');
const config = require('../config');

const IMAGE_ROOT = path.join(__dirname, '../images');

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function sanitizeFileName(name) {
    return String(name || 'file').replace(/[^\w.-]/g, '_');
}

function createDiskStorage(subDir, prefix, fallbackExt) {
    return multer.diskStorage({
        destination(req, file, cb) {
            const uploadDir = path.join(IMAGE_ROOT, subDir);
            ensureDir(uploadDir);
            cb(null, uploadDir);
        },
        filename(req, file, cb) {
            const ext = path.extname(file.originalname || '').toLowerCase() || fallbackExt;
            const uniqueName = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
            cb(null, sanitizeFileName(uniqueName));
        },
    });
}

function createMimetypeFilter(allowedTypes, message) {
    return (req, file, cb) => {
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
            return;
        }
        cb(new Error(message));
    };
}

function createUploaderWithOptions({
    subDir,
    prefix,
    maxSize = 5 * 1024 * 1024,
    allowedTypes,
    message,
    fallbackExt = '.dat',
}) {
    return multer({
        storage: createDiskStorage(subDir, prefix, fallbackExt),
        fileFilter: createMimetypeFilter(allowedTypes, message),
        limits: { fileSize: maxSize },
    });
}

function createUploader(subDir, prefix, maxSize = 10 * 1024 * 1024) {
    return createUploaderWithOptions({
        subDir,
        prefix,
        maxSize,
        allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
        message: '仅支持 JPG、JPEG、PNG、WEBP 格式图片',
        fallbackExt: '.jpg',
    });
}

function createVideoUploader(subDir, prefix, maxSize = 100 * 1024 * 1024) {
    return createUploaderWithOptions({
        subDir,
        prefix,
        maxSize,
        allowedTypes: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'],
        message: '仅支持 MP4、MOV、WEBM、MKV 格式视频',
        fallbackExt: '.mp4',
    });
}

function toImageUrl(relativePath) {
    if (!relativePath) {
        return null;
    }
    const normalized = String(relativePath).replace(/\\/g, '/').replace(/^\/+/, '');
    return `${config.server.baseUrl}/${normalized}`;
}

function toRelativeImagePath(subDir, filename) {
    return path.posix.join('images', subDir, filename);
}

function extractLocalImagePath(storedPathOrUrl) {
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
