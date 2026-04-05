import type { ShadeLabel, ShadeResult } from "../lib/shades";
import { getNeighborShades } from "../lib/shades";

type BackendResponse = {
  predicted_label: ShadeLabel;
  confidence?: number;
};

const API_URL = import.meta.env.VITE_SHADE_API_URL || "/api/predict";

export async function analyzeShade(file: File): Promise<ShadeResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(API_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Prediction failed");
  }

  const data: BackendResponse = await response.json();

  if (!data.predicted_label) {
    throw new Error("No predicted label returned from API");
  }

  const result = getNeighborShades(data.predicted_label);
  result.confidence =
    typeof data.confidence === "number" ? data.confidence : 0;

  return result;
}
