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