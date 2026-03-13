import prisma from '../prisma';

export async function calculateCost(
    provider: string,
    inputTokens: number,
    outputTokens: number
): Promise<number> {

    // Load provider pricing from DB
    const config = await prisma.providerConfig.findUnique({
        where: { provider },
    });

    if(!config) {
        return 0;
    }

    const inputCost = (inputTokens / 1000) * Number(config.costPer1kInput);
    const outputCost = (outputTokens / 1000) * Number (config.costPer1kOutput);

    return inputCost + outputCost;
}

// Check if the api key has exceeded monthly budget 

export async function isOverBudget(apiKeyId: string, monthlyBudget: number): Promise<boolean> {
    // Get start of current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    // Sum all costa for this key for this month
    const result = await prisma.requestLog.aggregate({
        where: {
            apiKeyId, 
            createdAt: { gte: startOfMonth },
            status: 'success',
        },
        _sum: {
            costUsd: true,
        },
    });
    const totalSpent = Number(result._sum.costUsd || 0);

    console.log(`Key ${apiKeyId} spent $${totalSpent} of $${monthlyBudget} this month`);

    return totalSpent >= monthlyBudget;

}