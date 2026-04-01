const express = require('express');
const expressJoi = require('@escook/express-joi');
const adminHandler = require('../router_handler/adminHandler');
const { admin_login_schema } = require('../data_validation/userCheck');

const router = express.Router();

router.post('/login', expressJoi(admin_login_schema), adminHandler.login);
router.use(adminHandler.requireAdmin);

router.get('/pendingfood', adminHandler.getPendingFood);
router.post('/approvefood', adminHandler.approveFood);
router.post('/rejectfood', adminHandler.rejectFood);
router.post('/userinfo', adminHandler.getUserInfo);
router.post('/banuser', adminHandler.banUser);
router.post('/unbanuser', adminHandler.unbanUser);
router.post('/limituser', adminHandler.limitUser);
router.get('/abnormalcomment', adminHandler.getAbnormalComment);
router.post('/setcommenttype', adminHandler.setCommentType);
router.post('/setcommentstatus', adminHandler.setCommentStatus);
router.post('/deletecomment', adminHandler.deleteComment);

module.exports = router;
