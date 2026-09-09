import { BUDGET_EXAMPLES } from "./budget";

export function getExamples(
  intent: string
): string {
  switch (intent) {
    case "budget":
      return BUDGET_EXAMPLES;

    default:
      return "";
  }
}