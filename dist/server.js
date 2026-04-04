"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dns_1 = __importDefault(require("dns"));
dns_1.default.setDefaultResultOrder("ipv4first");
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
require("./types");
const keys_routes_1 = __importDefault(require("./routes/keys.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const logger_worker_1 = require("./workers/logger.worker");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./swagger");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Start background worker
(0, logger_worker_1.startLoggerWorker)();
// Routes
app.use("/v1/chat", chat_routes_1.default);
app.use("/v1/keys", keys_routes_1.default);
app.use("/v1/analytics", analytics_routes_1.default);
// Swagger docs
app.use("/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", message: "NeuralProxy is running" });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`NeuralProxy server running on port ${PORT}`);
});
