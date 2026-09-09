import {
  addDictionaryAlias,
  increaseConfidence,
  getUserDictionary,
} from "./services/dictionary";

export async function learnAlias(
  userId: string,
  canonical: string,
  alias: string
) {
  const dictionary =
    await getUserDictionary(userId);

  const exists = dictionary.find(
    (item: any) =>
      item.alias.toLowerCase() ===
      alias.toLowerCase()
  );

  if (exists) {
    await increaseConfidence(
      userId,
      alias
    );

    return;
  }

  await addDictionaryAlias(
    userId,
    canonical,
    alias
  );
}