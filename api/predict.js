import sharp from "sharp";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(req, res) {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const buffer = Buffer.from(image.split(",")[1], "base64");

    const { data, info } = await sharp(buffer)
      .resize(200, 200)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const stats = analyzeSkin(data, info.width, info.height);

    const shade = mapToShade(stats);

    return res.status(200).json({
      stats,
      shade,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Processing failed" });
  }
}

function analyzeSkin(data, width, height) {
  const pixels = [];

  // 👇 CHEEK ZONE ONLY (this fixes your issue)
  for (let y = Math.floor(height * 0.45); y < Math.floor(height * 0.75); y++) {
    for (let x = Math.floor(width * 0.3); x < Math.floor(width * 0.7); x++) {
      const idx = (y * width + x) * 3;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const warmth = r - b;

      pixels.push({ luma, warmth });
    }
  }

  pixels.sort((a, b) => a.luma - b.luma);

  const mid = Math.floor(pixels.length / 2);

  const medianLuma = pixels[mid].luma;
  const medianWarmth = pixels[mid].warmth;

  return {
    medianLuma,
    medianWarmth,
  };
}

function mapToShade(stats) {
  const { medianLuma, medianWarmth } = stats;

  // Normalize depth (darker = lower luma)
  const depth = 255 - medianLuma;

  // 👇 tuned from your real samples
  if (depth > 170) return "HF5";
  if (depth > 150) return "HF6";
  if (depth > 130) return "HF7";
  if (depth > 115) return "HF8";
  if (depth > 100) return "HF9";
  if (depth > 90) return "HF10";
  if (depth > 80) return "HF11";
  if (depth > 70) return "HF12";
  if (depth > 60) return "HF13";
  if (depth > 50) return "HF14";
  if (depth > 40) return "HF15";

  return "HF16";
}
