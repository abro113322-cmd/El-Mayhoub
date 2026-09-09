import { IDENTITY_PROMPT } from "./identity";
import { RULES_PROMPT } from "./rules";
import { ACTIONS_PROMPT } from "./actions";

export const SYSTEM_PROMPT = `
${IDENTITY_PROMPT}

${RULES_PROMPT}

${ACTIONS_PROMPT}
`;