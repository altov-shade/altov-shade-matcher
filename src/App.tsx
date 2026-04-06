import React, { useEffect, useRef, useState } from "react";

type ShadeCard = {
  shadeCode: string;
  productImage?: string;
};

type ApiResponse = {
  success: boolean;
  match?: ShadeCard;
  range?: {
    minusOne: ShadeCard | null;
    selected: ShadeCard | null;
    plusOne: ShadeCard | null;
  };
  debug?: {
    luma?: number;
    warmth?: number;
    score?: number;
  };
  error?: string;
};

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);

  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const resetAll = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setErrorMsg("");
    setLoading(false);
    setCameraOpen(false);
    stopCamera();

    if (uploadInputRef.current) uploadInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const applyPickedFile = (file: File | null) => {
    if (!file) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setErrorMsg("");
  };

  const handleUploadChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    applyPickedFile(file);
  };

  const openDesktopCamera = async () => {
    try {
      setCameraLoading(true);
      setCameraOpen(true);
      setErrorMsg("");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 1280 }
        },
        audio: false
      });

      streamRef.current = stream;

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      }, 50);
    } catch {
      setCameraOpen(false);
      setErrorMsg("Camera access was blocked or unavailable. Please upload a photo instead.");
    } finally {
      setCameraLoading(false);
    }
  };

  const handleTakePhotoClick = async () => {
    const isMobile =
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    if (isMobile) {
      cameraInputRef.current?.click();
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg("Your browser does not support webcam capture here. Please upload a photo instead.");
      return;
    }

    await openDesktopCamera();
  };

  const captureFromWebcam = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setErrorMsg("Camera was not ready.");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 1080;
    const height = video.videoHeight || 1080;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setErrorMsg("Could not capture image.");
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.95);
    });

    if (!blob) {
      setErrorMsg("Could not capture image.");
      return;
    }

    const file = new File([blob], "webcam-capture.jpg", {
      type: "image/jpeg"
    });

    applyPickedFile(file);
    setCameraOpen(false);
    stopCamera();
  };

  const closeCamera = () => {
    setCameraOpen(false);
    stopCamera();
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
      setErrorMsg("Upload a clear face photo to begin.");
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
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ imageBase64 })
      });

      const text = await response.text();

      let data: ApiResponse | null = null;

      try {
        data = JSON.parse(text) as ApiResponse;
      } catch {
        throw new Error(text || "The server returned an unexpected response.");
      }

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

  const minusOne = result?.range?.minusOne || null;
  const selected = result?.range?.selected || result?.match || null;
  const plusOne = result?.range?.plusOne || null;

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <div style={styles.brand}>ALTOV BEAUTY</div>
        <div style={styles.title}>AltoV Shade Match</div>

        <div style={styles.topButtons}>
          <button onClick={handleTakePhotoClick} style={styles.blackButton} type="button">
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
          accept="image/png,image/jpeg,image/jpg"
          capture="environment"
          onChange={handleUploadChange}
          style={{ display: "none" }}
        />

        <input
          ref={uploadInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleUploadChange}
          style={{ display: "none" }}
        />

        {cameraOpen && (
          <div style={styles.cameraOverlay}>
            <div style={styles.cameraModal}>
              <div style={styles.cameraTitle}>Take Photo</div>

              <div style={styles.cameraFrame}>
                {cameraLoading ? (
                  <div style={styles.cameraLoading}>Opening camera...</div>
                ) : (
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    style={styles.cameraVideo}
                  />
                )}
              </div>

              <div style={styles.cameraButtonRow}>
                <button onClick={captureFromWebcam} style={styles.captureButton} type="button">
                  Capture
                </button>

                <button onClick={closeCamera} style={styles.cancelButton} type="button">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />

        {!previewUrl && !result && (
          <div style={styles.helperText}>
            Upload a clear face photo to begin.
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

        {result && selected && (
          <div style={styles.resultShell}>
            <div style={styles.resultGrid}>
              <div style={styles.faceColumn}>
                {previewUrl ? (
                  <div style={styles.faceImageFrame}>
                    <img src={previewUrl} alt="Selected face" style={styles.faceImage} />
                  </div>
                ) : null}
              </div>

              {minusOne ? (
                <ShadeOptionCard card={minusOne} label="CLOSE MATCH" isBest={false} />
              ) : (
                <div />
              )}

              <ShadeOptionCard card={selected} label="BEST MATCH" isBest={true} />

              {plusOne ? (
                <ShadeOptionCard card={plusOne} label="ALSO CONSIDER" isBest={false} />
              ) : (
                <div />
              )}
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
  isBest
}: {
  card: ShadeCard;
  label: string;
  isBest: boolean;
}) {
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
    color: "#2b1d15"
  },
  wrapper: {
    maxWidth: "1100px",
    margin: "0 auto",
    background: "#efe9e4",
    minHeight: "92vh",
    padding: "10px 16px 28px"
  },
  brand: {
    textAlign: "center",
    fontSize: "15px",
    letterSpacing: "0.45em",
    color: "#b07a34",
    fontWeight: 700,
    marginTop: "8px",
    marginBottom: "10px"
  },
  title: {
    textAlign: "center",
    fontSize: "20px",
    fontWeight: 500,
    marginBottom: "18px"
  },
  topButtons: {
    display: "flex",
    justifyContent: "center",
    gap: "14px",
    flexWrap: "wrap",
    marginBottom: "20px"
  },
  blackButton: {
    border: "none",
    background: "#000000",
    color: "#ffffff",
    borderRadius: "999px",
    padding: "14px 22px",
    fontSize: "15px",
    cursor: "pointer",
    fontWeight: 600
  },
  whiteButton: {
    border: "1px solid #cdb99f",
    background: "#f8f5f1",
    color: "#7f6a52",
    borderRadius: "999px",
    padding: "14px 22px",
    fontSize: "15px",
    cursor: "pointer",
    fontWeight: 600
  },
  helperText: {
    textAlign: "center",
    color: "#9a8571",
    fontSize: "14px",
    marginBottom: "24px"
  },
  previewSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "18px"
  },
  previewFrame: {
    width: "100%",
    maxWidth: "560px",
    background: "#f6f1ec",
    border: "1px solid #dccbb8",
    borderRadius: "22px",
    padding: "10px"
  },
  previewImage: {
    width: "100%",
    borderRadius: "16px",
    display: "block"
  },
  actionRow: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    flexWrap: "wrap"
  },
  bottomActionRow: {
    display: "flex",
    justifyContent: "center",
    marginTop: "14px"
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
    boxShadow: "0 1px 0 rgba(0,0,0,0.04)"
  },
  smallResetButton: {
    border: "1px solid #d8cabc",
    background: "#f8f5f1",
    color: "#7d6754",
    borderRadius: "8px",
    padding: "8px 14px",
    fontSize: "12px",
    cursor: "pointer",
    fontWeight: 500
  },
  resultShell: {
    marginTop: "18px"
  },
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(120px, 160px) repeat(3, minmax(150px, 190px))",
    gap: "16px",
    justifyContent: "center",
    alignItems: "stretch",
    overflowX: "auto",
    paddingBottom: "8px"
  },
  faceColumn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  faceImageFrame: {
    width: "100%",
    maxWidth: "150px",
    background: "#f9f5f1",
    borderRadius: "18px",
    padding: "4px",
    boxShadow: "0 0 0 1px #ebddd0 inset"
  },
  faceImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "14px",
    display: "block"
  },
  optionCard: {
    minHeight: "360px",
    background: "#f4f1ee",
    borderRadius: "18px",
    padding: "14px 14px 18px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start"
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
    justifyContent: "flex-start"
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
    letterSpacing: "0.08em"
  },
  spacerBadge: {
    height: "38px",
    marginBottom: "14px"
  },
  productImageBox: {
    width: "100%",
    height: "180px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ece9e6",
    borderRadius: "8px",
    overflow: "hidden"
  },
  productImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block"
  },
  placeholderImageBox: {
    width: "100%",
    height: "100%",
    background: "#e6e1dc"
  },
  shadeName: {
    marginTop: "16px",
    fontSize: "22px",
    fontWeight: 800,
    color: "#5a3622",
    textAlign: "center"
  },
  shadeLabel: {
    marginTop: "8px",
    fontSize: "12px",
    letterSpacing: "0.18em",
    color: "#c38d46",
    textAlign: "center",
    fontWeight: 700
  },
  errorBox: {
    maxWidth: "640px",
    margin: "18px auto 0",
    background: "#fff1f0",
    border: "1px solid #e6b7b3",
    color: "#8a3732",
    borderRadius: "12px",
    padding: "12px 14px",
    textAlign: "center",
    fontSize: "14px",
    lineHeight: 1.5
  },
  footer: {
    textAlign: "center",
    fontSize: "12px",
    color: "#5d4c40",
    marginTop: "26px"
  },
  cameraOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(20, 16, 13, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px"
  },
  cameraModal: {
    width: "100%",
    maxWidth: "720px",
    background: "#f7f2ec",
    borderRadius: "24px",
    padding: "20px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.18)"
  },
  cameraTitle: {
    textAlign: "center",
    fontSize: "22px",
    fontWeight: 700,
    color: "#4f3424",
    marginBottom: "16px"
  },
  cameraFrame: {
    width: "100%",
    borderRadius: "20px",
    overflow: "hidden",
    background: "#ded7cf",
    minHeight: "320px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  cameraVideo: {
    width: "100%",
    display: "block"
  },
  cameraLoading: {
    color: "#6f5a49",
    fontSize: "16px",
    padding: "30px"
  },
  cameraButtonRow: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    marginTop: "16px",
    flexWrap: "wrap"
  },
  captureButton: {
    border: "none",
    background: "#111111",
    color: "#ffffff",
    borderRadius: "14px",
    padding: "14px 20px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer"
  },
  cancelButton: {
    border: "1px solid #ccb9a5",
    background: "#fffaf5",
    color: "#6d5949",
    borderRadius: "14px",
    padding: "14px 20px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer"
  }
};

export default App;
