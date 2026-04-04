const ALLOWED_SHADES = [
  "HF5",
  "HF6",
  "HF7",
  "HF8",
  "HF9",
  "HF10",
  "HF11",
  "HF12",
  "HF13",
  "HF14",
  "HF15",
];

export const analyzeSkinTone = async (
  base64Image: string,
  mimeType: string
) => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      console.error("Missing Gemini API key");
      return null;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
You are AltoV Beauty's foundation shade matching assistant.

Analyze the person's visible skin tone from the uploaded image.

Available shades:
HF5, HF6, HF7, HF8, HF9, HF10, HF11, HF12, HF13, HF14, HF15

Pick EXACTLY ONE best match from this list.

Rules:
- Focus only on skin tone
- Pay closest attention to forehead, cheeks, and jawline
- Ignore lips, eyes, hair, clothing, earrings, and background
- Ignore shadows and bright lighting as much as possible
- Do not go too light because of brightness
- If unsure, go slightly deeper instead of lighter

Return ONLY valid JSON:
{
  "bestMatch": "HF12",
  "reason": "short explanation"
}
                  `.trim(),
                },
                {
                  inlineData: {
                    mimeType: mimeType || "image/jpeg",
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return null;
    }

    const data = await response.json();

    const rawText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    const cleaned = rawText
      .replace(/^```json/i, "")
      .replace(/^```/, "")
      .replace(/```$/, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    if (!ALLOWED_SHADES.includes(parsed.bestMatch)) {
      console.warn("Invalid shade returned:", parsed.bestMatch);
      return null;
    }

    return {
      bestMatch: parsed.bestMatch,
      reason: parsed.reason || "",
    };
  } catch (error) {
    console.error("Shade analysis failed:", error);
    return null;
  }
};
