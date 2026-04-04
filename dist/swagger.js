"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "NeuralProxy API",
            version: "1.0.0",
            description: "A production-grade AI Gateway that proxies requests to multiple LLM providers with automatic failover, rate limiting, prompt caching, and cost tracking.",
        },
        tags: [
            {
                name: "Chat",
                description: "Primary AI inference endpoints",
            },
            {
                name: "Keys",
                description: "API key management endpoints",
            },
            {
                name: "Analytics",
                description: "Usage, cost, cache, and provider insights",
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    description: "Enter your API key (np_...)",
                },
            },
        },
        security: [{ BearerAuth: [] }],
    },
    apis: ["./src/routes/*.ts"],
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(options);
