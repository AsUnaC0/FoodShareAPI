const joi = require('joi')

// 账号的验证规则
const account = joi.string().alphanum().min(1).max(10).required()
// 密码的验证规则
const password = joi.string().pattern(/^[\S]{6,12}$/).required()
// 邮箱的验证规则
const email = joi.string().email().required()
// 昵称的验证规则
const nickname = joi.string().required()
// 头像的验证规则
const avatar = joi.string().dataUri().required()


exports.reg_login_schema = {
    body: {
        account,
        password,
    }
}

exports.reg_reg_schema = {
    body: {
        account,
        password,
        email,
    }
}

exports.update_userinfo_schema = {
    body: {
        nickname,
        email,
    }
}

exports.update_password_schema = {
    body: {
        oldPwd: password,
        // 1. joi.ref('oldPwd') 表示 newPwd 的值必须和 oldPwd 的值保持一致
        // 2. joi.not(joi.ref('oldPwd')) 表示 newPwd 的值不能等于 oldPwd 的值
        // 3. .concat() 用于合并 joi.not(joi.ref('oldPwd')) 和 password 这两条验证规则
        newPwd: joi.not(joi.ref('oldPwd')).concat(password),
    }
}

exports.update_avatar_schema = {
    body: {
        avatar,
    }
}