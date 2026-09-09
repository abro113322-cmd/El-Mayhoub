import {
  DictionaryEntry,
  findDictionaryEntry,
} from "./dictionary";

export interface ResolvedEntity {
  original: string;
  canonical: string;
  type: DictionaryEntry["type"];
}

export function resolveWord(
  word: string
): ResolvedEntity | null {
  const entry = findDictionaryEntry(word);

  if (!entry) {
    return null;
  }

  return {
    original: word,
    canonical: entry.canonical,
    type: entry.type,
  };
}