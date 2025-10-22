const express = require('express')
const router = express.Router()

// 导入标签处理函数模块
const tagHandler = require('../router_handler/tagHandler')

// 添加标签
router.post('/addtag', tagHandler.addTag)

// 获取所有标签
router.get('/alltags', tagHandler.getAllTags)

// 获取type为tag的美食标签
router.get('/foodtags', tagHandler.getFoodTags)

// 删除标签
router.post('/deletetag', tagHandler.deleteTag)


module.exports = router