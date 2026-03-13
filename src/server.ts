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

dotenv.config();

const app = express();
app.use(express.json());

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`NeuralProxy server running on port ${PORT}`);
});

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