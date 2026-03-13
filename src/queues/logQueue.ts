import { Queue } from 'bullmq';
import { ConnectionOptions } from 'bullmq';

// Redis connection config from bullmq
const connection: ConnectionOptions = {
    url: process.env.REDIS_URL,
};

export const logQueue = new Queue('request-logs', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
    },
});