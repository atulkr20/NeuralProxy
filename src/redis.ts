import { createClient } from 'redis';

const redis = createClient({
    url: process.env.REDIS_URL,
});

redis.on('error', (err: unknown) => {
    console.error('Redis error:', err);
});

void redis.connect().catch((err: unknown) => {
    console.error('Redis connect failed:', err);
});

export default redis;