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

    const base64Data = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;

    const imageBuffer = Buffer.from(base64Data, "base64");

    const estimatedBrightness = getBrightnessFromBuffer(imageBuffer);
    const cheekAdjustedBrightness = Math.max(0, estimatedBrightness - 12);

    const shadeCatalog = [
      {
        shadeCode: "HF5",
        shadeName: "HF5",
        brightness: 68,
        undertone: "neutral",
        productImage: "/products/HF5.png",
      },
      {
        shadeCode: "HF6",
        shadeName: "HF6",
        brightness: 74,
        undertone: "warm",
        productImage: "/products/HF6.png",
      },
      {
        shadeCode: "HF7",
        shadeName: "HF7",
        brightness: 81,
        undertone: "neutral",
        productImage: "/products/HF7.png",
      },
      {
        shadeCode: "HF8",
        shadeName: "HF8",
        brightness: 88,
        undertone: "warm",
        productImage: "/products/HF8.png",
      },
      {
        shadeCode: "HF9",
        shadeName: "HF9",
        brightness: 95,
        undertone: "neutral",
        productImage: "/products/HF9.png",
      },
      {
        shadeCode: "HF10",
        shadeName: "HF10",
        brightness: 103,
        undertone: "warm",
        productImage: "/products/HF10.png",
      },
      {
        shadeCode: "HF11",
        shadeName: "HF11",
        brightness: 110,
        undertone: "neutral",
        productImage: "/products/HF11.png",
      },
      {
        shadeCode: "HF12",
        shadeName: "HF12",
        brightness: 116,
        undertone: "warm",
        productImage: "/products/HF12.png",
      },
      {
        shadeCode: "HF13",
        shadeName: "HF13",
        brightness: 122,
        undertone: "neutral",
        productImage: "/products/HF13.png",
      },
      {
        shadeCode: "HF14",
        shadeName: "HF14",
        brightness: 128,
        undertone: "neutral",
        productImage: "/products/HF14.png",
      },
      {
        shadeCode: "HF15",
        shadeName: "HF15",
        brightness: 136,
        undertone: "warm",
        productImage: "/products/HF15.png",
      },
    ];

    const bestMatch = findClosestShade(cheekAdjustedBrightness, shadeCatalog);

    return res.status(200).json({
      success: true,
      match: {
        shadeCode: bestMatch.shadeCode,
        shadeName: bestMatch.shadeName,
        productImage: bestMatch.productImage,
        undertone: bestMatch.undertone,
      },
      debug: {
        estimatedBrightness,
        cheekAdjustedBrightness,
      },
    });
  } catch (error) {
    console.error("Prediction error:", error);
    return res.status(500).json({
      error: "Prediction failed",
      details: error.message || "Unknown server error",
    });
  }
}

function getBrightnessFromBuffer(buffer) {
  if (!buffer || !buffer.length) return 100;

  let sum = 0;
  const sampleStep = Math.max(1, Math.floor(buffer.length / 5000));

  for (let i = 0; i < buffer.length; i += sampleStep) {
    sum += buffer[i];
  }

  const avg = sum / Math.ceil(buffer.length / sampleStep);

  return Math.round(avg);
}

function findClosestShade(targetBrightness, shades) {
  let closest = shades[0];
  let smallestDiff = Math.abs(targetBrightness - shades[0].brightness);

  for (const shade of shades) {
    const diff = Math.abs(targetBrightness - shade.brightness);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closest = shade;
    }
  }

  return closest;
}
