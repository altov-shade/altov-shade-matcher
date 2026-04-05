import React, { useRef, useState, useEffect } from "react";

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
  debug?: {
    depthScore?: number;
    medianLuma?: number;
    medianR?: number;
    medianG?: number;
    medianB?: number;
    warmth?: number;
    sampleCount?: number;
  };
};

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isMobileDevice = () => {
    if (typeof navigator === "undefined") return false;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  };

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
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ imageBase64 })
      });

      const rawText = await response.text();

      let data: ApiResponse | { error?: string } | null = null;

      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(rawText || "Server returned an invalid response.");
      }

      if (!response.ok) {
        throw new Error((data as { error?: string })?.error || "Prediction failed.");
      }

      setResult(data as ApiResponse);
    } catch (error: any) {
      setErrorMsg(error?.message || "Something went wrong during analysis.");
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
  };

  const openDesktopCamera = async () => {
    try {
      setCameraError("");
      setCameraLoading(true);
      setCameraOpen(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 1280 }
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error: any) {
      setCameraError(
        error?.message || "Camera access failed. Please allow camera permissions."
      );
      setCameraOpen(true);
    } finally {
      setCameraLoading(false);
    }
  };

  const handleTakePhotoClick = async () => {
    setResult(null);
    setErrorMsg("");

    if (isMobileDevice()) {
      mobileCameraInputRef.current?.click();
      return;
    }

    await openDesktopCamera();
  };

  const captureFromWebcam = async () => {
    if (!videoRef.current) {
      setCameraError("Camera preview is not ready.");
      return;
    }

    try {
      const video = videoRef.current;
      const width = video.videoWidth || 1080;
      const height = video.videoHeight || 1080;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Could not capture photo.");
      }

      context.drawImage(video, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.95)
      );

      if (!blob) {
        throw new Error("Could not create image file.");
      }

      const file = new File([blob], `altov-camera-${Date.now()}.jpg`, {
        type: "image/jpeg"
      });

      onPickFile(file);
      closeCamera();
    } catch (error: any) {
      setCameraError(error?.message || "Could not capture photo.");
    }
  };

  const closeCamera = () => {
    stopCamera();
    setCameraOpen(false);
    setCameraLoading(false);
    setCameraError("");
  };

  const resetAll = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    stopCamera();

    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setLoading(false);
    setErrorMsg("");
    setCameraOpen(false);
    setCameraLoading(false);
    setCameraError("");

    if (uploadInputRef.current) uploadInputRef.current.value = "";
    if (mobileCameraInputRef.current) mobileCameraInputRef.current.value = "";
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <div style={styles.brand}>ALTOV BEAUTY</div>
        <div style={styles.title}>AltoV Shade Match</div>

        <div style={styles.topButtons}>
          <button
            onClick={handleTakePhotoClick}
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
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <input
          ref={mobileCameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        {cameraOpen && (
          <div style={styles.cameraOverlay}>
            <div style={styles.cameraModal}>
              <div style={styles.cameraHeader}>
                <div style={styles.cameraTitle}>Take Photo</div>
                <button onClick={closeCamera} style={styles.cameraCloseButton} type="button">
                  Close
                </button>
              </div>

              <div style={styles.cameraPreviewWrap}>
                {cameraLoading ? (
                  <div style={styles.cameraMessage}>Starting camera...</div>
                ) : (
                  <video
                    ref={videoRef}
                    style={styles.cameraVideo}
                    playsInline
                    muted
                    autoPlay
                  />
                )}
              </div>

              {cameraError ? <div style={styles.errorBox}>{cameraError}</div> : null}

              <div style={styles.cameraActionRow}>
                <button
                  onClick={captureFromWebcam}
                  style={styles.findShadeButton}
                  type="button"
                >
                  Capture
                </button>

                <button
                  onClick={closeCamera}
                  style={styles.smallResetButton}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {!previewUrl && !result && !cameraOpen && (
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
  isBest
}: {
  card: ShadeCard | null;
  label: string;
  isBest: boolean;
}) {
  if (!card) {
    return (
      <div style={styles.optionCard}>
        <div style={styles.spacerBadge} />
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
          <div style={styles.placeholderImage
