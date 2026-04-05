import sharp from "sharp";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  }
};

const SHADE_CATALOG = [
  { shadeCode: "HF5", score: 180 },
  { shadeCode: "HF6", score: 165 },
  { shadeCode: "HF7", score: 150 },
  { shadeCode: "HF8", score: 138 },
  { shadeCode: "HF9", score: 126 },
  { shadeCode: "HF10", score: 114 },
  { shadeCode: "HF11", score: 102 },
  { shadeCode: "HF12", score: 90 },
  { shadeCode: "HF13", score: 78 },
  { shadeCode: "HF14", score: 66 },
  { shadeCode: "HF15", score: 50 }
];

export default async function handler(req, res) {
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
    const buffer = Buffer.from(base64, "base64");

    const stats = await getCheekStats(buffer);
    const score = buildShadeScore(stats);
    const index = findClosestShadeIndex(score);

    const selected = SHADE_CATALOG[index];

    return res.status(200).json({
      success: true,
      match: selected,
      debug: {
        luma: stats.medianLuma,
        warmth: stats.warmth,
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
    .resize(400, 400)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  const pixels = [];

  const regions = [
    { x1: width * 0.2, x2: width * 0.35, y1: height * 0.55, y2: height * 0.75 },
    { x1: width * 0.65, x2: width * 0.8, y1: height * 0.55, y2: height * 0.75 }
  ];

  regions.forEach(r => {
    for (let y = r.y1; y < r.y2; y += 2) {
      for (let x = r.x1; x < r.x2; x += 2) {
        const idx = (Math.floor(y) * width + Math.floor(x)) * channels;

        const rVal = data[idx];
        const gVal = data[idx + 1];
        const bVal = data[idx + 2];

        if (!rVal || !gVal || !bVal) continue;

        const luma = 0.299 * rVal + 0.587 * gVal + 0.114 * bVal;
        const warmth = rVal - bVal;

        if (luma < 50 || luma > 230) continue;
        if (warmth < 5) continue;

        pixels.push({ luma, warmth });
      }
    }
  });

  if (!pixels.length) {
    return { medianLuma: 120, warmth: 20 };
  }

  pixels.sort((a, b) => a.luma - b.luma);
  const mid = Math.floor(pixels.length / 2);

  return {
    medianLuma: pixels[mid].luma,
    warmth: pixels[mid].warmth
  };
}

function buildShadeScore(stats) {
  const luma = stats.medianLuma;

  // 👇 NEW: lighter skin correction
  let depth = 255 - luma;

  // soften everything
  depth *= 0.75;

  // 👇 KEY FIX: boost light tones
  if (luma > 180) depth -= 25;
  if (luma > 200) depth -= 15;

  // warmth influence (small)
  const warmthAdjust = Math.max(
    -6,
    Math.min(5, (stats.warmth - 15) * 0.1)
  );

  return depth + warmthAdjust;
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
