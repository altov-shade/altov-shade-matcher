import React, { useState, useRef, useCallback } from "react";
import Header from "./components/Header";
import ShadeCard from "./components/ShadeCard";
import { analyzeSkinTone } from "./services/geminiService";
import { MatchResult } from "./types";

const App: React.FC = () => {
  const [step, setStep] = useState<"welcome" | "scan" | "loading" | "results">("welcome");
  const [matchData, setMatchData] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentYear = new Date().getFullYear();

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current!.srcObject = null;
    }
  }, []);

  const startCamera = async () => {
    setError(null);
    setStep("scan");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      setError("Camera access denied. Try upload instead.");
      setStep("welcome");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
      const base64Image = e.target?.result as string;

      setStep("loading");

      try {
        const result = await analyzeSkinTone(base64Image);
        setMatchData(result);
        setStep("results");
      } catch (err) {
        console.error(err);
        setError("AI analysis failed. Try a clearer photo.");
        setStep("welcome");
      }
    };

    reader.readAsDataURL(file);
  };

  const handleCancel = () => {
    stopCamera();
    setStep("welcome");
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState < 2) {
      setError("Waiting for camera...");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Image = canvas.toDataURL("image/jpeg", 0.8);

    stopCamera();
    setStep("loading");

    try {
      const result = await analyzeSkinTone(base64Image);
      setMatchData(result);
      setStep("results");
    } catch (err) {
      console.error(err);
      setError("AI analysis failed. Try again.");
      setStep("welcome");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF9F5]">
      <Header />

      <main className="flex-grow flex flex-col">
        {step === "welcome" && (
          <section className="flex-grow flex items-center justify-center text-center px-6">
            <div>
              <h1 className="text-4xl mb-6 font-bold">AltoV Shade Match</h1>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={startCamera}
                  className="bg-black text-white px-6 py-3 rounded-full"
                >
                  Take Photo
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white border px-6 py-3 rounded-full"
                >
                  Upload Photo
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
              />

              {error && <p className="mt-4 text-red-500">{error}</p>}
            </div>
          </section>
        )}

        {step === "scan" && (
          <section className="text-center p-6">
            <video ref={videoRef} autoPlay playsInline className="w-full max-w-md mx-auto" />
            <canvas ref={canvasRef} className="hidden" />

            <div className="mt-6 flex gap-4 justify-center">
              <button onClick={handleCancel}>Cancel</button>
              <button onClick={captureAndAnalyze}>Match Me</button>
            </div>
          </section>
        )}

        {step === "loading" && (
          <section className="flex-grow flex items-center justify-center">
            <p>Analyzing...</p>
          </section>
        )}

        {step === "results" && matchData && (
          <section className="p-6 text-center">
            <h2 className="text-2xl mb-4">
              Your match: {matchData.primaryMatch.code}
            </h2>

            <div className="flex flex-wrap justify-center gap-6">
              {matchData.range.map((shade) => (
                <ShadeCard
                  key={shade.id}
                  shade={shade}
                  isPrimary={shade.id === matchData.primaryMatch.id}
                />
              ))}
            </div>

            <button className="mt-6" onClick={() => setStep("welcome")}>
              Try Again
            </button>
          </section>
        )}
      </main>

      <footer className="text-center p-4 text-xs">
        © {currentYear} AltoV Beauty
      </footer>
    </div>
  );
};

export default App;
