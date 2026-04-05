export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { brightness } = req.body;

    if (brightness === undefined) {
      return res.status(400).json({ error: "Missing brightness" });
    }

    let shade = "HF15";

    if (brightness < 60) shade = "HF5";
    else if (brightness < 80) shade = "HF6";
    else if (brightness < 100) shade = "HF7";
    else if (brightness < 120) shade = "HF8";
    else if (brightness < 140) shade = "HF9";
    else if (brightness < 160) shade = "HF10";
    else if (brightness < 175) shade = "HF11";
    else if (brightness < 190) shade = "HF12";
    else if (brightness < 205) shade = "HF13";
    else if (brightness < 220) shade = "HF14";

    return res.status(200).json({
      predicted_label: shade,
      confidence: 0.85
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error processing image" });
  }
}
