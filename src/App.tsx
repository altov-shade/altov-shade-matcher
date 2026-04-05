import React, { useMemo, useRef, useState } from "react";
import { getNeighborShades } from "./lib/shades";
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

  const getBrightness = (image: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = image.width;
    canvas.height = image.height;

    ctx?.drawImage(image, 0, 0);

    const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData?.data;

    let total = 0;
    let count = 0;

    for (let i = 0; i < data!.length; i += 4) {
      const r = data![i];
      const g = data![i + 1];
      const b = data![i + 2];

      const brightness = (r + g + b) / 3;

      total += brightness;
      count++;
    }

    return total / count;
  };

  const handleFileChange = async (file: File | null) => {
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

    setLoading(true);

    const img = new Image();
    img.src = objectUrl;

    img.onload = async () => {
      try {
        const brightness = getBrightness(img);

        const response = await fetch("/api/predict", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ brightness }),
        });

        if (!response.ok) {
          throw new Error("Prediction failed");
        }

        const data = await response.json();

        const shadeResult = getNeighborShades(data.predicted_label);
        shadeResult.confidence =
          typeof data.confidence === "number" ? data.confidence : 0;

        setResult(shadeResult);
      } catch (error) {
        console.error(error);
        setErrorMsg("Error analyzing image.");
      } finally {
        setLoading(false);
      }
    };

    img.onerror = () => {
      setLoading(false);
      setErrorMsg("Could not load the selected image.");
    };
  };

  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    handleFileChange(file);
  };

  const resetAll = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setErrorMsg("");
    setLoading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f3ef",
        fontFamily: "Arial, sans-serif",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <div
          style={{
            letterSpacing: "10px",
            fontSize: "22px",
            color: "#b07a3b",
            fontWeight: 600,
            marginBottom: "28px",
            marginTop: "10px",
          }}
        >
          ALTOV BEAUTY
        </div>

        <h1 style={{ marginTop: 0, marginBottom: "28px", color: "#2b1d16" }}>
          AltoV Shade Match
        </h1>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "16px",
            marginBottom: "36px",
            flexWrap: "wrap",
          }}
        >
          <button
            style={{
              padding: "16px 34px",
              borderRadius: "999px",
              border: "none",
              background: "#000",
              color: "#fff",
              fontSize: "18px",
              cursor: "pointer",
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            Take Photo
          </button>

          <button
            style={{
              padding: "16px 34px",
              borderRadius: "999px",
              border: "1px solid #cbb9a6",
              background: "#fff",
              color: "#7a4d21",
              fontSize: "18px",
              cursor: "pointer",
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload Photo
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={onInputChange}
            style={{ display: "none" }}
          />
        </div>

        {errorMsg && (
          <div
            style={{
              margin: "0 auto 24px",
              maxWidth: "760px",
              padding: "12px 14px",
              borderRadius: "10px",
              background: "#fff2f2",
              color: "#b00020",
            }}
          >
            {errorMsg}
          </div>
        )}

        {loading && (
          <div style={{ marginBottom: "24px", color: "#5a4638" }}>
            Analyzing your photo...
          </div>
        )}

        {(previewUrl || result) && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: "28px",
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                background: "#f8f8f8",
                borderRadius: "28px",
                minHeight: "350px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                padding: "16px",
              }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "24px",
                  }}
                />
              ) : null}
            </div>

            {result?.top3.map((shade) => {
              const isCenter = shade === result.bestMatch;

              return (
                <div
                  key={shade}
                  style={{
                    background: "#fbfbfb",
                    borderRadius: "28px",
                    minHeight: "520px",
                    padding: "34px 22px",
                    border: isCenter ? "2px solid #b07a3b" : "1px solid #f0ece7",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: isCenter ? "0 8px 24px rgba(0,0,0,0.04)" : "none",
                  }}
                >
                  {isCenter && (
                    <div
                      style={{
                        background: "#c28a43",
                        color: "#fff",
                        borderRadius: "999px",
                        padding: "16px 28px",
                        fontWeight: 700,
                        fontSize: "18px",
                        letterSpacing: "2px",
                        marginBottom: "28px",
                      }}
                    >
                      BEST MATCH
                    </div>
                  )}

                  <div
                    style={{
                      width: "180px",
                      height: "250px",
                      background: "#f4f4f4",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "26px",
                    }}
                  >
                    <img
                      src="/altoV Favicon.png"
                      alt={shade}
                      style={{
                        maxWidth: isCenter ? "110px" : "85px",
                        opacity: isCenter ? 1 : 0.75,
                      }}
                    />
                  </div>

                  <div
                    style={{
                      fontSize: isCenter ? "76px" : "40px",
                      fontWeight: 800,
                      color: "#4c2d1d",
                      lineHeight: 1,
                      marginBottom: "18px",
                    }}
                  >
                    {shade}
                  </div>

                  <div
                    style={{
                      letterSpacing: "4px",
                      fontSize: isCenter ? "20px" : "16px",
                      color: "#b07a3b",
                      fontWeight: 600,
                    }}
                  >
                    {isCenter ? "PRECISION IDENTIFIED" : "NEAR MATCH"}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!previewUrl && !result && (
          <div style={{ color: "#6c5a4c", marginTop: "20px" }}>
            Upload or take a clear face photo to begin.
          </div>
        )}

        <div style={{ marginTop: "36px" }}>
          <button
            onClick={resetAll}
            style={{
              padding: "12px 20px",
              borderRadius: "10px",
              border: "1px solid #d5c7b8",
              background: "#fff",
              color: "#5a4638",
              cursor: "pointer",
            }}
          >
            Reset
          </button>
        </div>

        <div style={{ marginTop: "40px", color: "#3f2e23" }}>
          © 2026 AltoV Beauty
        </div>
      </div>
    </div>
  );
}

export default App;
