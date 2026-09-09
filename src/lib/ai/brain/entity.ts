export type Entity =
  | "transaction"
  | "budget"
  | "saving"
  | "general";

const ENTITIES: Record<Entity, string[]> = {
  transaction: [
    "مصروف",
    "معاملة",
    "عملية",
    "دخل",
    "expense",
    "income",
    "transaction",
  ],

  budget: [
    "ميزانية",
    "budget",
  ],

  saving: [
    "ادخار",
    "هدف",
    "توفير",
    "saving",
  ],

  general: [],
};

export function detectEntity(
  message: string
): Entity {
  const normalized =
    message.toLowerCase();

  for (const [entity, words] of Object.entries(
    ENTITIES
  )) {
    if (
      words.some((word) =>
        normalized.includes(word)
      )
    ) {
      return entity as Entity;
    }
  }

  return "general";
}