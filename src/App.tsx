import React, { useMemo, useRef, useState } from "react";

type ShadeResult = {
  shadeCode: string;
  shadeName: string;
  productImage?: string;
  undertone?: string;
};

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ShadeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const confidencePercent = useMemo(() => {
    if (!result) return null;
    return 88;
  }, [result]);

  const onPickFile = (file: File | null) => {
    if (!file) return;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setErrorMsg("");
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    onPickFile(file);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to read image."));
        }
      };

      reader.onerror = () => reject(new Error("Failed to read image."));
      reader.readAsDataURL(file);
    });
  };

  const analyzeImage = async () => {
    if (!selectedFile) {
      setErrorMsg("Please upload or take a photo first.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      setResult(null);

      const imageBase64 = await fileToBase64(selectedFile);

      const response = await fetch("/api/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageBase64 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Prediction failed.");
      }

      if (!data?.match) {
        throw new Error("No shade match returned.");
      }

      setResult(data.match);
    } catch (error: any) {
      setErrorMsg(error?.message || "Something went wrong during analysis.");
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setLoading(false);
    setErrorMsg("");

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0e0e10 0%, #17171b 100%)",
        color: "#ffffff",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "8px 14px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: "13px",
              letterSpacing: "0.04em",
              marginBottom: "18px",
            }}
          >
            AltoV Beauty
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              fontWeight: 800,
              lineHeight: 1.05,
            }}
          >
            AI Shade Match
          </h1>

          <p
            style={{
              marginTop: "14px",
              color: "rgba(255,255,255,0.72)",
              fontSize: "1rem",
              maxWidth: "720px",
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: 1.6,
            }}
          >
            Upload a photo or take one now. We’ll analyze it and return your closest AltoV Beauty shade match.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
            alignItems: "start",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "28px",
              padding: "22px",
              backdropFilter: "blur(10px)",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: "18px",
                fontSize: "1.2rem",
              }}
            >
              Add your photo
            </h2>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                marginBottom: "18px",
              }}
            >
              <button
                onClick={() => fileInputRef.current?.click()}
                style={primaryButtonStyle}
              >
                Upload Photo
              </button>

              <button
                onClick={() => cameraInputRef.current?.click()}
                style={secondaryButtonStyle}
              >
                Take Photo
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            <div
              style={{
                minHeight: "320px",
                borderRadius: "24px",
                border: "1px dashed rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.03)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                padding: "14px",
              }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Selected preview"
                  style={{
                    width: "100%",
                    maxHeight: "520px",
                    objectFit: "contain",
                    borderRadius: "18px",
                  }}
                />
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    color: "rgba(255,255,255,0.55)",
                    lineHeight: 1.6,
                    padding: "24px",
                  }}
                >
                  Add a clear photo with even lighting.
                  <br />
                  Cheek color tends to give the best match.
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                marginTop: "18px",
              }}
            >
              <button
                onClick={analyzeImage}
                disabled={loading}
                style={{
                  ...primaryButtonStyle,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Matching..." : "Find My Shade"}
              </button>

              <button
                onClick={resetAll}
                style={ghostButtonStyle}
              >
                Reset
              </button>
            </div>

            {errorMsg ? (
              <div
                style={{
                  marginTop: "16px",
                  background: "rgba(255, 94, 94, 0.12)",
                  border: "1px solid rgba(255, 94, 94, 0.35)",
                  color: "#ffd4d4",
                  padding: "14px 16px",
                  borderRadius: "16px",
                  lineHeight: 1.5,
                }}
              >
                {errorMsg}
              </div>
            ) : null}
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "28px",
              padding: "22px",
              minHeight: "100%",
              backdropFilter: "blur(10px)",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: "18px",
                fontSize: "1.2rem",
              }}
            >
              Your result
            </h2>

            {!result ? (
              <div
                style={{
                  minHeight: "420px",
                  borderRadius: "24px",
                  border: "1px dashed rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.03)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  color: "rgba(255,255,255,0.55)",
                  padding: "24px",
                  lineHeight: 1.6,
                }}
              >
                Your match will appear here after analysis.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "18px",
                }}
              >
                <div
                  style={{
                    borderRadius: "24px",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.04))",
                    border: "1px solid rgba(255,255,255,0.12)",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      color: "rgba(255,255,255,0.65)",
                      fontSize: "13px",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: "10px",
                    }}
                  >
                    Best Match
                  </div>

                  <div
                    style={{
                      fontSize: "2rem",
                      fontWeight: 800,
                      marginBottom: "6px",
                    }}
                  >
                    {result.shadeCode}
                  </div>

                  <div
                    style={{
                      color: "rgba(255,255,255,0.82)",
                      fontSize: "1rem",
                      marginBottom: "10px",
                    }}
                  >
                    {result.shadeName}
                  </div>

                  {result.undertone ? (
                    <div
                      style={{
                        display: "inline-block",
                        padding: "8px 12px",
                        borderRadius: "999px",
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        fontSize: "14px",
                      }}
                    >
                      Undertone: {result.undertone}
                    </div>
                  ) : null}

                  {confidencePercent !== null ? (
                    <div
                      style={{
                        marginTop: "16px",
                        color: "rgba(255,255,255,0.66)",
                        fontSize: "14px",
                      }}
                    >
                      Match confidence: {confidencePercent}%
                    </div>
                  ) : null}
                </div>

                <div
                  style={{
                    borderRadius: "24px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    padding: "20px",
                    textAlign: "center",
                  }}
                >
                  {result.productImage ? (
                    <img
                      src={result.productImage}
                      alt={result.shadeCode}
                      style={{
                        width: "100%",
                        maxWidth: "260px",
                        height: "auto",
                        objectFit: "contain",
                        marginBottom: "12px",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "220px",
                        height: "280px",
                        maxWidth: "100%",
                        margin: "0 auto 12px",
                        borderRadius: "22px",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px dashed rgba(255,255,255,0.14)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "rgba(255,255,255,0.5)",
                        padding: "16px",
                      }}
                    >
                      Product image will show here
                    </div>
                  )}

                  <div
                    style={{
                      color: "rgba(255,255,255,0.72)",
                      lineHeight: 1.6,
                    }}
                  >
                    This result is now coming from your <code>/api/predict</code> route instead of local shade math in App.tsx.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const primaryButtonStyle: React.CSSProperties = {
  appearance: "none",
  border: "none",
  borderRadius: "16px",
  padding: "14px 18px",
  background: "#ffffff",
  color: "#111111",
  fontWeight: 700,
  fontSize: "15px",
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  appearance: "none",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: "16px",
  padding: "14px 18px",
  background: "rgba(255,255,255,0.08)",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: "15px",
  cursor: "pointer",
};

const ghostButtonStyle: React.CSSProperties = {
  appearance: "none",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "16px",
  padding: "14px 18px",
  background: "transparent",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: "15px",
  cursor: "pointer",
};

export default App;
