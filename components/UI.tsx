import React, { useRef, useState } from "react";
import { useStore } from "../store";
import { TreeMorphState } from "../types";
import GestureController from "./GestureController";
import { saveWish } from "../utils/wishes";
import { STATIC_PHOTO_FILES, TREE_CONFIG } from "../constants";
import { compressImageFile } from "../utils/photoUpload";

const UI: React.FC = () => {
  const {
    isCameraEnabled,
    setCameraEnabled,
    triggerWish,
    isFlyingWish,
    morphProgress,
    treeState,
    startRide,
    exitRide,
    uploadedPhotoUrls,
    setUploadedPhotoUrls,
  } = useStore((state) => state);

  const [wishText, setWishText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isStaticPhotoMode = STATIC_PHOTO_FILES.length > 0;

  const handleSendWish = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedWish = wishText.trim();
    if (!trimmedWish || isFlyingWish) return;

    triggerWish();
    setWishText("");
    void saveWish(trimmedWish);
  };

  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const limitedFiles = files.slice(0, TREE_CONFIG.polaroidCount);
    const compressed = await Promise.all(
      limitedFiles.map(async (file) => {
        try {
          return await compressImageFile(file, 2048);
        } catch {
          return file;
        }
      })
    );
    const urls = compressed.map((blob) => URL.createObjectURL(blob));

    uploadedPhotoUrls.forEach((url) => URL.revokeObjectURL(url));
    setUploadedPhotoUrls(urls);

    event.target.value = "";
  };

  const handleClearPhotos = () => {
    uploadedPhotoUrls.forEach((url) => URL.revokeObjectURL(url));
    setUploadedPhotoUrls([]);
  };

  // Show Ride button when tree is mostly formed (> 0.8)
  const isTreeReady = morphProgress > 0.8;

  // Check if we are in any ride-related state to hide general UI
  const isRideMode =
    treeState === TreeMorphState.RIDE ||
    treeState === TreeMorphState.RIDE_PREPARE ||
    treeState === TreeMorphState.RIDE_RIBBON ||
    treeState === TreeMorphState.RIDE_FIREWORK;

  return (
    <>
      <GestureController />

      {/* Main UI Layer */}
      <div className="absolute inset-0 pointer-events-none p-6 md:p-10 z-10 flex flex-col justify-between">
        {/* TOP SECTION: Header (Left) + Controls (Right) */}
        <div className="flex justify-between items-start w-full">
          {/* Header (Top Left) */}
          <div
            className={`flex flex-col items-start gap-4 transition-opacity duration-1000 ${
              isRideMode ? "opacity-0" : "opacity-100"
            }`}
          >
            <div className="space-y-2">
              <h1
                className="text-2xl md:text-4xl font-bold tracking-[0.15em]"
                style={{
                  fontFamily: "serif",
                  background:
                    "linear-gradient(90deg, #ffffff 0%, #ffd700 50%, #ffffff 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 15px rgba(255, 215, 0, 0.3))",
                }}
              >
                MERRY CHRISTMAS
              </h1>
              <p className="text-white text-[10px] md:text-xs font-light tracking-widest opacity-90 max-w-sm leading-relaxed">
                Enable camera, open or move your hand to <br />
                unlock the magic
              </p>
            </div>

            {/* Camera Toggle */}
            <div className="pointer-events-auto mt-1">
              <button
                onClick={() => setCameraEnabled(!isCameraEnabled)}
                className="flex items-center gap-3 group transition-all duration-300"
              >
                <div
                  className={`
                        w-8 h-4 rounded-full border border-[#ffd700] flex items-center p-0.5 transition-all duration-500
                        ${
                          isCameraEnabled
                            ? "bg-[#ffd700]/10 shadow-[0_0_10px_rgba(255,215,0,0.2)]"
                            : "bg-transparent"
                        }
                    `}
                >
                  <div
                    className={`
                            w-2.5 h-2.5 rounded-full bg-[#ffd700] shadow-sm transition-transform duration-300
                            ${
                              isCameraEnabled
                                ? "translate-x-3.5 shadow-[0_0_10px_#ffd700]"
                                : "translate-x-0"
                            }
                        `}
                  />
                </div>
                <span className="text-[#ffd700] text-[9px] font-bold tracking-[0.25em] uppercase group-hover:text-white transition-colors">
                  ENABLE CAMERA
                </span>
              </button>
            </div>
          </div>

          {/* Top Right Controls (Start/Exit Ride) */}
          <div className="pointer-events-auto flex flex-col items-end gap-2">
            {!isStaticPhotoMode && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="group flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-black/40 backdrop-blur-md hover:bg-white/10 transition-all duration-300"
                  >
                    <span className="text-white/80 text-[8px] tracking-[0.2em] font-bold uppercase group-hover:text-white">
                      Upload Photos
                    </span>
                    <div className="text-white/50 text-[8px] tracking-[0.2em] font-bold uppercase">
                      {uploadedPhotoUrls.length}/{TREE_CONFIG.polaroidCount}
                    </div>
                  </button>
                  {uploadedPhotoUrls.length > 0 && (
                    <button
                      onClick={handleClearPhotos}
                      aria-label="Clear photos"
                      className="group flex items-center justify-center w-7 h-7 rounded-full border border-white/20 bg-black/40 backdrop-blur-md hover:bg-white/10 transition-all duration-300"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="12"
                        height="12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-white/70 group-hover:text-white"
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6v-2h8v2" />
                        <path d="M6 6l1 14h10l1-14" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    </button>
                  )}
                </div>
              </>
            )}
            {isStaticPhotoMode && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-black/30 backdrop-blur-md">
                <span className="text-white/60 text-[9px] tracking-[0.2em] font-bold uppercase">
                  Static Photos
                </span>
                <div className="text-white/40 text-[9px] tracking-[0.2em] font-bold uppercase">
                  {STATIC_PHOTO_FILES.length}
                </div>
              </div>
            )}
            {/* Start Ride Button */}
            {isTreeReady && !isRideMode && (
              <button
                onClick={startRide}
                className="group flex items-center gap-2 px-4 py-2 rounded-full border border-[#ffd700]/30 bg-black/40 backdrop-blur-md hover:bg-[#ffd700]/10 transition-all duration-300 hover:border-[#ffd700]"
              >
                <span className="text-[#ffd700] text-[9px] tracking-[0.2em] font-bold uppercase">
                  Start Journey
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-[#ffd700] shadow-[0_0_6px_#ffd700] group-hover:scale-125 transition-transform duration-300" />
              </button>
            )}

            {/* Exit Ride Button */}
            {isRideMode && (
              <button
                onClick={exitRide}
                className="group flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-black/40 backdrop-blur-md hover:bg-white/10 transition-all duration-300"
              >
                <span className="text-white/80 text-[9px] tracking-[0.2em] font-bold uppercase group-hover:text-white">
                  Exit Ride
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-white/50 group-hover:bg-white transition-colors duration-300" />
              </button>
            )}
          </div>
        </div>

        {/* BOTTOM UI: Wish Input (Centered) */}
        <div className="relative w-full flex items-end justify-center">
          <div
            className={`transition-all duration-1000 transform ${
              isTreeReady && !isRideMode
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10 pointer-events-none"
            }`}
          >
            <form
              onSubmit={handleSendWish}
              className="flex items-center rounded-full px-6 py-3 border backdrop-blur-md pointer-events-auto group animate-breathe-glow"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#ffd700]/5 via-white/10 to-[#ffd700]/5 opacity-50 pointer-events-none" />

              <input
                type="text"
                value={wishText}
                onChange={(e) => setWishText(e.target.value)}
                placeholder="Make a wish..."
                maxLength={200}
                style={{ fontFamily: "'Space Mono', monospace" }}
                className="relative z-10 w-48 bg-transparent border-none outline-none text-white text-xs placeholder:text-white/40 tracking-wider"
              />

              <button
                type="submit"
                disabled={!wishText.trim() || isFlyingWish}
                style={{ fontFamily: "'Space Mono', monospace" }}
                className={`
                            relative z-10 ml-4 text-[10px] font-bold tracking-widest uppercase transition-all duration-300
                            ${
                              !wishText.trim() || isFlyingWish
                                ? "text-white/20 cursor-not-allowed"
                                : "text-white hover:text-[#ffd700] hover:scale-110 cursor-pointer shadow-black/0 drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]"
                            }
                        `}
              >
                {isFlyingWish ? "..." : "SEND"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default UI;
