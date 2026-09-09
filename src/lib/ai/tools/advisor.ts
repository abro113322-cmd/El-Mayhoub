import {
  getFinancialSnapshot,
} from "@/lib/ai/analytics";

import {
  analyzeFinancialSnapshot,
  generateRecommendations,
  generateAlerts,
  generateInsights,
  analyzeGoals,
} from "@/lib/ai/advisor";

export async function executeAdvisorTool(
  action: string,
  userId: string
) {
  const snapshot =
    await getFinancialSnapshot(userId);

  const analysis =
    analyzeFinancialSnapshot(snapshot);

  switch (action) {
    case "get_financial_advice":
      return {
        analysis,
        recommendations:
          generateRecommendations(
            analysis,
            snapshot
          ),
      };

    case "get_financial_alerts":
      return generateAlerts(snapshot);

    case "get_financial_insights":
      return generateInsights(snapshot);

    case "get_goals_analysis":
      return analyzeGoals(snapshot);

    default:
      return null;
  }
}