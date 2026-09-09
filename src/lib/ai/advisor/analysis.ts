import { FinancialSnapshot } from "@/lib/ai/analytics/overview";

export interface FinancialAnalysis {
  positives: string[];
  warnings: string[];
  summary: string;
}

export function analyzeFinancialSnapshot(
  snapshot: FinancialSnapshot
): FinancialAnalysis {
  const positives: string[] = [];
  const warnings: string[] = [];

  if (snapshot.balance > 0) {
    positives.push(
      "Your monthly balance is positive."
    );
  } else {
    warnings.push(
      "Your expenses exceed your income."
    );
  }

  if (snapshot.budgets.usage > 90) {
    warnings.push(
      "Your budget is close to its limit."
    );
  }

  if (snapshot.savings.progress >= 50) {
    positives.push(
      "You are making good progress toward your savings goals."
    );
  } else {
    warnings.push(
      "Your savings progress is lower than expected."
    );
  }

  if (snapshot.topCategory) {
    warnings.push(
      `Your highest spending category is ${snapshot.topCategory.name}.`
    );
  }

  return {
    positives,
    warnings,
    summary:
      warnings.length === 0
        ? "Your financial status looks healthy."
        : "Your financial status needs attention.",
  };
}