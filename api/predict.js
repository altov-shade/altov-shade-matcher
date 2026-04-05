import sharp from "sharp";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  }
};

const SHADE_CATALOG = [
  { shadeCode: "HF5", score: 180, productImage: "/images/HF5.png" },
  { shadeCode: "HF6", score: 165, productImage: "/images/HF6.png" },
  { shadeCode: "HF7", score: 150, productImage: "/images/HF7.png" },
  { shadeCode: "HF8", score: 138, productImage: "/images/HF8.png" },
  { shadeCode: "HF9", score: 126, productImage: "/images/HF9.png" },
  { shadeCode: "HF10", score: 114, productImage: "/images/HF10.png" },
  { shadeCode: "HF11", score: 102, productImage: "/images/HF11.png" },
  { shadeCode: "HF12", score: 90, productImage: "/images/HF12.png" },
  { shadeCode: "HF13", score: 78, productImage: "/images/HF13.png" },
  { shadeCode: "HF14", score: 66, productImage: "/images/HF14.png" },
  { shadeCode: "HF15", score: 50, productImage: "/images/HF15.png" }
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
      return res.status(400).json({
        error: "Only PNG and JPEG supported"
      });
    }

    const base64 = rawImage.split(",")[1];
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

  regions.forEach((region) => {
    for (let y = region.y1; y < region.y2; y += 2) {
      for (let x = region.x1; x < region.x2; x += 2) {
        const idx = (Math.floor(y) * width + Math.floor(x)) * channels;

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        if (r === undefined || g === undefined || b === undefined) continue;

        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        const warmth = r - b;

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

  let depth = 255 - luma;
  depth *= 0.72;

  if (luma > 185) depth -= 28;
  if (luma > 210) depth -= 12;

  if (luma >= 130 && luma <= 170) {
    depth += 6;
  }

  const warmthAdjust = Math.max(
    -5,
    Math.min(4, (stats.warmth - 18) * 0.08)
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
