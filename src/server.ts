import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import express from "express";
import dotenv from "dotenv";
import "./types";

import keysRouter from "./routes/keys.routes";
import { authMiddleware } from "./middleware/auth.middleware";
import { GroqAdapter } from "./providers/openai.adapter";
import { GeminiAdapter } from "./providers/gemini.adapter";
import { MockAdapter } from "./providers/mock.adapter";

dotenv.config();

const app = express();
app.use(express.json());

// Temporary adapter test route
app.post("/test-adapters", async (req, res) => {
  const { provider } = req.body;

  const testRequest = {
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: "Say hello in one sentence." }],
  };

  try {
    let response;

    if (provider === "openai") {
      const adapter = new GroqAdapter();
      response = await adapter.call(testRequest);
    } else if (provider === "gemini") {
      const adapter = new GeminiAdapter();
      response = await adapter.call(testRequest);
    } else {
      const adapter = new MockAdapter();
      response = await adapter.call(testRequest);
    }

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