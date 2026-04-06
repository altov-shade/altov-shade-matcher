import sharp from "sharp";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  }
};

// HF5 = darkest (score 200), HF15 = lightest (score 0)
// Score: high = dark skin, low = light skin
const SHADE_CATALOG = [
  { shadeCode: "HF5",  score: 200, productImage: "/images/HF5.png" },
  { shadeCode: "HF6",  score: 180, productImage: "/images/HF6.png" },
  { shadeCode: "HF7",  score: 160, productImage: "/images/HF7.png" },
  { shadeCode: "HF8",  score: 140, productImage: "/images/HF8.png" },
  { shadeCode: "HF9",  score: 120, productImage: "/images/HF9.png" },
  { shadeCode: "HF10", score: 100, productImage: "/images/HF10.png" },
  { shadeCode: "HF11", score: 80,  productImage: "/images/HF11.png" },
  { shadeCode: "HF12", score: 60,  productImage: "/images/HF12.png" },
  { shadeCode: "HF13", score: 40,  productImage: "/images/HF13.png" },
  { shadeCode: "HF14", score: 20,  productImage: "/images/HF14.png" },
  { shadeCode: "HF15", score: 0,   productImage: "/images/HF15.png" }
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    const rawImage = body.imageBase64 || body.image || body.previewUrl || null;

    if (!rawImage || typeof rawImage !== "string") {
      return res.status(400).json({ error: "No image provided" });
    }

    const matches = rawImage.match(/^data:(image\/png|image\/jpeg|image\/jpg);base64,/i);
    if (!matches) return res.status(400).json({ error: "Only PNG and JPEG supported" });

    const base64 = rawImage.split(",")[1];
    if (!base64) return res.status(400).json({ error: "Invalid image data" });

    const buffer = Buffer.from(base64, "base64");
    const stats = await getCheekStats(buffer);
    const score = buildShadeScore(stats);
    const index = findClosestShadeIndex(score);

    const selected = SHADE_CATALOG[index];
    const minusOne = index > 0 ? SHADE_CATALOG[index - 1] : null;
    const plusOne  = index < SHADE_CATALOG.length - 1 ? SHADE_CATALOG[index + 1] : null;

    return res.status(200).json({
      success: true,
      match: selected,
      range: { minusOne, selected, plusOne },
      debug: {
        medianLuma: stats.medianLuma,
        medianWarmth: stats.medianWarmth,
        medianChroma: stats.medianChroma,
        normalizedLuma: stats.normalizedLuma,
        score
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Prediction failed" });
  }
}

async function getCheekStats(buffer) {
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize(420, 420, { fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  if (!width || !height) {
    return { medianLuma: 125, medianWarmth: 20, medianChroma: 25, normalizedLuma: 125 };
  }

  // Forehead region: used only for lighting normalization reference
  const foreheadRegion = {
    x1: Math.floor(width * 0.35), x2: Math.floor(width * 0.65),
    y1: Math.floor(height * 0.10), y2: Math.floor(height * 0.28)
  };

  // Left and right cheek windows
  const cheekRegions = [
    {
      x1: Math.floor(width * 0.22), x2: Math.floor(width * 0.38),
      y1: Math.floor(height * 0.50), y2: Math.floor(height * 0.68)
    },
    {
      x1: Math.floor(width * 0.62), x2: Math.floor(width * 0.78),
      y1: Math.floor(height * 0.50), y2: Math.floor(height * 0.68)
    }
  ];

  function isSkinLike(r, g, b, luma, warmth, chroma) {
    if (r > 245 && g > 245 && b > 245) return false; // blown highlight
    if (luma < 30 || luma > 240) return false;        // too dark or too bright
    if (chroma < 6 || chroma > 100) return false;     // gray or oversaturated
    if (r < g) return false;                           // greenish — not skin
    if (g < b - 20) return false;                      // too blue — not skin
    if (warmth < 2) return false;                      // cool — wall/background
    return true;
  }

  const cheekSamples = [];
  const foreheadLumas = [];

  // Sample forehead for lighting reference
  for (let y = foreheadRegion.y1; y < foreheadRegion.y2; y += 2) {
    for (let x = foreheadRegion.x1; x < foreheadRegion.x2; x += 2) {
      const idx = (y * width + x) * channels;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      if (r === undefined) continue;
      const luma   = 0.299 * r + 0.587 * g + 0.114 * b;
      const warmth = r - b;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      if (isSkinLike(r, g, b, luma, warmth, chroma)) {
        foreheadLumas.push(luma);
      }
    }
  }

  // Sample cheeks for primary match data
  for (const region of cheekRegions) {
    for (let y = region.y1; y < region.y2; y += 2) {
      for (let x = region.x1; x < region.x2; x += 2) {
        const idx = (y * width + x) * channels;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        if (r === undefined) continue;
        const luma   = 0.299 * r + 0.587 * g + 0.114 * b;
        const warmth = r - b;
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);
        if (isSkinLike(r, g, b, luma, warmth, chroma)) {
          cheekSamples.push({ luma, warmth, chroma });
        }
      }
    }
  }

  if (!cheekSamples.length) {
    return { medianLuma: 125, medianWarmth: 20, medianChroma: 25, normalizedLuma: 125 };
  }

  const sortedLuma   = cheekSamples.map(p => p.luma).sort((a, b) => a - b);
  const sortedWarmth = cheekSamples.map(p => p.warmth).sort((a, b) => a - b);
  const sortedChroma = cheekSamples.map(p => p.chroma).sort((a, b) => a - b);

  const medianLuma   = median(sortedLuma);
  const medianWarmth = median(sortedWarmth);
  const medianChroma = median(sortedChroma);

  // Lighting normalization using forehead reference.
  // If forehead reads much brighter than cheeks, scene is overlit —
  // skin registers lighter than it truly is, so pull luma down.
  let normalizedLuma = medianLuma;
  if (foreheadLumas.length > 10) {
    const foreheadMedian = median(foreheadLumas.sort((a, b) => a - b));
    const ratio = foreheadMedian / medianLuma;
    if (ratio > 1.15) {
      const correction = Math.min((ratio - 1.15) * 40, 20);
      normalizedLuma = medianLuma - correction;
    }
  }

  return { medianLuma, medianWarmth, medianChroma, normalizedLuma };
}

function median(arr) {
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
}

function buildShadeScore(stats) {
  // HF5 (darkest) = score 200, HF15 (lightest) = score 0
  // dark skin (low luma) → high score → HF5
  // light skin (high luma) → low score → HF15

  const lumaMin = 40;   // darkest realistic cheek luma
  const lumaMax = 220;  // lightest realistic cheek luma
  const luma = Math.max(lumaMin, Math.min(lumaMax, stats.normalizedLuma));

  // Linear inversion: luma 40 → score 200, luma 220 → score 0
  let score = ((lumaMax - luma) / (lumaMax - lumaMin)) * 200;

  // Warmth nudge: warm undertones tend to need a slightly deeper shade
  const warmth = stats.medianWarmth;
  if (warmth > 50) score += 6;
  else if (warmth < 12) score -= 6;

  // Chroma nudge: vivid/saturated skin reads slightly deeper
  const chroma = stats.medianChroma;
  if (chroma > 45) score += 4;
  else if (chroma < 14) score -= 4;

  return Math.max(0, Math.min(200, score));
}

function findClosestShadeIndex(score) {
  let closest = 0;
  let minDiff = Math.abs(score - SHADE_CATALOG[0].score);

  for (let i = 1; i < SHADE_CATALOG.length; i++) {
    const diff = Math.abs(score - SHADE_CATALOG[i].score);
    if (diff < minDiff) {
      minDiff = diff;
      closest = i;
    }
  }

  return closest;
}
