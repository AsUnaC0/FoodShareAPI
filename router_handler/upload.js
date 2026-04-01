const {
    createUploader,
    createVideoUploader,
    toImageUrl,
    toRelativeImagePath,
} = require('../utils/fileStorage');

const imageUpload = createUploader('foodimages', 'food');
const videoUpload = createVideoUploader('foodvideos', 'video');

function buildFileResponse(file, subDir) {
    const relativePath = toRelativeImagePath(subDir, file.filename);
    return {
        originalName: file.originalname,
        filename: file.filename,
        relativePath,
        url: toImageUrl(relativePath),
        size: file.size,
        mimetype: file.mimetype,
    };
}

// exports.upload = (req, res) => {
//     imageUpload.single('file')(req, res, (err) => {
//         if (err) {
//             if (err.code === 'LIMIT_FILE_SIZE') {
//                 return res.status(413).json({ code: 413, message: '图片大小不能超过 5MB' });
//             }
//             return res.status(400).json({ code: 400, message: err.message || '文件上传失败' });
//         }

//         if (!req.file) {
//             return res.status(400).json({ code: 400, message: '请上传有效的图片文件' });
//         }

//         return res.status(200).json({
//             code: 200,
//             message: '图片上传成功',
//             data: buildFileResponse(req.file, 'foodimages'),
//         });
//     });
// };

exports.uploadImages = (req, res) => {
    imageUpload.array('files', 9)(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ code: 413, message: '图片大小不能超过 10MB' });
            }
            return res.status(400).json({ code: 400, message: err.message || '文件上传失败' });
        }

        if (!req.files || !req.files.length) {
            return res.status(400).json({ code: 400, message: '请上传至少一张图片' });
        }

        return res.status(200).json({
            code: 200,
            message: '图片上传成功',
            data: req.files.map((file) => buildFileResponse(file, 'foodimages')),
        });
    });
};

exports.uploadVideo = (req, res) => {
    videoUpload.single('file')(req, res, (err) => {
        console.log('req.file', req);
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ code: 413, message: '视频大小不能超过 100MB' });
            }
            return res.status(400).json({ code: 400, message: err.message || '文件上传失败' });
        }

        if (!req.file) {
            return res.status(400).json({ code: 400, message: '请上传有效的视频文件' });
        }

        return res.status(200).json({
            code: 200,
            message: '视频上传成功',
            data: buildFileResponse(req.file, 'foodvideos'),
        });
    });
};
