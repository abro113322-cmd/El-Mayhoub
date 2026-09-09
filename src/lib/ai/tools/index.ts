import { executeDatabaseTool } from "./database";
import { executeAnalyticsTool } from "./analytics";
import { executeAdvisorTool } from "./advisor";

export async function executeTool(
  action: string,
  userId: string
) {
  const database =
    await executeDatabaseTool(
      action
    );

  if (database !== null) {
    return database;
  }

  const analytics =
    await executeAnalyticsTool(
      action,
      userId
    );

  if (analytics !== null) {
    return analytics;
  }

  const advisor =
    await executeAdvisorTool(
      action,
      userId
    );

  if (advisor !== null) {
    return advisor;
  }

  throw new Error(
    `Unknown action: ${action}`
  );
}