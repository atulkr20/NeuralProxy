"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logQueue = void 0;
const bullmq_1 = require("bullmq");
// Redis connection config from bullmq
const connection = {
    url: process.env.REDIS_URL,
};
exports.logQueue = new bullmq_1.Queue('request-logs', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
    },
});
