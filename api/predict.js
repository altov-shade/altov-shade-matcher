import sharp from "sharp";

const SHADE_CATALOG = [
  { shadeCode: "HF5", shadeName: "HF5", brightness: 66, undertone: "neutral", productImage: "/images/HF5.png" },
  { shadeCode: "HF6", shadeName: "HF6", brightness: 72, undertone: "warm", productImage: "/images/HF6.png" },
  { shadeCode: "HF7", shadeName: "HF7", brightness: 78, undertone: "neutral", productImage: "/images/HF7.png" },
  { shadeCode: "HF8", shadeName: "HF8", brightness: 84, undertone: "warm", productImage: "/images/HF8.png" },
  { shadeCode: "HF9", shadeName: "HF9", brightness: 90, undertone: "neutral", productImage: "/images/HF9.png" },
  { shadeCode: "HF10", shadeName: "HF10", brightness: 96, undertone: "warm", productImage: "/images/HF10.png" },
  { shadeCode: "HF11", shadeName: "HF11", brightness: 102, undertone: "neutral", productImage: "/images/HF11.png" },
  { shadeCode: "HF12", shadeName: "HF12", brightness: 108, undertone: "warm", productImage: "/images/HF12.png" },
  { shadeCode: "HF13", shadeName: "HF13", brightness: 114, undertone: "neutral", productImage: "/images/HF13.png" },
  { shadeCode: "HF14", shadeName: "HF14", brightness: 120, undertone: "neutral", productImage: "/images/HF14.png" },
  { shadeCode: "HF15", shadeName: "HF15", brightness: 126, undertone: "warm", productImage: "/images/HF15.png" }
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

    const cheekStats = await getLowerCheekJawStats(imageBuffer);

    const adjustedBrightness = applyDepthCalibration(cheekStats);

    const selectedIndex = findClosestShadeIndex(adjustedBrightness, SHADE_CATALOG);

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
        rawBrightness: cheekStats.brightness,
        adjustedBrightness,
        avgR: cheekStats.avgR,
        avgG: cheekStats.avgG,
        avgB: cheekStats.avgB,
        sampleCount: cheekStats.sampleCount
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

async function getLowerCheekJawStats(imageBuffer) {
  const image = sharp(imageBuffer).rotate();
  const metadata = await image.metadata();

  const width = metadata.width;
  const height = metadata.height;

  if (!width || !height) {
    return {
      brightness: 108,
      avgR: 108,
      avgG: 108,
      avgB: 108,
      sampleCount: 0
    };
  }

  const normalized = await image
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const data = normalized.data;
  const channels = normalized.info.channels;

  const leftRegion = {
    xStart: Math.floor(width * 0.16),
    xEnd: Math.floor(width * 0.34),
    yStart: Math.floor(height * 0.66),
    yEnd: Math.floor(height * 0.90)
  };

  const rightRegion = {
    xStart: Math.floor(width * 0.66),
    xEnd: Math.floor(width * 0.84),
    yStart: Math.floor(height * 0.66),
    yEnd: Math.floor(height * 0.90)
  };

  const samples = [];

  collectSkinPixels(data, width, channels, leftRegion, samples);
  collectSkinPixels(data, width, channels, rightRegion, samples);

  if (!samples.length) {
    return {
      brightness: 108,
      avgR: 108,
      avgG: 108,
      avgB: 108,
      sampleCount: 0
    };
  }

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;

  for (const pixel of samples) {
    totalR += pixel.r;
    totalG += pixel.g;
    totalB += pixel.b;
  }

  const avgR = Math.round(totalR / samples.length);
  const avgG = Math.round(totalG / samples.length);
  const avgB = Math.round(totalB / samples.length);

  const brightness = Math.round((avgR + avgG + avgB) / 3);

  return {
    brightness,
    avgR,
    avgG,
    avgB,
    sampleCount: samples.length
  };
}

function collectSkinPixels(data, width, channels, region, samples) {
  for (let y = region.yStart; y < region.yEnd; y += 2) {
    for (let x = region.xStart; x < region.xEnd; x += 2) {
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      if (typeof r !== "number" || typeof g !== "number" || typeof b !== "number") {
        continue;
      }

      if (looksLikeSkin(r, g, b) && !isTooBright(r, g, b) && !isTooDark(r, g, b)) {
        samples.push({ r, g, b });
      }
    }
  }
}

function looksLikeSkin(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  return (
    r > 40 &&
    g > 25 &&
    b > 18 &&
    r > g &&
    r > b &&
    max - min > 10 &&
    Math.abs(r - g) > 4
  );
}

function isTooBright(r, g, b) {
  return r > 240 && g > 240 && b > 240;
}

function isTooDark(r, g, b) {
  return r < 18 && g < 18 && b < 18;
}

function applyDepthCalibration(stats) {
  const warmth = stats.avgR - stats.avgB;

  let adjusted = stats.brightness;

  adjusted += 10;

  if (warmth > 18) {
    adjusted += 2;
  }

  return adjusted;
}

function findClosestShadeIndex(targetBrightness, shades) {
  let closestIndex = 0;
  let smallestDiff = Math.abs(targetBrightness - shades[0].brightness);

  for (let i = 1; i < shades.length; i++) {
    const diff = Math.abs(targetBrightness - shades[i].brightness);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestIndex = i;
    }
  }

  return closestIndex;
}
