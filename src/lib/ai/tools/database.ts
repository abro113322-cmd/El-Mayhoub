export async function executeDatabaseTool(
  action: string
) {
  const mutationRequiresDashboard = {
    success: false,
    message:
      "For your safety, updates and deletions must be completed from the dashboard where you can select the exact record.",
  };

  switch (action) {
    case "add_transaction":
    case "update_transaction":
    case "delete_transaction":
    case "add_budget":
    case "update_budget":
    case "delete_budget":
    case "add_saving":
    case "update_saving":
    case "delete_saving":
      return mutationRequiresDashboard;

    default:
      return null;
  }
}
