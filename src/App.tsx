import React, { useRef, useState } from "react";

type ShadeCard = {
  shadeCode: string;
  shadeName: string;
  productImage?: string;
  undertone?: string;
};

type ApiResponse = {
  success: boolean;
  match: ShadeCard;
  range: {
    minusOne: ShadeCard | null;
    selected: ShadeCard;
    plusOne: ShadeCard | null;
  };
};

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

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
      setErrorMsg("Please upload or take a clear face photo first.");
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

      setResult(data);
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

    if (uploadInputRef.current) uploadInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <div style={styles.brand}>ALTOV BEAUTY</div>
        <div style={styles.title}>AltoV Shade Match</div>

        <div style={styles.topButtons}>
          <button
            onClick={() => cameraInputRef.current?.click()}
            style={styles.blackButton}
            type="button"
          >
            Take Photo
          </button>

          <button
            onClick={() => uploadInputRef.current?.click()}
            style={styles.whiteButton}
            type="button"
          >
            Upload Photo
          </button>
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        {!previewUrl && !result && (
          <div style={styles.helperText}>
            Upload or take a clear face photo to begin.
          </div>
        )}

        {previewUrl && !result && (
          <div style={styles.previewSection}>
            <div style={styles.previewFrame}>
              <img src={previewUrl} alt="Preview" style={styles.previewImage} />
            </div>

            <div style={styles.actionRow}>
              <button
                onClick={analyzeImage}
                style={styles.findShadeButton}
                type="button"
                disabled={loading}
              >
                {loading ? "Matching..." : "Find My Shade"}
              </button>

              <button onClick={resetAll} style={styles.smallResetButton} type="button">
                Reset
              </button>
            </div>
          </div>
        )}

        {result && (
          <div style={styles.resultShell}>
            <div style={styles.resultGrid}>
              <div style={styles.faceColumn}>
                {previewUrl ? (
                  <div style={styles.faceImageFrame}>
                    <img src={previewUrl} alt="Selected face" style={styles.faceImage} />
                  </div>
                ) : null}
              </div>

              <ShadeOptionCard card={result.range.minusOne} label="NEAR MATCH" isBest={false} />

              <ShadeOptionCard
                card={result.range.selected}
                label="PRECISION IDENTIFIED"
                isBest={true}
              />

              <ShadeOptionCard card={result.range.plusOne} label="NEAR MATCH" isBest={false} />
            </div>

            <div style={styles.bottomActionRow}>
              <button onClick={resetAll} style={styles.smallResetButton} type="button">
                Reset
              </button>
            </div>
          </div>
        )}

        {errorMsg ? <div style={styles.errorBox}>{errorMsg}</div> : null}

        <div style={styles.footer}>© 2026 AltoV Beauty</div>
      </div>
    </div>
  );
}

function ShadeOptionCard({
  card,
  label,
  isBest,
}: {
  card: ShadeCard | null;
  label: string;
  isBest: boolean;
}) {
  if (!card) {
    return (
      <div style={styles.optionCard}>
        <div style={styles.placeholderImageBox} />
        <div style={styles.placeholderShade}>N/A</div>
        <div style={styles.placeholderLabel}>No shade</div>
      </div>
    );
  }

  return (
    <div style={isBest ? styles.bestCard : styles.optionCard}>
      {isBest ? <div style={styles.bestBadge}>BEST MATCH</div> : <div style={styles.spacerBadge} />}

      <div style={styles.productImageBox}>
        {card.productImage ? (
          <img
            src={card.productImage}
            alt={card.shadeCode}
            style={styles.productImage}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div style={styles.placeholderImageBox} />
        )}
      </div>

      <div style={styles.shadeName}>{card.shadeCode}</div>
      <div style={styles.shadeLabel}>{label}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f4efea",
    padding: "24px 16px 40px",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: "#2b1d15",
  },
  wrapper: {
    maxWidth: "1100px",
    margin: "0 auto",
    background: "#efe9e4",
    minHeight: "92vh",
    padding: "10px 16px 28px",
  },
  brand: {
    textAlign: "center",
    fontSize: "15px",
    letterSpacing: "0.45em",
    color: "#b07a34",
    fontWeight: 700,
    marginTop: "8px",
    marginBottom: "10px",
  },
  title: {
    textAlign: "center",
    fontSize: "20px",
    fontWeight: 500,
    marginBottom: "18px",
  },
  topButtons: {
    display: "flex",
    justifyContent: "center",
    gap: "14px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },
  blackButton: {
    border: "none",
    background: "#000000",
    color: "#ffffff",
    borderRadius: "999px",
    padding: "14px 22px",
    fontSize: "15px",
    cursor: "pointer",
    fontWeight: 600,
  },
  whiteButton: {
    border: "1px solid #cdb99f",
    background: "#f8f5f1",
    color: "#7f6a52",
    borderRadius: "999px",
    padding: "14px 22px",
    fontSize: "15px",
    cursor: "pointer",
    fontWeight: 600,
  },
  helperText: {
    textAlign: "center",
    color: "#9a8571",
    fontSize: "14px",
    marginBottom: "24px",
  },
  previewSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "18px",
  },
  previewFrame: {
    width: "100%",
    maxWidth: "460px",
    background: "#f6f1ec",
    border: "1px solid #dccbb8",
    borderRadius: "22px",
    padding: "10px",
  },
  previewImage: {
    width: "100%",
    borderRadius: "16px",
    display: "block",
  },
  actionRow: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  bottomActionRow: {
    display: "flex",
    justifyContent: "center",
    marginTop: "14px",
  },
  findShadeButton: {
    border: "none",
    background: "#ffffff",
    color: "#1f1a17",
    borderRadius: "14px",
    padding: "16px 22px",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
  },
  smallResetButton: {
    border: "1px solid #d8cabc",
    background: "#f8f5f1",
    color: "#7d6754",
    borderRadius: "8px",
    padding: "8px 14px",
    fontSize: "12px",
    cursor: "pointer",
    fontWeight: 500,
  },
  resultShell: {
    marginTop: "18px",
  },
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(120px, 160px) repeat(3, minmax(150px, 190px))",
    gap: "16px",
    justifyContent: "center",
    alignItems: "stretch",
    overflowX: "auto",
    paddingBottom: "8px",
  },
  faceColumn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  faceImageFrame: {
    width: "100%",
    maxWidth: "150px",
    background: "#f9f5f1",
    borderRadius: "18px",
    padding: "4px",
    boxShadow: "0 0 0 1px #ebddd0 inset",
  },
  faceImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "14px",
    display: "block",
  },
  optionCard: {
    minHeight: "360px",
    background: "#f4f1ee",
    borderRadius: "18px",
    padding: "14px 14px 18px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  bestCard: {
    minHeight: "360px",
    background: "#f7f3ef",
    borderRadius: "18px",
    padding: "14px 14px 18px",
    border: "2px solid #cba15a",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  bestBadge: {
    alignSelf: "flex-start",
    background: "#c99240",
    color: "#ffffff",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    padding: "8px 14px",
    marginBottom: "14px",
    letterSpacing: "0.08em",
  },
  spacerBadge: {
    height: "38px",
    marginBottom: "14px",
  },
  productImageBox: {
    width: "100%",
    height: "180px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ece9e6",
    borderRadius: "8px",
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
  },
  placeholderImageBox: {
    width: "100%",
    height: "100%",
    background: "#e6e1dc",
  },
  shadeName: {
    marginTop: "16px",
    fontSize: "22px",
    fontWeight: 800,
    color: "#5a3622",
    textAlign: "center",
  },
  shadeLabel: {
    marginTop: "8px",
    fontSize: "12px",
    letterSpacing: "0.18em",
    color: "#c38d46",
    textAlign: "center",
    fontWeight: 700,
  },
  placeholderShade: {
    marginTop: "16px",
    fontSize: "20px",
    fontWeight: 700,
    color: "#8f7f72",
    textAlign: "center",
  },
  placeholderLabel: {
    marginTop: "8px",
    fontSize: "12px",
    letterSpacing: "0.12em",
    color: "#b59f8f",
    textAlign: "center",
  },
  errorBox: {
    maxWidth: "560px",
    margin: "18px auto 0",
    background: "#fff1f0",
    border: "1px solid #e6b7b3",
    color: "#8a3732",
    borderRadius: "12px",
    padding: "12px 14px",
    textAlign: "center",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  footer: {
    textAlign: "center",
    fontSize: "12px",
    color: "#5d4c40",
    marginTop: "26px",
  },
};

export default App;
