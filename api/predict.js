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
  { shadeCode: "HF6", score: 180, productImage: "/images/HF6.png" },
  { shadeCode: "HF7", score: 160, productImage: "/images/HF7.png" },
  { shadeCode: "HF8", score: 140, productImage: "/images/HF8.png" },
  { shadeCode: "HF9", score: 120, productImage: "/images/HF9.png" },
  { shadeCode: "HF10", score: 100, productImage: "/images/HF10.png" },
  { shadeCode: "HF11", score: 80, productImage: "/images/HF11.png" },
  { shadeCode: "HF12", score: 60, productImage: "/images/HF12.png" },
  { shadeCode: "HF13", score: 40, productImage: "/images/HF13.png" },
  { shadeCode: "HF14", score: 20, productImage: "/images/HF14.png" },
  { shadeCode: "HF15", score: 0, productImage: "/images/HF15.png" }
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
    const stats = await getFaceStats(buffer);
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
        medianLuma: round2(stats.medianLuma),
        medianWarmth: round2(stats.medianWarmth),
        medianChroma: round2(stats.medianChroma),
        normalizedLuma: round2(stats.normalizedLuma),
        score: round2(score)
      }
    });
  } catch (err) {
    console.error("Prediction failed:", err);
    return res.status(500).json({ error: "Prediction failed" });
  }
}

async function getFaceStats(buffer) {
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
    return fallbackStats();
  }

  const foreheadRegion = {
    x1: Math.floor(width * 0.36),
    x2: Math.floor(width * 0.64),
    y1: Math.floor(height * 0.11),
    y2: Math.floor(height * 0.27)
  };

  const cheekRegions = [
    {
      x1: Math.floor(width * 0.22),
      x2: Math.floor(width * 0.36),
      y1: Math.floor(height * 0.50),
      y2: Math.floor(height * 0.68)
    },
    {
      x1: Math.floor(width * 0.64),
      x2: Math.floor(width * 0.78),
      y1: Math.floor(height * 0.50),
      y2: Math.floor(height * 0.68)
    }
  ];

  const cheekSamples = [];
  const foreheadLumas = [];

  for (let y = foreheadRegion.y1; y < foreheadRegion.y2; y += 2) {
    for (let x = foreheadRegion.x1; x < foreheadRegion.x2; x += 2) {
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      if (r === undefined || g === undefined || b === undefined) continue;

      const sample = buildSample(r, g, b);
      if (isSkinLike(sample)) {
        foreheadLumas.push(sample.luma);
      }
    }
  }

  for (const region of cheekRegions) {
    for (let y = region.y1; y < region.y2; y += 2) {
      for (let x = region.x1; x < region.x2; x += 2) {
        const idx = (y * width + x) * channels;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        if (r === undefined || g === undefined || b === undefined) continue;

        const sample = buildSample(r, g, b);
        if (isSkinLike(sample)) {
          cheekSamples.push(sample);
        }
      }
    }
  }

  if (!cheekSamples.length) {
    return fallbackStats();
  }

  const sortedLuma = cheekSamples.map((p) => p.luma).sort((a, b) => a - b);
  const sortedWarmth = cheekSamples.map((p) => p.warmth).sort((a, b) => a - b);
  const sortedChroma = cheekSamples.map((p) => p.chroma).sort((a, b) => a - b);

  const medianLuma = median(sortedLuma);
  const medianWarmth = median(sortedWarmth);
  const medianChroma = median(sortedChroma);

  let normalizedLuma = medianLuma;

  if (foreheadLumas.length > 8) {
    const foreheadMedian = median(foreheadLumas.sort((a, b) => a - b));
    const ratio = foreheadMedian / Math.max(medianLuma, 1);

    if (ratio > 1.12) {
      const correction = Math.min((ratio - 1.12) * 38, 18);
      normalizedLuma = medianLuma - correction;
    } else if (ratio < 0.92) {
      const correction = Math.min((0.92 - ratio) * 26, 10);
      normalizedLuma = medianLuma + correction;
    }
  }

  normalizedLuma = Math.max(35, Math.min(235, normalizedLuma));

  return {
    medianLuma,
    medianWarmth,
    medianChroma,
    normalizedLuma
  };
}

function buildSample(r, g, b) {
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  const warmth = r - b;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);

  return { r, g, b, luma, warmth, chroma };
}

function isSkinLike(sample) {
  const { r, g, b, luma, warmth, chroma } = sample;

  if (r > 245 && g > 245 && b > 245) return false;
  if (luma < 30 || luma > 240) return false;
  if (chroma < 6 || chroma > 100) return false;

  if (r + 4 < g) return false;
  if (g + 12 < b) return false;
  if (warmth < -6) return false;

  return true;
}

function fallbackStats() {
  return {
    medianLuma: 125,
    medianWarmth: 20,
    medianChroma: 25,
    normalizedLuma: 125
  };
}

function median(arr) {
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 === 0
    ? (arr[mid - 1] + arr[mid]) / 2
    : arr[mid];
}

function buildShadeScore(stats) {
  const lumaMin = 40;
  const lumaMax = 220;

  const luma = Math.max(lumaMin, Math.min(lumaMax, stats.normalizedLuma));

  let score = ((lumaMax - luma) / (lumaMax - lumaMin)) * 200;

  // Protect lighter skin so it does not get pushed too dark
  if (score < 120) {
    score -= (120 - score) * 0.25;
  }

  // Lift medium-light band closer to HF10-HF13
  if (score >= 60 && score <= 120) {
    score -= 10;
  }

  // Keep deep tones stable without over-pushing everything darker
  if (score > 150) {
    score = 150 + (score - 150) * 0.65;
  }

  const warmth = stats.medianWarmth;
  if (warmth > 55) score += 2;
  else if (warmth < 10) score -= 2;

  const chroma = stats.medianChroma;
  if (chroma > 50) score += 2;
  else if (chroma < 12) score -= 2;

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

function round2(value) {
  return Math.round(value * 100) / 100;
}
