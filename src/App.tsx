import React, { useState, useMemo, useRef } from "react";
import { analyzeShade } from "./services/analyzeShade";
import type { ShadeResult } from "./lib/shades";

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ShadeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const confidencePercent = useMemo(() => {
    if (!result) return null;
    return Math.round(result.confidence * 100);
  }, [result]);

  const handleFileChange = (file: File | null) => {
    setErrorMsg("");
    setResult(null);

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    handleFileChange(file);
  };

  const runPrediction = async () => {
    if (!selectedFile) {
      setErrorMsg("Please upload a photo first.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      setResult(null);

      const prediction = await analyzeShade(selectedFile);
      setResult(prediction);
    } catch (error) {
      console.error(error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Something went wrong while analyzing the image."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setErrorMsg("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f7f7",
        fontFamily: "Arial, sans-serif",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          background: "#fff",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: "8px" }}>Shade Match</h1>
        <p style={{ marginTop: 0, color: "#555" }}>
          Upload a clear face photo to get your best match plus one shade deeper
          and one shade lighter.
        </p>

        <div style={{ marginTop: "20px", marginBottom: "16px" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onInputChange}
          />
        </div>

        {previewUrl && (
          <div style={{ marginBottom: "20px" }}>
            <img
              src={previewUrl}
              alt="Preview"
              style={{
                width: "100%",
                maxWidth: "320px",
                borderRadius: "12px",
                display: "block",
              }}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={runPrediction}
            disabled={loading}
            style={{
              padding: "12px 18px",
              borderRadius: "10px",
              border: "none",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {loading ? "Analyzing..." : "Find My Shade"}
          </button>

          <button
            onClick={resetAll}
            disabled={loading}
            style={{
              padding: "12px 18px",
              borderRadius: "10px",
              border: "1px solid #ccc",
              background: "#fff",
              color: "#111",
              cursor: "pointer",
            }}
          >
            Reset
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              marginTop: "20px",
              padding: "12px 14px",
              borderRadius: "10px",
              background: "#fff2f2",
              color: "#b00020",
            }}
          >
            {errorMsg}
          </div>
        )}

        {result && (
          <div
            style={{
              marginTop: "24px",
              padding: "20px",
              borderRadius: "14px",
              background: "#fafafa",
              border: "1px solid #eee",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Your Shade Match</h2>

            <div style={{ marginBottom: "12px" }}>
              <strong>Best Match:</strong> {result.bestMatch}
            </div>

            {confidencePercent !== null && (
              <div style={{ marginBottom: "12px" }}>
                <strong>Confidence:</strong> {confidencePercent}%
              </div>
            )}

            <div style={{ marginBottom: "8px" }}>
              <strong>Your Range:</strong>
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {result.top3.map((shade, idx) => {
                const isCenter = shade === result.bestMatch;

                return (
                  <div
                    key={`${shade}-${idx}`}
                    style={{
                      minWidth: "100px",
                      padding: "14px",
                      borderRadius: "12px",
                      border: isCenter ? "2px solid #111" : "1px solid #ddd",
                      background: isCenter ? "#fff" : "#f3f3f3",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#666",
                        marginBottom: "4px",
                      }}
                    >
                      {shade === result.darker
                        ? "-1"
                        : shade === result.bestMatch
                        ? "Best"
                        : "+1"}
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 700 }}>
                      {shade}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
