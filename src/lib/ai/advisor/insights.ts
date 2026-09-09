import { FinancialSnapshot } from "@/lib/ai/analytics/overview";

export function generateInsights(
  snapshot: FinancialSnapshot
) {
  const insights: string[] = [];

  if (snapshot.topCategory) {
    insights.push(
      `Your largest spending category this month is ${snapshot.topCategory.name}.`
    );
  }

  insights.push(
    `Current balance: ${snapshot.balance} ${snapshot.health.status === "poor" ? "(Needs Attention)" : ""}`
  );

  insights.push(
    `Financial health score: ${snapshot.health.score}/100`
  );

  return insights;
}