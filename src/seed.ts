import prisma from "./prisma";

async function seed() {
  // Delete existing configs first
  await prisma.providerConfig.deleteMany();

  // Insert provider configs with priority order
  await prisma.providerConfig.createMany({
    data: [
      {
        provider: "openai",
        priority: 1,
        isEnabled: true,
        costPer1kInput: 0.000001,
        costPer1kOutput: 0.000002,
      },
      {
        provider: "gemini",
        priority: 2,
        isEnabled: true,
        costPer1kInput: 0.000001,
        costPer1kOutput: 0.000002,
      },
      {
        provider: "anthropic",
        priority: 3,
        isEnabled: true,
        costPer1kInput: 0.000001,
        costPer1kOutput: 0.000002,
      },
    ],
  });

  console.log("Providers seeded successfully");
}

seed();