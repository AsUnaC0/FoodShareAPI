const express = require('express');
const expressJoi = require('@escook/express-joi');
const userinfoHandler = require('../router_handler/userInfoHandler');
const { update_userinfo_schema, update_password_schema } = require('../data_validation/userCheck');

const router = express.Router();

router.get('/userinfo', userinfoHandler.getUserInfo);
router.post('/userinfo', expressJoi(update_userinfo_schema), userinfoHandler.updateUserInfo);
router.post('/mytags', userinfoHandler.updateMyTags);
router.post('/update/avatar', userinfoHandler.updateAvatar);
router.post('/updatepwd', expressJoi(update_password_schema), userinfoHandler.updatePassword);
router.get('/likefood', userinfoHandler.getLikeFood);
router.get('/favoritefood', userinfoHandler.getFavoriteFood);
router.get('/foodlist', userinfoHandler.getFoodList);
router.post('/follow', userinfoHandler.follow);
router.post('/unfollow', userinfoHandler.unfollow);
router.post('/merchant', userinfoHandler.merchant);

module.exports = router;
