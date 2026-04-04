import React, { useState } from "react";
import { analyzeSkinTone } from "./services/geminiService";

type GeminiResult = {
  bestMatch: string;
  reason: string;
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };

    reader.onerror = (error) => reject(error);
  });
};

const getShadeNumber = (shade: string): number | null => {
  const match = shade.match(/^HF(\d+)$/i);
  return match ? parseInt(match[1], 10) : null;
};

export default function App() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [bestMatch, setBestMatch] = useState<string>("");
  const [leftShade, setLeftShade] = useState<string>("");
  const [rightShade, setRightShade] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg("");
    setBestMatch("");
    setLeftShade("");
    setRightShade("");
    setReason("");

    try {
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      const base64 = await fileToBase64(file);
      const result = (await analyzeSkinTone(base64)) as GeminiResult | null;

      if (!result || !result.bestMatch) {
        setErrorMsg("Could not analyze image.");
        setLoading(false);
        return;
      }

      const best = result.bestMatch;
      const shadeNum = getShadeNumber(best);

      setBestMatch(best);
      setReason(result.reason || "");

      if (shadeNum !== null) {
        setLeftShade(shadeNum > 5 ? `HF${shadeNum - 1}` : "");
        setRightShade(shadeNum < 15 ? `HF${shadeNum + 1}` : "");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Something went wrong while analyzing the image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f7f1ed",
        fontFamily: "Arial, sans-serif",
        color: "#3d2a1f",
        padding: "30px 20px 60px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <h1
          style={{
            letterSpacing: "8px",
            color: "#9b6a3c",
            margin: 0,
            fontWeight: 600,
          }}
        >
          ALTOV BEAUTY
        </h1>
        <p style={{ marginTop: "12px", fontSize: "22px", fontWeight: 700 }}>
          AltoV Shade Match
        </p>
      </div>

      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <input type="file" accept="image/*" onChange={handleImageUpload} />
      </div>

      {loading && (
        <p style={{ textAlign: "center", fontWeight: 700 }}>Analyzing image...</p>
      )}

      {errorMsg && (
        <p style={{ textAlign: "center", color: "#b00020", fontWeight: 700 }}>
          {errorMsg}
        </p>
      )}

      {previewUrl && (
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <img
            src={previewUrl}
            alt="Uploaded preview"
            style={{
              width: "220px",
              maxWidth: "90%",
              borderRadius: "16px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            }}
          />
        </div>
      )}

      {bestMatch && !loading && (
        <div
          style={{
            maxWidth: "950px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "center",
            alignItems: "stretch",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          {leftShade && (
            <div
              style={{
                width: "220px",
                background: "#ffffff",
                borderRadius: "28px",
                padding: "24px",
                textAlign: "center",
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                opacity: 0.8,
              }}
            >
              <p style={{ fontSize: "20px", fontWeight: 700, marginTop: "20px" }}>
                {leftShade}
              </p>
              <p style={{ color: "#9b6a3c", fontWeight: 700 }}>NEAR MATCH</p>
            </div>
          )}

          <div
            style={{
              width: "300px",
              background: "#ffffff",
              borderRadius: "32px",
              padding: "28px",
              textAlign: "center",
              boxShadow: "0 10px 28px rgba(0,0,0,0.10)",
              border: "2px solid #a27043",
            }}
          >
            <div
              style={{
                display: "inline-block",
                background: "#9b6a3c",
                color: "#fff",
                padding: "10px 20px",
                borderRadius: "999px",
                fontWeight: 700,
                letterSpacing: "2px",
                marginBottom: "20px",
              }}
            >
              BEST MATCH
            </div>

            <p style={{ fontSize: "48px", fontWeight: 800, margin: "10px 0" }}>
              {bestMatch}
            </p>

            <p style={{ color: "#9b6a3c", fontWeight: 700, letterSpacing: "2px" }}>
              PRECISION IDENTIFIED
            </p>

            {reason && (
              <p style={{ marginTop: "18px", lineHeight: 1.5 }}>{reason}</p>
            )}
          </div>

          {rightShade && (
            <div
              style={{
                width: "220px",
                background: "#ffffff",
                borderRadius: "28px",
                padding: "24px",
                textAlign: "center",
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                opacity: 0.8,
              }}
            >
              <p style={{ fontSize: "20px", fontWeight: 700, marginTop: "20px" }}>
                {rightShade}
              </p>
              <p style={{ color: "#9b6a3c", fontWeight: 700 }}>NEAR MATCH</p>
            </div>
          )}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: "50px", fontSize: "14px" }}>
        © 2026 AltoV Beauty
      </div>
    </div>
  );
}
