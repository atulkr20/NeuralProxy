import { Request, Response, NextFunction } from "express";
import { isOverBudget } from "../services/cost.service";

export async function budgetMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const { id, monthlyBudget } = req.apiKey;
    const overBudget = await isOverBudget(id, Number(monthlyBudget));

    if(overBudget) {
        res.status(402).json({
            error: 'Monthly budget exceeded. Upgrade your plan or wait until next month.',
            monthlyBudget,
        });
        return;
    }

    next();
}