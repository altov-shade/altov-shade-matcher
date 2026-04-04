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

type GeminiShadeResult = {
  bestMatch: string;
  reason: string;
};

const extractShadeFromText = (text: string): GeminiShadeResult | null => {
  const cleaned = text
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);

    if (parsed?.bestMatch && ALLOWED_SHADES.includes(parsed.bestMatch)) {
      return {
        bestMatch: parsed.bestMatch,
        reason: parsed.reason || "",
      };
    }
  } catch {
    // fall through
  }

  const shadeMatch = cleaned.match(/\bHF(?:5|6|7|8|9|10|11|12|13|14|15)\b/i);

  if (shadeMatch) {
    return {
      bestMatch: shadeMatch[0].toUpperCase(),
      reason: "",
    };
  }

  return null;
};

export const analyzeSkinTone = async (
  base64Image: string,
  mimeType: string
): Promise<GeminiShadeResult | null> => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      console.error("Missing Gemini API key");
      return null;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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

Return JSON in this format:
{
  "bestMatch": "HF12",
  "reason": "short explanation"
}

If you cannot provide JSON, return only the shade code like HF12.
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

    if (!rawText) {
      console.error("Gemini returned no text:", data);
      return null;
    }

    const result = extractShadeFromText(rawText);

    if (!result) {
      console.error("Could not parse Gemini response:", rawText);
      return null;
    }

    return result;
  } catch (error) {
    console.error("Shade analysis failed:", error);
    return null;
  }
};
