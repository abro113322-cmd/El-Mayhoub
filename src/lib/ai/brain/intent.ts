export type Intent =
  | "add"
  | "update"
  | "delete"
  | "view"
  | "unknown";

const INTENTS: Record<Intent, string[]> = {
  add: [
    "اعمل",
    "أعمل",
    "اضف",
    "أضف",
    "انشئ",
    "أنشئ",
    "سجل",
    "حط",
  ],

  update: [
    "عدل",
    "غير",
    "زود",
    "قلل",
    "حدث",
  ],

  delete: [
    "احذف",
    "امسح",
    "شيل",
    "الغى",
    "إلغاء",
  ],

  view: [
    "اعرض",
    "وريني",
    "ورينى",
    "اظهر",
    "أظهر",
    "هات",
  ],

  unknown: [],
};

export function detectIntent(
  message: string
): Intent {
  const normalized = message.toLowerCase();

  for (const [intent, words] of Object.entries(
    INTENTS
  )) {
    if (
      words.some((word) =>
        normalized.includes(word)
      )
    ) {
      return intent as Intent;
    }
  }

  return "unknown";
}