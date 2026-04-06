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
        sampleCount: stats.sampleCount,
        medianLuma: round2(stats.medianLuma),
        brightLuma: round2(stats.brightLuma),
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

  const cheekRegions = [
    {
      x1: Math.floor(width * 0.30),
      x2: Math.floor(width * 0.42),
      y1: Math.floor(height * 0.42),
      y2: Math.floor(height * 0.58)
    },
    {
      x1: Math.floor(width * 0.58),
      x2: Math.floor(width * 0.70),
      y1: Math.floor(height * 0.42),
      y2: Math.floor(height * 0.58)
    }
  ];

  const cheekSamples = [];

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

  const lumas = cheekSamples.map((p) => p.luma).sort((a, b) => a - b);
  const warmths = cheekSamples.map((p) => p.warmth).sort((a, b) => a - b);
  const chromas = cheekSamples.map((p) => p.chroma).sort((a, b) => a - b);

  const medianLuma = median(lumas);
  const brightLuma = percentile(lumas, 0.68);
  const medianWarmth = median(warmths);
  const medianChroma = median(chromas);

  let normalizedLuma = medianLuma * 0.4 + brightLuma * 0.6;

  if (medianChroma < 14) {
    normalizedLuma += 3;
  }

  if (medianWarmth < 10) {
    normalizedLuma += 2;
  }

  normalizedLuma = Math.max(32, Math.min(235, normalizedLuma));

  return {
    sampleCount: cheekSamples.length,
    medianLuma,
    brightLuma,
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
  if (luma < 28 || luma > 242) return false;
  if (chroma < 8 || chroma > 92) return false;

  if (r + 2 < g) return false;
  if (g + 16 < b) return false;
  if (warmth < -8) return false;

  return true;
}

function fallbackStats() {
  return {
    sampleCount: 0,
    medianLuma: 125,
    brightLuma: 132,
    medianWarmth: 20,
    medianChroma: 25,
    normalizedLuma: 128
  };
}

function median(arr) {
  if (!arr.length) return 0;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 === 0
    ? (arr[mid - 1] + arr[mid]) / 2
    : arr[mid];
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const index = Math.floor((arr.length - 1) * p);
  return arr[index];
}

function buildShadeScore(stats) {
  const lumaMin = 38;
  const lumaMax = 222;

  const luma = Math.max(lumaMin, Math.min(lumaMax, stats.normalizedLuma));
  let score = ((lumaMax - luma) / (lumaMax - lumaMin)) * 200;

  // very pale / light
  if (score < 70) {
    score -= (70 - score) * 0.45;
  }

  if (score < 45) {
    score -= 5;
  }

  // bright fair skin under warm lighting
  if (stats.normalizedLuma > 150) {
    score -= 8;
  }

  if (stats.normalizedLuma > 170) {
    score -= 5;
  }

  // very fair neutral skin boost
  if (stats.normalizedLuma > 165 && stats.medianWarmth < 22) {
    score -= 18;
  }

  // medium band tuning
  if (score >= 95 && score <= 150) {
    score += 14;
  }

  // deep tones stay stable
  if (score >= 150 && score <= 188) {
    score = 150 + (score - 150) * 0.95;
  }

  if (score > 188) {
    score = 188 + (score - 188) * 1.25;
  }

  const warmth = stats.medianWarmth;
  if (warmth > 58) score += 1;
  else if (warmth < 8) score -= 3;

  // fair warm skin should not collapse too dark
  if (warmth > 32 && stats.normalizedLuma > 145) {
    score -= 6;
  }

  // warm tan protection
  if (stats.normalizedLuma > 120 && stats.normalizedLuma < 165 && stats.medianWarmth > 26) {
    score -= 10;
  }

  const chroma = stats.medianChroma;
  if (chroma > 52) score += 2;
  else if (chroma < 14) score -= 2;

  if (chroma < 14 && stats.normalizedLuma > 155) {
    score -= 5;
  }

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
