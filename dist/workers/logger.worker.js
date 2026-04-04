"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startLoggerWorker = startLoggerWorker;
const bullmq_1 = require("bullmq");
const prisma_1 = __importDefault(require("../prisma"));
const connection = {
    url: process.env.REDIS_URL,
};
//  This worker picks up jobs and queue and writes the DB
function startLoggerWorker() {
    const worker = new bullmq_1.Worker('request-logs', async (job) => {
        const { apiKeyId, provider, model, promptHash, inputTokens, outputTokens, costUsd, latencyMs, cacheHit, fallbackUsed, status, } = job.data;
        await prisma_1.default.requestLog.create({
            data: {
                apiKeyId,
                provider,
                model,
                promptHash,
                inputTokens,
                outputTokens,
                costUsd,
                latencyMs,
                cacheHit,
                fallbackUsed,
                status,
            },
        });
        console.log(`Log written for apiKeyId: ${apiKeyId}`);
    }, {
        connection,
    });
    worker.on('failed', (job, err) => {
        console.error(`Log job failed for job ${job?.id}:`, err.message);
    });
    console.log('Logger worker started');
    return worker;
}
