import sharp from "sharp";

const SHADE_CATALOG = [
  { shadeCode: "HF5", score: 176, productImage: "/images/HF5.png" },
  { shadeCode: "HF6", score: 168, productImage: "/images/HF6.png" },
  { shadeCode: "HF7", score: 160, productImage: "/images/HF7.png" },
  { shadeCode: "HF8", score: 152, productImage: "/images/HF8.png" },
  { shadeCode: "HF9", score: 144, productImage: "/images/HF9.png" },
  { shadeCode: "HF10", score: 136, productImage: "/images/HF10.png" },
  { shadeCode: "HF11", score: 128, productImage: "/images/HF11.png" },
  { shadeCode: "HF12", score: 120, productImage: "/images/HF12.png" },
  { shadeCode: "HF13", score: 112, productImage: "/images/HF13.png" },
  { shadeCode: "HF14", score: 104, productImage: "/images/HF14.png" },
  { shadeCode: "HF15", score: 96, productImage: "/images/HF15.png" }
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
    const { imageBase64 } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64" });
    }

    const cleanBase64 = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;

    const imageBuffer = Buffer.from(cleanBase64, "base64");

    const stats = await getCheekStats(imageBuffer);
    const score = buildShadeScore(stats);
    const index = findClosestShadeIndex(score);

    const selected = SHADE_CATALOG[index];
    const minusOne = index > 0 ? SHADE_CATALOG[index - 1] : null;
    const plusOne =
      index < SHADE_CATALOG.length - 1
        ? SHADE_CATALOG[index + 1]
        : null;

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
        medianR: stats.medianR,
        medianG: stats.medianG,
        medianB: stats.medianB,
        warmth: stats.warmth,
        score
      }
    });
  } catch (error) {
    console.error("Prediction error:", error);
    return res.status(500).json({
      error: "Prediction failed",
      details:
        error instanceof Error ? error.message : "Unknown server error"
    });
  }
}

async function getCheekStats(buffer) {
  const { data, info } = await sharp(buffer)
    .rotate()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  if (!width || !height) {
    return {
      medianR: 120,
      medianG: 100,
      medianB: 85,
      medianLuma: 102,
      warmth: 35
    };
  }

  const leftCheek = {
    xStart: Math.floor(width * 0.18),
    xEnd: Math.floor(width * 0.34),
    yStart: Math.floor(height * 0.52),
    yEnd: Math.floor(height * 0.76)
  };

  const rightCheek = {
    xStart: Math.floor(width * 0.66),
    xEnd: Math.floor(width * 0.82),
    yStart: Math.floor(height * 0.52),
    yEnd: Math.floor(height * 0.76)
  };

  const pixels = [];
  collectPixels(data, width, channels, leftCheek, pixels);
  collectPixels(data, width, channels, rightCheek, pixels);

  if (!pixels.length) {
    return {
      medianR: 120,
      medianG: 100,
      medianB: 85,
      medianLuma: 102,
      warmth: 35
    };
  }

  const rs = pixels.map((p) => p.r).sort((a, b) => a - b);
  const gs = pixels.map((p) => p.g).sort((a, b) => a - b);
  const bs = pixels.map((p) => p.b).sort((a, b) => a - b);
  const ls = pixels.map((p) => p.luma).sort((a, b) => a - b);

  const medianR = median(rs);
  const medianG = median(gs);
  const medianB = median(bs);
  const medianLuma = median(ls);
  const warmth = medianR - medianB;

  return {
    medianR,
    medianG,
    medianB,
    medianLuma,
    warmth
  };
}

function collectPixels(data, width, channels, region, pixels) {
  for (let y = region.yStart; y < region.yEnd; y += 2) {
    for (let x = region.xStart; x < region.xEnd; x += 2) {
      const idx = (y * width + x) * channels;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      if (
        typeof r !== "number" ||
        typeof g !== "number" ||
        typeof b !== "number"
      ) {
        continue;
      }

      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const chroma = max - min;

      if (r > 240 && g > 240 && b > 240) continue;
      if (luma < 35) continue;
      if (luma > 205) continue;
      if (r < 45 || g < 35 || b < 25) continue;
      if (!(r >= g && g >= b - 12)) continue;
      if (chroma < 10 || chroma > 95) continue;
      if (r - b < 8) continue;

      pixels.push({ r, g, b, luma });
    }
  }
}

function median(values) {
  const mid = Math.floor(values.length / 2);
  if (values.length % 2 === 0) {
    return Math.round((values[mid - 1] + values[mid]) / 2);
  }
  return values[mid];
}

function buildShadeScore(stats) {
  const inverseDepth = 260 - stats.medianLuma;

  const warmthBoost = Math.max(
    0,
    Math.min(8, Math.round((stats.warmth - 15) * 0.15))
  );

  let depthAdjust = 0;

  if (stats.medianLuma < 110) depthAdjust += 6;
  else if (stats.medianLuma < 130) depthAdjust += 3;

  return inverseDepth + warmthBoost + depthAdjust;
}

function findClosestShadeIndex(score) {
  let closest = 0;
  let smallestDiff = Math.abs(score - SHADE_CATALOG[0].score);

  for (let i = 1; i < SHADE_CATALOG.length; i++) {
    const diff = Math.abs(score - SHADE_CATALOG[i].score);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closest = i;
    }
  }

  return closest;
}
