import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import express from "express";
import dotenv from "dotenv";
import "./types";
import prisma from "./prisma";

import keysRouter from "./routes/keys.routes";
import { authMiddleware } from "./middleware/auth.middleware";
import { routeRequest } from "./services/router.service";
import { rateLimitMiddleware } from "./middleware/rateLimit.middleware";
import { getCachedResponse, setCachedResponse } from "./services/cache.service";
import { startLoggerWorker } from "./workers/logger.worker";
import { logQueue } from "./queues/logQueue";
import { calculateCost } from "./services/cost.service";
import crypto from 'crypto'
import { budgetMiddleware } from "./middleware/budget.middleware";

dotenv.config();

const app = express();
app.use(express.json());
startLoggerWorker();

// Temporary budget test
app.post("/test-budget", authMiddleware, budgetMiddleware, (req, res) => {
  res.json({ message: "Budget check passed", budget: req.apiKey.monthlyBudget });
});


// Temporary log queue test
app.post("/test-logger", authMiddleware, async (req, res) => {
  const { model, messages } = req.body;

  const startTime = Date.now();

  // Call the router
  const response = await routeRequest({ model, messages });

  const latencyMs = Date.now() - startTime;

  // Calculate cost
  const costUsd = await calculateCost(
    response.provider,
    response.inputTokens,
    response.outputTokens
  );

  // Generate prompt hash
  const promptHash = crypto
    .createHash("sha256")
    .update(model + JSON.stringify(messages))
    .digest("hex");

  // Enqueue log job — don't wait for it
  await logQueue.add("log-request", {
    apiKeyId: req.apiKey.id,
    provider: response.provider,
    model,
    promptHash,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    costUsd,
    latencyMs,
    cacheHit: false,
    fallbackUsed: response.fallbackUsed,
    status: "success",
  });

  // Return response immediately without waiting for DB write
  res.json({
    content: response.content,
    provider: response.provider,
    latencyMs,
    costUsd,
  });
});

// Temporary cache test route
app.post("/test-cache", authMiddleware, async (req, res) => {
  const { model, messages } = req.body;

  // Check cache first
  const cached = await getCachedResponse(model, messages);

  if (cached) {
    res.json({
      ...cached,
      cacheHit: true,
    });
    return;
  }

  // Cache miss — call the router
  const response = await routeRequest({ model, messages });

  // Store in cache
  await setCachedResponse(model, messages, response);

  res.json({
    ...response,
    cacheHit: false,
  });
});

//Tamporary rate limit test route
app.post("/test-ratelimit", authMiddleware, rateLimitMiddleware, (req, res) => {
  res.json({
    message: "Request allowed",
    keyName: req.apiKey.name,
    limit: req.apiKey.rateLimit,
  });
});

// Temporary router test route
app.post("/test-router", async (req, res) => {
  const { provider } = req.body;

  try {
    const response = await routeRequest(
      {
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: "Say hello in one sentence." }],
      },
      provider // optional preferred provider
    );

    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "NeuralProxy is running" });
});

// Temporary test route
app.get("/test-auth", authMiddleware, (req, res) => {
  res.json({ message: "Auth works!", keyName: req.apiKey.name });
});

// Routes
app.use("/v1/keys", keysRouter);
app.get("/debug/keys", async (req, res) => {
  const keys = await prisma.apiKey.findMany({
    select: {
      id: true,
      name: true,
      rateLimit: true,
    },
  });
  res.json(keys);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`NeuralProxy server running on port ${PORT}`);
});

