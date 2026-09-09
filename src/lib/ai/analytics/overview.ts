import {
  getTotalExpenses,
  getTotalIncome,
} from "./transactions";

import { getBudgetSummary } from "./budgets";
import { getSavingsSummary } from "./savings";
import { getCategoryAnalysis } from "./categories";
import { calculateFinancialHealth } from "./health";

export interface FinancialSnapshot {
  income: number;
  expenses: number;
  balance: number;

  budgets: {
    totalBudget: number;
    totalSpent: number;
    remaining: number;
    usage: number;
  };

  savings: {
    totalTarget: number;
    totalCurrent: number;
    remaining: number;
    progress: number;
  };

  categories: {
    name: string;
    amount: number;
  }[];

  topCategory: {
    name: string;
    amount: number;
  } | null;

  health: {
    score: number;
    status:
      | "excellent"
      | "good"
      | "fair"
      | "poor";
  };
}

export async function getFinancialSnapshot(
  userId: string
): Promise<FinancialSnapshot> {
  const [
    income,
    expenses,
    budgetSummary,
    savingsSummary,
    categoryAnalysis,
    health,
  ] = await Promise.all([
    getTotalIncome(userId),
    getTotalExpenses(userId),
    getBudgetSummary(userId),
    getSavingsSummary(userId),
    getCategoryAnalysis(userId),
    calculateFinancialHealth(userId),
  ]);

  return {
    income,

    expenses,

    balance: income - expenses,

    budgets: {
      totalBudget:
        budgetSummary.totalBudget,

      totalSpent:
        budgetSummary.totalSpent,

      remaining:
        budgetSummary.remaining,

      usage:
        budgetSummary.usage,
    },

    savings: {
      totalTarget:
        savingsSummary.totalTarget,

      totalCurrent:
        savingsSummary.totalCurrent,

      remaining:
        savingsSummary.remaining,

      progress:
        savingsSummary.progress,
    },

    categories:
      categoryAnalysis.categories,

    topCategory:
      categoryAnalysis.topCategory,

    health,
  };
}