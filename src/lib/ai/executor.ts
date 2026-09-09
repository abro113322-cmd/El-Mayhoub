import { executeTool } from "@/lib/ai/tools";

interface AIAction {
  action: string;
  [key: string]: unknown;
}

export async function executeAIAction(
  aiResponse: string,
  userId: string
) {
  let data: AIAction;

  try {
    data = JSON.parse(aiResponse);
  } catch {
    return {
      success: true,
      message: aiResponse,
    };
  }

  if (typeof data.action !== "string" || !data.action) {
    return {
      success: true,
      message: aiResponse,
    };
  }

  const result = await executeTool(
    data.action,
    userId
  );

  if (result === null) {
    return {
      success: false,
      message: `Unknown action: ${data.action}`,
    };
  }

  if (
    typeof result === "object" &&
    "success" in result &&
    "message" in result
  ) {
    return result;
  }

  return {
    success: true,
    message: JSON.stringify(
      result,
      null,
      2
    ),
  };
}