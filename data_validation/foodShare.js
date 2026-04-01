const joi = require('joi');

exports.add_food_schema = {
    body: {
        title: joi.string().trim().max(20).required(),
        description: joi.string().trim().max(370).required(),
        location: joi.string().allow('').max(50).default(''),
        categoryid: joi.alternatives().try(joi.number(), joi.string()).required(),
        tags: joi.alternatives().try(joi.string(), joi.array().items(joi.string())).optional(),
        images: joi.alternatives().try(joi.string(), joi.array().items(joi.string())).optional(),
        videourl: joi.string().allow('', null).optional(),
        videocover: joi.string().allow('', null).optional(),
    },
};
