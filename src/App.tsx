import { useState } from "react";
import { analyzeSkinTone } from "./services/geminiService";

type ShadeCard = {
  shade: string;
  title: string;
  subtitle: string;
  image: string;
  isBestMatch: boolean;
};

const MIN_SHADE = 5;
const MAX_SHADE = 15;

const getShadeNumber = (shade: string): number | null => {
  const match = shade.match(/^HF(\d+)$/i);
  return match ? parseInt(match[1], 10) : null;
};

const buildShadeRange = (bestShade: string): ShadeCard[] => {
  const shadeNumber = getShadeNumber(bestShade);
  if (!shadeNumber) return [];

  const range = [shadeNumber - 1, shadeNumber, shadeNumber + 1].filter(
    (num) => num >= MIN_SHADE && num <= MAX_SHADE
  );

  return range.map((num) => {
    const shade = `HF${num}`;
    const isBestMatch = num === shadeNumber;

    return {
      shade,
      title: `Altov Hydrating Foundation ${shade}`,
      subtitle: isBestMatch ? "PRECISION IDENTIFIED" : "NEAR MATCH",
      image: `/images/${shade}.png`,
      isBestMatch,
    };
  });
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

function ShadePanel({
  card,
  small = false,
}: {
  card: ShadeCard;
  small?: boolean;
}) {
  return (
    <div
      style={{
        width: small ? 220 : 320,
        minHeight: small ? 520 : 640,
        background: "#fff",
        borderRadius: 42,
        border: small ? "none" : "2px solid #a27043",
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        position: "relative",
        padding: "26px 24px 28px",
        textAlign: "center",
        opacity: small ? 0.8 : 1,
      }}
    >
      {card.isBestMatch && (
        <div
          style={{
            position: "absolute",
            top: -18,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#9b6a3c",
            color: "#fff",
            padding: "10px 24px",
            borderRadius: 999,
            fontWeight: 700,
            letterSpacing: "2px",
            fontSize: 14,
          }}
        >
          BEST MATCH
        </div>
      )}

      <img
        src={card.image}
        alt={card.title}
        style={{
          width: small ? 110 : 150,
          height: "auto",
          objectFit: "contain",
          marginTop: card.isBestMatch ? 20 : 0,
          marginBottom: 18,
        }}
      />

      <p
        style={{
          fontSize: small ? 16 : 18,
          color: "#444",
          marginBottom: small ? 120 : 180,
          lineHeight: 1.4,
        }}
      >
        {card.title}
      </p>

      <div>
        <h2
          style={{
            fontSize: small ? 36 : 78,
            margin: 0,
            color: card.isBestMatch ? "#000" : "#666",
            fontWeight: 800,
          }}
        >
          {card.shade}
        </h2>

        <p
          style={{
            marginTop: 18,
            marginBottom: 0,
            letterSpacing: "4px",
            fontSize: small ? 12 : 14,
            fontWeight: 700,
            color: "#9b6a3c",
          }}
        >
          {card.subtitle}
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cards, setCards] = useState<ShadeCard[]>([]);
  const [bestMatch, setBestMatch] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsLoading(true);
    setCards([]);
    setBestMatch(null);
    setReason("");

    try {
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);

      const base64 = await fileToBase64(file);
      const result = await analyzeSkinTone(base64);

      if (!result || !result.bestMatch) {
        setErrorMsg("Could not analyze image.");
        return;
      }

      const builtCards = buildShadeRange(result.bestMatch);

      setBestMatch(result.bestMatch);
      setReason(result.reason || "");
      setCards(builtCards);
    } catch (error) {
      console.error(error);
      setErrorMsg("Something went wrong while analyzing the image.");
    } finally {
      setIsLoading(false);
    }
  };

  const leftCard = cards.length === 3 ? cards[0] : null;
  const centerCard =
    cards.length === 3 ? cards[1] : cards.length === 2 ? cards[0] : null;
  const rightCard =
    cards.length === 3 ? cards[2] : cards.length === 2 ? cards[1] : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f0ec",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #eadfd7",
          padding: "28px 20px 22px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            letterSpacing: "8px",
            fontWeight: 600,
            color: "#9b6a3c",
            margin: 0,
          }}
        >
          ALTOV BEAUTY
        </h1>
      </div>

      <div style={{ padding: "32px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <input type="file" accept="image/*" onChange={handleImageChange} />

          {isLoading && (
            <p style={{ marginTop: 16, color: "#7a5a3a" }}>Analyzing image...</p>
          )}

          {errorMsg && (
            <p style={{ marginTop: 16, color: "#b00020" }}>{errorMsg}</p>
          )}

          {bestMatch && !isLoading && (
            <div style={{ marginTop: 14 }}>
              <p style={{ margin: 0, fontWeight: 700, color: "#5f3d22" }}>
                Best Match: {bestMatch}
              </p>
              {reason && (
                <p style={{ marginTop: 8, color: "#7a5a3a" }}>{reason}</p>
              )}
            </div>
          )}
        </div>

        {previewUrl && (
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <img
              src={previewUrl}
              alt="Uploaded preview"
              style={{
                width: 220,
                maxWidth: "90%",
                borderRadius: 18,
                boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
              }}
            />
          </div>
        )}

        {cards.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-end",
              gap: 22,
              flexWrap: "wrap",
            }}
          >
            {leftCard && <ShadePanel card={leftCard} small />}
            {centerCard && <ShadePanel card={centerCard} />}
            {rightCard && <ShadePanel card={rightCard} small />}
          </div>
        )}
      </div>

      <div
        style={{
          textAlign: "center",
          padding: "18px 0 36px",
          color: "#000",
          fontSize: 14,
        }}
      >
        © 2026 AltoV Beauty
      </div>
    </div>
  );
}
