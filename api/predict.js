import sharp from "sharp";

const SHADE_CATALOG = [
  { shadeCode: "HF5", score: 126, productImage: "/images/HF5.png" },
  { shadeCode: "HF6", score: 134, productImage: "/images/HF6.png" },
  { shadeCode: "HF7", score: 142, productImage: "/images/HF7.png" },
  { shadeCode: "HF8", score: 150, productImage: "/images/HF8.png" },
  { shadeCode: "HF9", score: 158, productImage: "/images/HF9.png" },
  { shadeCode: "HF10", score: 166, productImage: "/images/HF10.png" },
  { shadeCode: "HF11", score: 174, productImage: "/images/HF11.png" },
  { shadeCode: "HF12", score: 182, productImage: "/images/HF12.png" },
  { shadeCode: "HF13", score: 190, productImage: "/images/HF13.png" },
  { shadeCode: "HF14", score: 198, productImage: "/images/HF14.png" },
  { shadeCode: "HF15", score: 206, productImage: "/images/HF15.png" }
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing image" });
    }

    const base64 = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;

    const buffer = Buffer.from(base64, "base64");

    const stats = await getCheekStats(buffer);
    const score = buildShadeScore(stats);
    const index = findClosestShadeIndex(score);

    const selected = SHADE_CATALOG[index];

    return res.status(200).json({
      success: true,
      match: selected,
      range: {
        minusOne: SHADE_CATALOG[index - 1] || null,
        selected,
        plusOne: SHADE_CATALOG[index + 1] || null
      },
      debug: stats
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Prediction failed" });
  }
}

async function getCheekStats(buffer) {
  const { data, info } = await sharp(buffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  const pixels = [];

  for (let y = Math.floor(height * 0.5); y < Math.floor(height * 0.75); y += 2) {
    for (let x = Math.floor(width * 0.25); x < Math.floor(width * 0.75); x += 2) {
      const idx = (y * width + x) * channels;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const luma = 0.299 * r + 0.587 * g + 0.114 * b;

      if (luma < 70 || luma > 210) continue;

      pixels.push({ r, g, b, luma });
    }
  }

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const rs = pixels.map(p => p.r);
  const gs = pixels.map(p => p.g);
  const bs = pixels.map(p => p.b);
  const ls = pixels.map(p => p.luma);

  return {
    medianR: avg(rs),
    medianG: avg(gs),
    medianB: avg(bs),
    medianLuma: avg(ls),
    warmth: avg(rs) - avg(bs)
  };
}

function buildShadeScore(stats) {
  const inverseDepth = 300 - stats.medianLuma;
  const warmthBoost = Math.max(0, Math.min(10, (stats.warmth - 20) * 0.25));
  const depthBoost = 2;

  return inverseDepth + warmthBoost + depthBoost;
}

function findClosestShadeIndex(score) {
  let closest = 0;
  let diff = Math.abs(score - SHADE_CATALOG[0].score);

  for (let i = 1; i < SHADE_CATALOG.length; i++) {
    const d = Math.abs(score - SHADE_CATALOG[i].score);
    if (d < diff) {
      diff = d;
      closest = i;
    }
  }

  return closest;
}
