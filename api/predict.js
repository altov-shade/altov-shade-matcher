import sharp from "sharp";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  }
};

const SHADE_CATALOG = [
  { shadeCode: "HF5", score: 185, productImage: "/images/HF5.png" },
  { shadeCode: "HF6", score: 170, productImage: "/images/HF6.png" },
  { shadeCode: "HF7", score: 155, productImage: "/images/HF7.png" },
  { shadeCode: "HF8", score: 140, productImage: "/images/HF8.png" },
  { shadeCode: "HF9", score: 125, productImage: "/images/HF9.png" },
  { shadeCode: "HF10", score: 110, productImage: "/images/HF10.png" },
  { shadeCode: "HF11", score: 95, productImage: "/images/HF11.png" },
  { shadeCode: "HF12", score: 82, productImage: "/images/HF12.png" },
  { shadeCode: "HF13", score: 69, productImage: "/images/HF13.png" },
  { shadeCode: "HF14", score: 56, productImage: "/images/HF14.png" },
  { shadeCode: "HF15", score: 43, productImage: "/images/HF15.png" }
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
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  const pixels = [];

  const regions = [
    { x1: width * 0.20, x2: width * 0.35, y1: height * 0.54, y2: height * 0.76 },
    { x1: width * 0.65, x2: width * 0.80, y1: height * 0.54, y2: height * 0.76 }
  ];

  for (const region of regions) {
    for (let y = region.y1; y < region.y2; y += 2) {
      for (let x = region.x1; x < region.x2; x += 2) {
        const idx = (Math.floor(y) * width + Math.floor(x)) * channels;

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        if (r === undefined || g === undefined || b === undefined) continue;

        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        const warmth = r - b;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const chroma = max - min;

        if (luma < 45 || luma > 235) continue;
        if (r > 245 && g > 245 && b > 245) continue;
        if (chroma < 8 || chroma > 95) continue;
        if (warmth < 4) continue;

        pixels.push({ luma, warmth });
      }
    }
  }

  if (!pixels.length) {
    return { medianLuma: 125, warmth: 18 };
  }

  const sortedLuma = pixels.map((p) => p.luma).sort((a, b) => a - b);
  const sortedWarmth = pixels.map((p) => p.warmth).sort((a, b) => a - b);

  return {
    medianLuma: median(sortedLuma),
    warmth: median(sortedWarmth)
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
  const warmth = stats.warmth;

  let depth = 255 - luma;

  // Base curve
  depth *= 0.74;

  // Light skin correction
  if (luma > 190) depth -= 24;
  else if (luma > 175) depth -= 16;
  else if (luma > 160) depth -= 8;

  // Deep skin correction
  if (luma < 115) depth += 12;
  else if (luma < 130) depth += 7;

  // Very deep skin extra help
  if (luma < 100) depth += 8;

  // Mid band stabilization
  if (luma >= 135 && luma <= 165) {
    depth += 2;
  }

  const warmthAdjust = Math.max(
    -5,
    Math.min(5, (warmth - 18) * 0.08)
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
