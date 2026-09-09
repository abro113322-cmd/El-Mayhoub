import { detectIntent } from "./intent";
import { detectEntity } from "./entity";
import { resolveWord } from "./resolver";

import {
  buildContext,
  AIContext,
} from "./context";

export interface BrainResult {
  originalMessage: string;
  normalizedMessage: string;

  intent: ReturnType<typeof detectIntent>;

  entity: ReturnType<typeof detectEntity>;

  resolvedEntities: ReturnType<
    typeof resolveWord
  >[];

  context: AIContext;
}

export async function processMessage(
  message: string,
  userId: string
): Promise<BrainResult> {
  const normalizedMessage = message
    .trim()
    .replace(/\s+/g, " ");

  const intent =
    detectIntent(normalizedMessage);

  const entity =
    detectEntity(normalizedMessage);

  const words = normalizedMessage
    .split(" ")
    .filter(Boolean);

  const resolvedEntities = words
    .map((word) => resolveWord(word))
    .filter(
      (
        entity
      ): entity is NonNullable<
        ReturnType<typeof resolveWord>
      > => entity !== null
    );

  const context =
    await buildContext(userId);

  return {
    originalMessage: message,

    normalizedMessage,

    intent,

    entity,

    resolvedEntities,

    context,
  };
}