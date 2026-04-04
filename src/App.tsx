import React, { useEffect, useRef, useState } from "react";
import { analyzeSkinTone } from "./services/geminiService";

type GeminiResult = {
  bestMatch: string;
  reason: string;
};

type ShadeCard = {
  shade: string;
  image: string;
  isBestMatch: boolean;
};

const MIN_SHADE = 5;
const MAX_SHADE = 15;

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

const buildShadeCards = (bestShade: string): ShadeCard[] => {
  const shadeNumber = getShadeNumber(bestShade);
  if (!shadeNumber) return [];

  const range = [shadeNumber - 1, shadeNumber, shadeNumber + 1].filter(
    (num) => num >= MIN_SHADE && num <= MAX_SHADE
  );

  return range.map((num) => {
    const shade = `HF${num}`;
    return {
      shade,
      image: `/images/${shade}.png`,
      isBestMatch: num === shadeNumber,
    };
  });
};

function ShadePanel({
  card,
  reason,
  small = false,
}: {
  card: ShadeCard;
  reason?: string;
  small?: boolean;
}) {
  return (
    <div
      style={{
        width: small ? 260 : 370,
        minHeight: small ? 430 : 620,
        background: "#f9f9f9",
        borderRadius: 36,
        padding: "26px 24px 30px",
        textAlign: "center",
        boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
        border: card.isBestMatch ? "2px solid #b07a3f" : "none",
        opacity: small ? 0.82 : 1,
        position: "relative",
      }}
    >
      {card.isBestMatch && (
        <div
          style={{
            display: "inline-block",
            background: "#b07a3f",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 999,
            fontWeight: 700,
            letterSpacing: "2px",
            fontSize: 16,
            marginBottom: 18,
          }}
        >
          BEST MATCH
        </div>
      )}

      <div
        style={{
          minHeight: 230,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={card.image}
          alt={card.shade}
          style={{
            maxWidth: small ? 120 : 180,
            maxHeight: small ? 180 : 260,
            objectFit: "contain",
          }}
        />
      </div>

      <div
        style={{
          fontSize: small ? 26 : 60,
          fontWeight: 800,
          color: "#4b3327",
          marginTop: 8,
        }}
      >
        {card.shade}
      </div>

      <div
        style={{
          color: "#b07a3f",
          fontWeight: 700,
          letterSpacing: "3px",
          fontSize: small ? 16 : 18,
          marginTop: 12,
          marginBottom: card.isBestMatch ? 22 : 0,
        }}
      >
        {card.isBestMatch ? "PRECISION IDENTIFIED" : "NEAR MATCH"}
      </div>

      {card.isBestMatch && reason && (
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.5,
            color: "#4b3327",
            maxWidth: 270,
            margin: "0 auto",
          }}
        >
          {reason}
        </p>
      )}
    </div>
  );
}

export default function App() {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cards, setCards] = useState<ShadeCard[]>([]);
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
    setCards([]);
    setReason("");
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
      const result = (await analyzeSkinTone(
        base64,
        mimeType
      )) as GeminiResult | null;

      if (!result || !result.bestMatch) {
        setErrorMsg("Could not analyze image.");
        return;
      }

      setCards(buildShadeCards(result.bestMatch));
      setReason(result.reason || "");
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

  const leftCard =
    cards.length === 3 ? cards[0] : cards.length === 2 ? cards[0] : null;
  const centerCard =
    cards.length === 3 ? cards[1] : cards.length === 1 ? cards[0] : null;
  const rightCard =
    cards.length === 3 ? cards[2] : cards.length === 2 ? cards[1] : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3eeea",
        fontFamily: "Arial, sans-serif",
        color: "#3d2a1f",
        padding: "10px 12px 40px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div
          style={{
            letterSpacing: "10px",
            color: "#9b6a3c",
            fontWeight: 600,
            fontSize: 22,
            marginTop: 4,
          }}
        >
          ALTOV BEAUTY
        </div>

        <div
          style={{
            marginTop: 18,
            fontSize: 26,
            fontWeight: 700,
            color: "#3d2a1f",
          }}
        >
          AltoV Shade Match
        </div>

        <div style={{ marginTop: 18 }}>
          <button
            onClick={openCamera}
            style={{
              background: "#000",
              color: "#fff",
              border: "none",
              borderRadius: 999,
              padding: "14px 28px",
              marginRight: 12,
              cursor: "pointer",
              fontSize: 16,
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
              borderRadius: 999,
              padding: "14px 28px",
              cursor: "pointer",
              fontSize: 16,
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
      </div>

      {cameraOpen && (
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto 24px",
            background: "#fff",
            borderRadius: 24,
            padding: 20,
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
              maxWidth: 520,
              borderRadius: 16,
              background: "#ddd",
            }}
          />

          <div style={{ marginTop: 16 }}>
            <button
              onClick={capturePhoto}
              style={{
                background: "#9b6a3c",
                color: "#fff",
                border: "none",
                borderRadius: 999,
                padding: "10px 18px",
                marginRight: 10,
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
                borderRadius: 999,
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: 24,
          alignItems: "start",
          marginTop: 10,
        }}
      >
        <div style={{ textAlign: "center" }}>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Uploaded preview"
              style={{
                width: 280,
                maxWidth: "100%",
                borderRadius: 22,
                boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
              }}
            />
          )}
        </div>

        <div>
          {cards.length > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "stretch",
                gap: 24,
                flexWrap: "wrap",
                marginTop: 24,
              }}
            >
              {leftCard && <ShadePanel card={leftCard} small />}
              {centerCard && <ShadePanel card={centerCard} reason={reason} />}
              {rightCard && <ShadePanel card={rightCard} small />}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          textAlign: "center",
          marginTop: 34,
          fontSize: 14,
        }}
      >
        © 2026 AltoV Beauty
      </div>
    </div>
  );
}
