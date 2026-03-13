import { Worker } from 'bullmq';
import { ConnectionOptions  } from 'bullmq';
import prisma from '../prisma';

const connection: ConnectionOptions = {
    url: process.env.REDIS_URL,
};

//  This worker picks up jobs and queue and writes the DB

export function startLoggerWorker() {
    const worker = new Worker(
        'request-logs',
        async(job) => {
            const {
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
            } = job.data;

            await prisma.requestLog.create({
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
        },
        {
            connection,
        }
    );

    worker.on('failed', (job, err) => {
        console.error(`Log job failed for job ${job?.id}:`, err.message);
    });

    console.log('Logger worker started');
    return worker;
}