import express from "express";
import dotenv from "dotenv";
import "./types";

import keysRouter from "./routes/keys.routes";
import { authMiddleware } from "./middleware/auth.middleware";

dotenv.config();

const app = express();
app.use(express.json());

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