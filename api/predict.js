import sharp from "sharp";

const SHADE_CATALOG = [
  { shadeCode: "HF5", shadeName: "HF5", score: 126, undertone: "neutral", productImage: "/images/HF5.png" },
  { shadeCode: "HF6", shadeName: "HF6", score: 134, undertone: "warm", productImage: "/images/HF6.png" },
  { shadeCode: "HF7", shadeName: "HF7", score: 142, undertone: "neutral", productImage: "/images/HF7.png" },
  { shadeCode: "HF8", shadeName: "HF8", score: 150, undertone: "warm", productImage: "/images/HF8.png" },
  { shadeCode: "HF9", shadeName: "HF9", score: 158, undertone: "neutral", productImage: "/images/HF9.png" },
  { shadeCode: "HF10", shadeName: "HF10", score: 166, undertone: "warm", productImage: "/images/HF10.png" },
  { shadeCode: "HF11", shadeName: "HF11", score: 174, undertone: "neutral", productImage: "/images/HF11.png" },
  { shadeCode: "HF12", shadeName: "HF12", score: 182, undertone: "warm", productImage: "/images/HF12.png" },
  { shadeCode: "HF13", shadeName: "HF13", score: 190, undertone: "neutral", productImage: "/images/HF13.png" },
  { shadeCode: "HF14", shadeName: "HF14", score: 198, undertone: "neutral", productImage: "/images/HF14.png" },
  { shadeCode: "HF15", shadeName: "HF15", score: 206, undertone: "warm", productImage: "/images/HF15.png" }
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
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

    const stats = await getCheekSkinStats(imageBuffer);
    const shadeScore = buildShadeScore(stats);
    const selectedIndex = findClosestShadeIndex(shadeScore, SHADE_CATALOG);

    const selected = SHADE_CATALOG[selectedIndex];
    const minusOne = selectedIndex > 0 ? SHADE_CATALOG[selectedIndex - 1] : null;
    const plusOne =
      selectedIndex < SHADE_CATALOG.length - 1
        ? SHADE_CATALOG[selectedIndex + 1]
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
        shadeScore,
        medianLuma: stats.medianLuma,
        medianR: stats.medianR,
        medianG: stats.medianG,
        medianB: stats.medianB,
        warmth: stats.warmth,
        sampleCount: stats.sampleCount
      }
    });
  } catch (error) {
    console.error("Prediction error:", error);
    return res.status(500).json({
      error: "Prediction failed",
      details: error instanceof Error ? error.message : "Unknown server error"
    });
  }
}

async function getCheekSkinStats(imageBuffer) {
  const image = sharp(imageBuffer).rotate();
  const metadata = await image.metadata();

  const width = metadata.width;
  const height = metadata.height;

  if (!width || !height) {
    return {
      medianR: 150,
      medianG: 120,
      medianB: 95,
      medianLuma: 128,
      warmth: 55,
      sampleCount: 0
    };
  }

  const normalized = await image
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const data = normalized.data;
  const channels = normalized.info.channels;

  const leftCheek = {
    xStart: Math.floor(width * 0.20),
    xEnd: Math.floor(width * 0.34),
    yStart: Math.floor(height * 0.52),
    yEnd: Math.floor(height * 0.74)
  };

  const rightCheek = {
    xStart: Math.floor(width * 0.66),
    xEnd: Math.floor(width * 0.80),
    yStart: Math.floor(height * 0.52),
    yEnd: Math.floor(height * 0.74)
  };

  const pixels = [];
  collectValidCheekPixels(data, width, channels, leftCheek, pixels);
  collectValidCheekPixels(data, width, channels, rightCheek, pixels);

  if (!pixels.length) {
    return {
      medianR: 150,
      medianG: 120,
      medianB: 95,
      medianLuma: 128,
      warmth: 55,
      sampleCount: 0
    };
  }

  const rs = pixels.map((p) => p.r).sort((a, b) => a - b);
  const gs = pixels.map((p) => p.g).sort((a, b) => a - b);
  const bs = pixels.map((p) => p.b).sort((a, b) => a - b);
  const ls = pixels.map((p) => p.luma).sort((a, b) => a - b);

  const medianR = medianFromSorted(rs);
  const medianG = medianFromSorted(gs);
  const medianB = medianFromSorted(bs);
  const medianLuma = medianFromSorted(ls);
  const warmth = medianR - medianB;

  return {
    medianR,
    medianG,
    medianB,
    medianLuma,
    warmth,
    sampleCount: pixels.length
  };
}

function collectValidCheekPixels(data, width, channels, region, pixels) {
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

      if (isNearWhiteBackground(r, g, b)) continue;
      if (isTooDark(r, g, b, luma)) continue;
      if (isTooBright(r, g, b, luma)) continue;
      if (isLikelyHair(r, g, b, luma, chroma)) continue;
      if (isLikelyLipOrHeavyBlush(r, g, b)) continue;
      if (!looksLikeSkin(r, g, b, luma, chroma)) continue;

      pixels.push({ r, g, b, luma });
    }
  }
}

function looksLikeSkin(r, g, b, luma, chroma) {
  return (
    r > 72 &&
    g > 48 &&
    b > 36 &&
    r > g &&
    g >= b - 10 &&
    luma > 84 &&
    luma < 205 &&
    chroma > 10 &&
    chroma < 90 &&
    (r - g) > 6 &&
    (r - b) > 12
  );
}

function isNearWhiteBackground(r, g, b) {
  return r > 236 && g > 236 && b > 236;
}

function isTooDark(r, g, b, luma) {
  return luma < 70 || (r < 46 && g < 46 && b < 46);
}

function isTooBright(r, g, b, luma) {
  return luma > 210 || (r > 240 && g > 240 && b > 240);
}

function isLikelyHair(r, g, b, luma, chroma) {
  return luma < 88 && chroma < 56;
}

function isLikelyLipOrHeavyBlush(r, g, b) {
  return r > 158 && (r - g) > 36 && (r - b) > 42;
}

function medianFromSorted(values) {
  const mid = Math.floor(values.length / 2);
  if (values.length % 2 === 0) {
    return Math.round((values[mid - 1] + values[mid]) / 2);
  }
  return values[mid];
}

function buildShadeScore(stats) {
  const inverseDepth = 300 - stats.medianLuma;
  const warmthBoost = Math.max(0, Math.min(12, Math.round((stats.warmth - 20) * 0.28)));
  const depthBoost = 2;

  return inverseDepth + warmthBoost + depthBoost;
}

function findClosestShadeIndex(targetScore, shades) {
  let closestIndex = 0;
  let smallestDiff = Math.abs(targetScore - shades[0].score);

  for (let i = 1; i < shades.length; i++) {
    const diff = Math.abs(targetScore - shades[i].score);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestIndex = i;
    }
  }

  return closestIndex;
}
