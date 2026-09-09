export function normalizeArabic(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[ؤئ]/g, "ء")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/\s+/g, " ");
}

export function removePrefixes(text: string) {
  return text
    .replace(/^ال/, "")
    .replace(/^هدف\s/, "")
    .replace(/^ميزانيه\s/, "")
    .replace(/^ميزانية\s/, "")
    .replace(/^حساب\s/, "")
    .replace(/^مصروف\s/, "")
    .replace(/^دخل\s/, "")
    .trim();
}

export function cleanText(text: string) {
  return removePrefixes(
    normalizeArabic(text)
  );
}

export function tokenize(text: string) {
  return cleanText(text)
    .split(" ")
    .filter(Boolean);
}

export function similarity(
  first: string,
  second: string
) {
  const a = tokenize(first);
  const b = tokenize(second);

  if (!a.length || !b.length) {
    return 0;
  }

  let matched = 0;

  for (const word of a) {
    if (b.includes(word)) {
      matched++;
    }
  }

  return matched / Math.max(a.length, b.length);
}