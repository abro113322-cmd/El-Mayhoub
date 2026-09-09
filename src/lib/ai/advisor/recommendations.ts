import { FinancialAnalysis } from "./analysis";
import { FinancialSnapshot } from "@/lib/ai/analytics/overview";

export function generateRecommendations(
  analysis: FinancialAnalysis,
  snapshot: FinancialSnapshot
) {
  const recommendations: string[] = [];

  if (snapshot.balance <= 0) {
    recommendations.push(
      "Reduce your monthly expenses or increase your income."
    );
  }

  if (snapshot.budgets.usage >= 90) {
    recommendations.push(
      "Your budget is almost exhausted. Avoid unnecessary spending."
    );
  }

  if (snapshot.savings.progress < 25) {
    recommendations.push(
      "Increase your monthly savings contribution."
    );
  }

  if (snapshot.topCategory) {
    recommendations.push(
      `Review your spending on ${snapshot.topCategory.name}.`
    );
  }

  if (
    analysis.warnings.length === 0
  ) {
    recommendations.push(
      "Keep following your current financial plan."
    );
  }

  return recommendations;
}