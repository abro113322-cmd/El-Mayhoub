export interface DictionaryEntry {
  canonical: string;
  type:
    | "saving"
    | "budget"
    | "transaction"
    | "category"
    | "general";
  aliases: string[];
}

export const DICTIONARY: DictionaryEntry[] = [
  {
    canonical: "car",
    type: "saving",
    aliases: [
      "car",
      "cars",
      "vehicle",
      "auto",

      "عربية",
      "العربية",
      "عربيتي",
      "عربيتى",
      "سيارة",
      "السيارة",
      "مركبة",
    ],
  },

  {
    canonical: "salary",
    type: "transaction",
    aliases: [
      "salary",
      "income",
      "paycheck",

      "مرتب",
      "المرتب",
      "راتب",
      "الراتب",
      "قبض",
      "الدخل",
    ],
  },

  {
    canonical: "food",
    type: "category",
    aliases: [
      "food",
      "meal",
      "restaurant",

      "اكل",
      "أكل",
      "طعام",
      "مطعم",
      "وجبة",
      "غداء",
      "عشاء",
    ],
  },

  {
    canonical: "fuel",
    type: "category",
    aliases: [
      "fuel",
      "gas",
      "gasoline",
      "petrol",

      "بنزين",
      "وقود",
      "تفويل",
    ],
  },
];

export function findDictionaryEntry(
  word: string
): DictionaryEntry | null {
  const normalized = word
    .trim()
    .toLowerCase();

  return (
    DICTIONARY.find((entry) =>
      entry.aliases.some(
        (alias) =>
          alias.toLowerCase() === normalized
      )
    ) ?? null
  );
}