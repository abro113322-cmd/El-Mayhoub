import {
  getFinancialSnapshot,
} from "@/lib/ai/analytics";

export async function executeAnalyticsTool(
  action: string,
  userId: string
) {
  switch (action) {
    case "get_financial_snapshot":
      return await getFinancialSnapshot(
        userId
      );

    case "get_monthly_summary":
      return await getFinancialSnapshot(
        userId
      );

    default:
      return null;
  }
}