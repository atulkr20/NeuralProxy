"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
const redis = (0, redis_1.createClient)({
    url: process.env.REDIS_URL,
});
redis.on('error', (err) => {
    console.error('Redis error:', err);
});
void redis.connect().catch((err) => {
    console.error('Redis connect failed:', err);
});
exports.default = redis;
