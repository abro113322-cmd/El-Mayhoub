import { FinancialSnapshot } from "@/lib/ai/analytics/overview";

export function analyzeGoals(
  snapshot: FinancialSnapshot
) {
  if (snapshot.savings.totalTarget === 0) {
    return {
      status: "no-goals",
      message:
        "You don't have any savings goals yet.",
    };
  }

  if (snapshot.savings.progress >= 100) {
    return {
      status: "completed",
      message:
        "Congratulations! You achieved all your savings goals.",
    };
  }

  return {
    status: "in-progress",
    message: `You have completed ${snapshot.savings.progress}% of your savings goals.`,
  };
}