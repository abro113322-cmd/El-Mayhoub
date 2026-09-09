import {
  getConversationHistory,
  saveConversationMessage,
} from "./services/conversation";

export async function loadConversation(
  userId: string
) {
  return await getConversationHistory(
    userId,
    10
  );
}

export async function addUserMessage(
  userId: string,
  message: string
) {
  await saveConversationMessage(
    userId,
    "user",
    message
  );
}

export async function addAssistantMessage(
  userId: string,
  message: string
) {
  await saveConversationMessage(
    userId,
    "assistant",
    message
  );
}

export async function buildConversation(
  userId: string
) {
  return await loadConversation(userId);
}