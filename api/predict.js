export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { brightness, avgR, avgG, avgB } = req.body;

    if (
      brightness === undefined ||
      avgR === undefined ||
      avgG === undefined ||
      avgB === undefined
    ) {
      return res.status(400).json({ error: "Missing cheek color data" });
    }

    let shade = "HF12";

    if (brightness < 70) shade = "HF5";
    else if (brightness < 85) shade = "HF6";
    else if (brightness < 100) shade = "HF7";
    else if (brightness < 115) shade = "HF8";
    else if (brightness < 130) shade = "HF9";
    else if (brightness < 145) shade = "HF10";
    else if (brightness < 160) shade = "HF11";
    else if (brightness < 178) shade = "HF12";
    else if (brightness < 196) shade = "HF13";
    else if (brightness < 215) shade = "HF14";
    else shade = "HF15";

    const warmth = avgR - avgB;
    const redness = avgR - avgG;

    if (brightness >= 170 && warmth < 18) {
      shade = shade === "HF14" ? "HF15" : shade === "HF13" ? "HF14" : shade;
    }

    if (brightness >= 150 && redness > 22) {
      shade = shade === "HF11" ? "HF12" : shade === "HF12" ? "HF13" : shade;
    }

    if (brightness < 120 && warmth > 28) {
      shade = shade === "HF9" ? "HF8" : shade === "HF8" ? "HF7" : shade;
    }

    return res.status(200).json({
      predicted_label: shade,
      confidence: 0.86,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error processing image" });
  }
}
