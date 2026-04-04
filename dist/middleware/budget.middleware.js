"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.budgetMiddleware = budgetMiddleware;
const cost_service_1 = require("../services/cost.service");
async function budgetMiddleware(req, res, next) {
    const { id, monthlyBudget } = req.apiKey;
    const overBudget = await (0, cost_service_1.isOverBudget)(id, Number(monthlyBudget));
    if (overBudget) {
        res.status(402).json({
            error: 'Monthly budget exceeded. Upgrade your plan or wait until next month.',
            monthlyBudget,
        });
        return;
    }
    next();
}
