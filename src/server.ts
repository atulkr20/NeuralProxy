import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import express from "express";
import dotenv from "dotenv";
import "./types";

import keysRouter from "./routes/keys.routes";
import analyticsRouter from "./routes/analytics.routes";
import chatRouter from "./routes/chat.routes";
import { startLoggerWorker } from "./workers/logger.worker";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";

dotenv.config();

const app = express();
app.use(express.json());

// Start background worker
startLoggerWorker();

// Routes
app.use("/v1/chat", chatRouter);
app.use("/v1/keys", keysRouter);
app.use("/v1/analytics", analyticsRouter);

// Swagger docs
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      operationsSorter: (a: any, b: any) => {
      if (a.get("path") === "/v1/keys" && a.get("method") === "post") {
        return -1;
      }

      if (b.get("path") === "/v1/keys" && b.get("method") === "post") {
        return 1;
      }

      return 0;
      },
    },
  })
);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "NeuralProxy is running" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`NeuralProxy server running on port ${PORT}`);
});