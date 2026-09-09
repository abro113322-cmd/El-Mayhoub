import { getUserDictionary } from "./services/dictionary";
import { getLastEntity } from "./services/memory";
import { loadProfile, AIProfile } from "./profile";

export interface AIContext {
  profile: AIProfile;

  dictionary: any[];

  memory: {
    saving: any | null;
    budget: any | null;
    transaction: any | null;
  };
}

export async function buildContext(
  userId: string
): Promise<AIContext> {
  const [
    profile,
    dictionary,
    saving,
    budget,
    transaction,
  ] = await Promise.all([
    loadProfile(userId),

    getUserDictionary(userId),

    getLastEntity(userId, "saving"),

    getLastEntity(userId, "budget"),

    getLastEntity(userId, "transaction"),
  ]);

  return {
    profile,

    dictionary,

    memory: {
      saving,
      budget,
      transaction,
    },
  };
}