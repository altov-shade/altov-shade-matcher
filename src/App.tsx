// redeploy
import React, { useState, useRef, useCallback } from 'react';
import Header from './components/Header';
import ShadeCard from './components/ShadeCard';
import { analyzeSkinTone } from './services/geminiService';
import { MatchResult } from './types';

const App: React.FC = () => {
  const [step, setStep] = useState<'welcome' | 'scan' | 'loading' | 'results'>('welcome');
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
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = async () => {
    setError(null);
    setStep('scan');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Camera access was denied. Please try uploading a photo instead.");
      setStep('welcome');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Image = e.target?.result as string;
      setStep('loading');
      try {
        const result = await analyzeSkinTone(base64Image);
        setMatchData(result);
        setStep('results');
      } catch (err) {
        setError("AI analysis failed. Please ensure the photo is clear and well-lit.");
        setStep('welcome');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCancel = () => {
    stopCamera();
    setStep('welcome');
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (video.readyState < 2) {
      setError("Waiting for camera...");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg', 0.8);

    stopCamera();
    setStep('loading');
    
    try {
      const result = await analyzeSkinTone(base64Image);
      setMatchData(result);
      setStep('results');
    } catch (err) {
      console.error("Analysis error:", err);
      setError("AI analysis failed. Please try again with better lighting.");
      setStep('welcome');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF9F5]">
      <Header />
      
      <main className="flex-grow flex flex-col">
        {step === 'welcome' && (
          <section className="relative flex-grow flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 z-0">
              <img 
                src="https://images.unsplash.com/photo-1596704017254-9b121068fb31?q=80&w=2000&auto=format&fit=crop" 
                alt="AltoV Beauty Brand Model" 
                className="w-full h-full object-cover opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#FFF9F5] via-transparent to-transparent"></div>
            </div>
            
            <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
              <span className="text-[#8B5E3C] font-black tracking-[0.5em] text-[10px] uppercase mb-8 block">Precision AI Shade Match</span>
              <h1 className="text-5xl md:text-7xl mb-8 leading-tight font-black tracking-tight text-black">Your Altov <br/><span className="italic font-light">HF Selection</span></h1>
              <p className="text-gray-600 text-lg mb-12 leading-relaxed max-w-lg mx-auto font-medium">
                Find your perfect Hydrating Foundation shade range instantly. 
              </p>
              
              <div className="flex flex-col gap-6 justify-center items-center">
                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
                  <button 
                    onClick={startCamera}
                    className="flex-1 bg-black text-white px-8 py-5 rounded-full font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-3 group shadow-2xl tracking-[0.2em] text-[10px] uppercase"
                  >
                    <i className="fa-solid fa-camera group-hover:scale-110 transition-transform"></i>
                    TAKE PHOTO
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 bg-white text-black border border-black/10 px-8 py-5 rounded-full font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-3 tracking-[0.2em] text-[10px] uppercase shadow-sm"
                  >
                    <i className="fa-solid fa-upload"></i>
                    UPLOAD PHOTO
                  </button>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileUpload}
                />
              </div>
              
              {error && (
                <div className="mt-8 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center justify-center gap-3 animate-fade-in">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <span className="text-xs font-bold uppercase tracking-wider">{error}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {step === 'scan' && (
          <section className="py-20 px-6 max-w-4xl mx-auto text-center flex-grow flex flex-col justify-center">
            <h2 className="text-4xl mb-4 font-black tracking-tighter text-black uppercase">Center Your Glow</h2>
            <p className="text-gray-400 mb-12 max-w-xs mx-auto text-sm font-medium uppercase tracking-widest">Natural daylight provides the most accurate match.</p>
            
            <div className="relative rounded-[3rem] overflow-hidden shadow-2xl bg-black aspect-[3/4] max-h-[60vh] mx-auto border-4 border-white">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[80%] h-[75%] border-2 border-white/20 rounded-[120px] shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"></div>
              </div>
            </div>
            
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="mt-16 flex justify-center gap-6">
              <button 
                onClick={handleCancel}
                className="p-6 rounded-full bg-white text-gray-700 hover:bg-gray-100 shadow-xl transition-all active:scale-90"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
              <button 
                onClick={captureAndAnalyze}
                className="bg-black text-white px-16 py-6 rounded-full font-black text-[10px] uppercase tracking-[0.3em] hover:bg-gray-800 shadow-2xl transition-all active:scale-95"
              >
                MATCH ME
              </button>
            </div>
          </section>
        )}

        {step === 'loading' && (
          <section className="h-full flex-grow flex flex-col items-center justify-center text-center px-6">
            <div className="w-32 h-32 relative mb-12">
              <div className="absolute inset-0 border-2 border-[#8B5E3C]/10 rounded-full scale-125"></div>
              <div className="absolute inset-0 border-[6px] border-[#8B5E3C] border-t-transparent rounded-full animate-spin"></div>
              <i className="fa-solid fa-atom absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#8B5E3C] text-4xl animate-pulse"></i>
            </div>
            <h2 className="text-4xl mb-4 italic text-[#8B5E3C] font-light">Analyzing Skin Chemistry...</h2>
            <p className="text-gray-400 max-w-xs mx-auto font-medium tracking-wide">
              Calculating your position on the AltoV HF scale.
            </p>
          </section>
        )}

        {step === 'results' && matchData && (
          <section className="py-20 px-6 max-w-7xl mx-auto animate-fade-in flex-grow">
            <div className="text-center mb-24">
              <span className="text-[#8B5E3C] font-black tracking-[0.4em] text-[10px] uppercase mb-6 block">Analysis Result</span>
              <h2 className="text-5xl md:text-6xl mb-8 font-black leading-tight text-black">Your Primary <br/><span className="italic font-light">HF Match Identified</span></h2>
              <div className="max-w-2xl mx-auto bg-white p-8 rounded-[2.5rem] border border-[#F5E6DA] shadow-xl">
                <p className="text-gray-700 leading-relaxed italic text-lg font-medium">
                  Based on your analysis, your closest match is <span className="text-black font-black uppercase tracking-widest">{matchData.primaryMatch.code}</span>.
                </p>
              </div>
            </div>

            <div className="mb-20 flex items-center justify-center gap-6">
               <div className="h-[1px] w-16 bg-[#8B5E3C]/20"></div>
               <span className="text-[10px] font-black tracking-[0.3em] uppercase text-[#8B5E3C]">Tailored Range Selection</span>
               <div className="h-[1px] w-16 bg-[#8B5E3C]/20"></div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-12 lg:gap-24 mb-32 px-4">
              {matchData.range.map((shade) => (
                <ShadeCard 
                  key={shade.id} 
                  shade={shade} 
                  isPrimary={shade.id === matchData.primaryMatch.id} 
                />
              ))}
            </div>

            <div className="text-center pb-10">
              <button 
                onClick={() => setStep('welcome')}
                className="text-gray-400 hover:text-black font-black uppercase tracking-[0.2em] text-[10px] border-b border-transparent hover:border-black transition-all pb-2"
              >
                Retake or Upload New Photo
              </button>
            </div>
          </section>
        )}
      </main>

      <footer className="py-8 px-6 flex flex-col items-center">
        <p className="text-[9px] text-gray-400 font-medium tracking-[0.2em] uppercase">
          &copy; {currentYear} AltoV Beauty. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default App;
