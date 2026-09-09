import { FinancialSnapshot } from "@/lib/ai/analytics/overview";

export function generateAlerts(
  snapshot: FinancialSnapshot
) {
  const alerts: string[] = [];

  if (snapshot.balance < 0) {
    alerts.push(
      "Warning: Your monthly balance is negative."
    );
  }

  if (snapshot.budgets.usage >= 100) {
    alerts.push(
      "Warning: You have exceeded your budget."
    );
  }

  if (snapshot.savings.progress < 10) {
    alerts.push(
      "Warning: Your savings progress is very low."
    );
  }

  return alerts;
}