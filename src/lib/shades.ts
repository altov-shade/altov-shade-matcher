export const SHADE_ORDER = [
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
] as const;

export type ShadeLabel = (typeof SHADE_ORDER)[number];

export type ShadeResult = {
  bestMatch: ShadeLabel;
  confidence: number;
  darker: ShadeLabel | null;
  lighter: ShadeLabel | null;
  top3: ShadeLabel[];
};

export function getNeighborShades(bestMatch: ShadeLabel): ShadeResult {
  const index = SHADE_ORDER.indexOf(bestMatch);

  if (index === -1) {
    throw new Error(`Invalid shade label: ${bestMatch}`);
  }

  const darker = index > 0 ? SHADE_ORDER[index - 1] : null;
  const lighter = index < SHADE_ORDER.length - 1 ? SHADE_ORDER[index + 1] : null;

  const top3 = [darker, bestMatch, lighter].filter(Boolean) as ShadeLabel[];

  return {
    bestMatch,
    confidence: 0,
    darker,
    lighter,
    top3,
  };
}
