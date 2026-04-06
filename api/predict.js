import sharp from "sharp";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  }
};

const SHADE_CATALOG = [
  { shadeCode: "HF5", score: 200, productImage: "/images/HF5.png" },
  { shadeCode: "HF6", score: 182, productImage: "/images/HF6.png" },
  { shadeCode: "HF7", score: 164, productImage: "/images/HF7.png" },
  { shadeCode: "HF8", score: 146, productImage: "/images/HF8.png" },
  { shadeCode: "HF9", score: 128, productImage: "/images/HF9.png" },
  { shadeCode: "HF10", score: 110, productImage: "/images/HF10.png" },
  { shadeCode: "HF11", score: 92, productImage: "/images/HF11.png" },
  { shadeCode: "HF12", score: 76, productImage: "/images/HF12.png" },
  { shadeCode: "HF13", score: 60, productImage: "/images/HF13.png" },
  { shadeCode: "HF14", score: 44, productImage: "/images/HF14.png" },
  { shadeCode: "HF15", score: 28, productImage: "/images/HF15.png" }
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body || {};

    const rawImage =
      body.imageBase64 ||
      body.image ||
      body.previewUrl ||
      null;

    if (!rawImage || typeof rawImage !== "string") {
      return res.status(400).json({ error: "No image provided" });
    }

    const matches = rawImage.match(/^data:(image\/png|image\/jpeg|image\/jpg);base64,/i);

    if (!matches) {
      return res.status(400).json({ error: "Only PNG and JPEG supported" });
    }

    const base64 = rawImage.split(",")[1];
    if (!base64) {
      return res.status(400).json({ error: "Invalid image data" });
    }

    const buffer = Buffer.from(base64, "base64");

    const stats = await getCheekStats(buffer);
    const score = buildShadeScore(stats);
    const index = findClosestShadeIndex(score);

    const selected = SHADE_CATALOG[index];
    const minusOne = index > 0 ? SHADE_CATALOG[index - 1] : null;
    const plusOne = index < SHADE_CATALOG.length - 1 ? SHADE_CATALOG[index + 1] : null;

    return res.status(200).json({
      success: true,
      match: selected,
      range: {
        minusOne,
        selected,
        plusOne
      },
      debug: {
        medianLuma: stats.medianLuma,
        medianWarmth: stats.medianWarmth,
        medianChroma: stats.medianChroma,
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

  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  if (!width || !height) {
    return {
      medianLuma: 125,
      medianWarmth: 20,
      medianChroma: 25
    };
  }

  // Narrower, lower cheek windows to avoid forehead, hair, lips, and background spill
  const regions = [
    {
      x1: Math.floor(width * 0.24),
      x2: Math.floor(width * 0.36),
      y1: Math.floor(height * 0.52),
      y2: Math.floor(height * 0.68)
    },
    {
      x1: Math.floor(width * 0.64),
      x2: Math.floor(width * 0.76),
      y1: Math.floor(height * 0.52),
      y2: Math.floor(height * 0.68)
    }
  ];

  const samples = [];

  for (const region of regions) {
    for (let y = region.y1; y < region.y2; y += 2) {
      for (let x = region.x1; x < region.x2; x += 2) {
        const idx = (y * width + x) * channels;

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        if (r === undefined || g === undefined || b === undefined) continue;

        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        const warmth = r - b;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const chroma = max - min;

        // Reject extreme highlights/background
        if (r > 245 && g > 245 && b > 245) continue;
        if (luma < 35 || luma > 235) continue;

        // Reject gray/background pixels and very saturated odd pixels
        if (chroma < 8 || chroma > 95) continue;

        // Basic skin-likeliness
        if (r < g || g < b - 18) continue;
        if (warmth < 2) continue;

        samples.push({ luma, warmth, chroma });
      }
    }
  }

  if (!samples.length) {
    return {
      medianLuma: 125,
      medianWarmth: 20,
      medianChroma: 25
    };
  }

  const sortedLuma = samples.map((p) => p.luma).sort((a, b) => a - b);
  const sortedWarmth = samples.map((p) => p.warmth).sort((a, b) => a - b);
  const sortedChroma = samples.map((p) => p.chroma).sort((a, b) => a - b);

  // Use trimmed medians to reduce weird edge pixels
  return {
    medianLuma: median(sortedLuma),
    medianWarmth: median(sortedWarmth),
    medianChroma: median(sortedChroma)
  };
}

function median(arr) {
  const mid = Math.floor(arr.length / 2);
  if (arr.length % 2 === 0) {
    return (arr[mid - 1] + arr[mid]) / 2;
  }
  return arr[mid];
}

function buildShadeScore(stats) {
  const luma = stats.medianLuma;
  const warmth = stats.medianWarmth;
  const chroma = stats.medianChroma;

  let score = (255 - luma);

  // LIGHT SKIN (stay strong)
  if (luma > 205) score -= 55;
  else if (luma > 190) score -= 40;
  else if (luma > 175) score -= 26;
  else if (luma > 160) score -= 12;

  // VERY DEEP SKIN (stay strong)
  if (luma < 85) score += 48;
  else if (luma < 100) score += 34;

  // 🔥 FIX: MEDIUM–DEEP BAND (this is her range)
  if (luma >= 100 && luma <= 135) {
    score -= 14;   // pull lighter so it doesn't drop to HF5
  }

  // SOFT SUPPORT just above that band
  if (luma > 135 && luma < 155) {
    score -= 6;
  }

  // Warmth influence (keep subtle)
  if (warmth > 55) score += 3;
  else if (warmth < 12) score -= 3;

  // Chroma stability
  if (chroma > 45) score += 2;
  else if (chroma < 16) score -= 2;

  return score;
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
