import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(API_KEY || "");

// Only allowed shades
const ALLOWED_SHADES = [
  "HF5","HF6","HF7","HF8","HF9",
  "HF10","HF11","HF12","HF13","HF14","HF15"
];

export const analyzeSkinTone = async (base64Image: string) => {
  try {
    if (!API_KEY) {
      console.error("Missing Gemini API Key");
      return null;
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const prompt = `
You are AltoV Beauty's foundation shade matching assistant.

Analyze the person's visible skin tone from the uploaded image.

Available shades:
HF5, HF6, HF7, HF8, HF9, HF10, HF11, HF12, HF13, HF14, HF15

Pick EXACTLY ONE best match from this list.

Rules:
- Focus ONLY on skin (forehead, cheeks, jawline)
- Ignore lips, eyes, hair, clothing, and background
- Ignore lighting and shadows as much as possible
- Do NOT go too light due to brightness
- If unsure, go slightly deeper instead of lighter

Return ONLY JSON:
{
  "bestMatch": "HF12",
  "reason": "short explanation"
}
`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image,
        },
      },
    ]);

    const text = result.response.text().trim();

    const cleaned = text
      .replace(/^```json/i, "")
      .replace(/^```/, "")
      .replace(/```$/, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    if (!ALLOWED_SHADES.includes(parsed.bestMatch)) {
      console.warn("Invalid shade returned:", parsed.bestMatch);
      return null;
    }

    return parsed;

  } catch (error) {
    console.error("Shade analysis failed:", error);
    return null;
  }
};
