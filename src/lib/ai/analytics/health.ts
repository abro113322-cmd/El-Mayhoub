import { getFinancialSnapshot } from "./overview";

export interface FinancialHealth {
  score: number;
  status:
    | "excellent"
    | "good"
    | "fair"
    | "poor";
}

export async function calculateFinancialHealth(
  userId: string
): Promise<FinancialHealth> {
  const snapshot =
    await getFinancialSnapshot(userId);

  let score = 100;

  if (snapshot.expenses > snapshot.income) {
    score -= 40;
  }

  if (snapshot.budgets.usage > 100) {
    score -= 20;
  }

  if (snapshot.savings.progress < 25) {
    score -= 20;
  }

  if (snapshot.balance <= 0) {
    score -= 20;
  }

  score = Math.max(0, score);

  let status: FinancialHealth["status"];

  if (score >= 85) {
    status = "excellent";
  } else if (score >= 70) {
    status = "good";
  } else if (score >= 50) {
    status = "fair";
  } else {
    status = "poor";
  }

  return {
    score,
    status,
  };
}