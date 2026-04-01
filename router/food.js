const express = require('express');
const expressJoi = require('@escook/express-joi');
const foodHandler = require('../router_handler/foodHandler');
const uploadHandler = require('../router_handler/upload');
const { add_food_schema } = require('../data_validation/foodShare');

const router = express.Router();

router.post('/foodlist', foodHandler.getFoodList);
router.get('/foodlistbytime', foodHandler.getFoodListByTime);
router.post('/foodlistbyuser', foodHandler.getFoodListByUser);
router.get('/hotfoodlist', foodHandler.getHotFoodList);

// router.post('/upload', uploadHandler.upload);
router.post('/upload/images', uploadHandler.uploadImages);
router.post('/upload/video', uploadHandler.uploadVideo);

router.post('/addfood', expressJoi(add_food_schema), foodHandler.addFood);
router.post('/deletefood', foodHandler.deleteFood);
router.post('/likefood', foodHandler.likeFood);
router.post('/unlikefood', foodHandler.unlikeFood);
router.post('/favoritefood', foodHandler.favoritefood);
router.post('/unfavoritefood', foodHandler.unfavoritefood);
router.post('/commentfood', foodHandler.commentfood);
router.post('/searchfood', foodHandler.searchFood);

module.exports = router;
