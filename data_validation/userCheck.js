const joi = require('joi');

const account = joi.string().alphanum().min(1).max(20).required();
const password = joi.string().pattern(/^[\S]{6,20}$/).required();
const email = joi.string().email().required();
const nickname = joi.string().trim().min(1).max(30).required();
const avatar = joi.string().allow('', null).optional();
const username = joi.string().trim().min(1).max(50).required();

exports.reg_login_schema = {
    body: {
        account,
        password,
    },
};

exports.reg_reg_schema = {
    body: {
        account,
        password,
        email,
    },
};

exports.admin_login_schema = {
    body: {
        username,
        password,
    },
};

exports.update_userinfo_schema = {
    body: {
        nickname,
        email,
    },
};

exports.update_password_schema = {
    body: {
        oldPwd: password,
        newPwd: joi.not(joi.ref('oldPwd')).concat(password),
    },
};

exports.update_avatar_schema = {
    body: {
        avatar,
    },
};
