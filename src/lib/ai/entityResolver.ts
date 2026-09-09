import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function resolveEntity(
  userMessage: string,
  entities: string[],
  entityType: string
) {
  if (entities.length === 0) {
    return null;
  }

  if (entities.length === 1) {
    return entities[0];
  }

  const prompt = `
أنت مساعد ذكي.

المستخدم كتب:

"${userMessage}"

نوع العنصر:

${entityType}

العناصر الموجودة:

${entities.map((e, i) => `${i + 1}. ${e}`).join("\n")}

اختر أقرب عنصر يقصده المستخدم.

أرجع الاسم فقط.

بدون شرح.
`;

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return result.text?.trim() ?? "";
}