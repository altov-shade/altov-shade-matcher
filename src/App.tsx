import React, { useEffect, useRef, useState } from "react";
import { analyzeSkinTone } from "./services/geminiService";

type GeminiResult = {
  bestMatch: string;
  reason: string;
};

const fileToBase64 = (
  file: File
): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = () => {
      const result = reader.result as string;
      const [header, data] = result.split(",");
      const mimeMatch = header.match(/data:(.*?);base64/);
      const mimeType = mimeMatch?.[1] || file.type || "image/jpeg";

      resolve({
        base64: data,
        mimeType,
      });
    };

    reader.onerror = (error) => reject(error);
  });
};

const getShadeNumber = (shade: string): number | null => {
  const match = shade.match(/^HF(\d+)$/i);
  return match ? parseInt(match[1], 10) : null;
};

export default function App() {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [bestMatch, setBestMatch] = useState<string>("");
  const [leftShade, setLeftShade] = useState<string>("");
  const [rightShade, setRightShade] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const resetResults = () => {
    setErrorMsg("");
    setBestMatch("");
    setLeftShade("");
    setRightShade("");
    setReason("");
  };

  const applyResult = (result: GeminiResult | null) => {
    if (!result || !result.bestMatch) {
      setErrorMsg("Could not analyze image.");
      return;
    }

    const best = result.bestMatch;
    const shadeNum = getShadeNumber(best);

    setBestMatch(best);
    setReason(result.reason || "");

    if (shadeNum !== null) {
      setLeftShade(shadeNum > 5 ? `HF${shadeNum - 1}` : "");
      setRightShade(shadeNum < 15 ? `HF${shadeNum + 1}` : "");
    } else {
      setLeftShade("");
      setRightShade("");
    }
  };

  const analyzeFromBase64 = async (
    base64: string,
    mimeType: string,
    preview: string
  ) => {
    setLoading(true);
    resetResults();
    setPreviewUrl(preview);

    try {
      const result = await analyzeSkinTone(base64, mimeType);
      applyResult(result);
    } catch (error) {
      console.error(error);
      setErrorMsg("Something went wrong while analyzing the image.");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const preview = URL.createObjectURL(file);
      const { base64, mimeType } = await fileToBase64(file);
      await analyzeFromBase64(base64, mimeType, preview);
    } catch (error) {
      console.error(error);
      setErrorMsg("Could not read image file.");
    }
  };

  const openCamera = async () => {
    try {
      resetResults();
      setCameraOpen(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error(error);
      setCameraOpen(false);
      setErrorMsg("Could not access camera.");
    }
  };

  const closeCamera = () => {
    stopCamera();
    setCameraOpen(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setErrorMsg("Could not capture photo.");
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const [header, base64] = dataUrl.split(",");
    const mimeMatch = header.match(/data:(.*?);base64/);
    const mimeType = mimeMatch?.[1] || "image/jpeg";

    closeCamera();
    await analyzeFromBase64(base64, mimeType, dataUrl);
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
        <button
          onClick={openCamera}
          style={{
            background: "#000",
            color: "#fff",
            border: "none",
            borderRadius: "999px",
            padding: "10px 18px",
            marginRight: "10px",
            cursor: "pointer",
          }}
        >
          Take Photo
        </button>

        <button
          onClick={() => uploadInputRef.current?.click()}
          style={{
            background: "#fff",
            color: "#3d2a1f",
            border: "1px solid #d8c8bc",
            borderRadius: "999px",
            padding: "10px 18px",
            cursor: "pointer",
          }}
        >
          Upload Photo
        </button>

        <input
          ref={uploadInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleUploadChange}
          style={{ display: "none" }}
        />
      </div>

      {cameraOpen && (
        <div
          style={{
            maxWidth: "720px",
            margin: "0 auto 28px",
            background: "#fff",
            borderRadius: "24px",
            padding: "20px",
            boxShadow: "0 10px 28px rgba(0,0,0,0.10)",
            textAlign: "center",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              maxWidth: "520px",
              borderRadius: "16px",
              background: "#ddd",
            }}
          />

          <div style={{ marginTop: "16px" }}>
            <button
              onClick={capturePhoto}
              style={{
                background: "#9b6a3c",
                color: "#fff",
                border: "none",
                borderRadius: "999px",
                padding: "10px 18px",
                marginRight: "10px",
                cursor: "pointer",
              }}
            >
              Capture
            </button>

            <button
              onClick={closeCamera}
              style={{
                background: "#fff",
                color: "#3d2a1f",
                border: "1px solid #d8c8bc",
                borderRadius: "999px",
                padding: "10px 18px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
