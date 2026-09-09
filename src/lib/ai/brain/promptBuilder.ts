import { SYSTEM_PROMPT } from "@/lib/ai/prompts";

import { AIContext } from "./context";

interface BuildPromptOptions {
  userMessage: string;
  context: AIContext;
  conversation: {
    role: string;
    content: string;
  }[];
}

export function buildPrompt({
  userMessage,
  context,
  conversation,
}: BuildPromptOptions) {
  const history = conversation.length
    ? conversation
        .map(
          (message) =>
            `${message.role.toUpperCase()}:\n${message.content}`
        )
        .join("\n\n")
    : "No previous conversation.";

  return `
${SYSTEM_PROMPT}

========================================
USER PROFILE
========================================

${JSON.stringify(
  context.profile,
  null,
  2
)}

========================================
USER MEMORY
========================================

${JSON.stringify(
  context.memory,
  null,
  2
)}

========================================
USER DICTIONARY
========================================

${JSON.stringify(
  context.dictionary,
  null,
  2
)}

========================================
CONVERSATION HISTORY
========================================

${history}

========================================
CURRENT MESSAGE
========================================

${userMessage}
`;
}