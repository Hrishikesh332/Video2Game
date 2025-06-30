"use client"

import { useState } from "react"

interface SourceToggleProps {
  activeSource: "youtube" | "twelvelabs"
  onSourceChange: (source: "youtube" | "twelvelabs") => void
  isApiConnected: boolean
  onApiConnect: () => void
  onApiDisconnect: () => void
}

export default function SourceToggle({
  activeSource,
  onSourceChange,
  isApiConnected,
  onApiConnect,
  onApiDisconnect,
}: SourceToggleProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="flex flex-col items-center gap-4 mb-8">
      {/* Toggle Container */}
      <div
        className="relative bg-white/40 backdrop-blur-md border border-white/30 rounded-2xl p-2 shadow-lg hover:shadow-xl transition-all duration-300"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >

        <div
          className={`absolute top-2 h-12 bg-gradient-to-r from-[#1d1c1b] to-[#2d2c2b] rounded-xl shadow-lg transition-all duration-500 ease-out ${
            !isApiConnected
              ? "left-2 w-[140px]"
              : activeSource === "youtube"
                ? "left-2 w-[140px]"
                : "left-[146px] w-[180px]"
          } ${isHovered ? "shadow-2xl scale-105" : ""}`}
        />

        <div className="relative flex">
          <button
            onClick={() => onSourceChange("youtube")}
            className={`relative z-10 flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              activeSource === "youtube" ? "text-white" : "text-[#1d1c1b] hover:text-[#1d1c1b]/80"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 ${
                activeSource === "youtube" ? "bg-white/20 backdrop-blur-sm" : "bg-red-100"
              }`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                className={activeSource === "youtube" ? "text-white" : "text-red-600"}
              >
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </div>
            <span className="text-sm">YouTube</span>
          </button>

          {isApiConnected ? (
            <button
              onClick={() => onSourceChange("twelvelabs")}
              className={`relative z-10 flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all duration-300 animate-in slide-in-from-right-5 ${
                activeSource === "twelvelabs" ? "text-white" : "text-[#1d1c1b] hover:text-[#1d1c1b]/80"
              }`}
            >
              {/* TwelveLabs Logo */}
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 ${
                  activeSource === "twelvelabs" ? "bg-white/20 backdrop-blur-sm" : "bg-gray-100"
                }`}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 204 146.6"
                  className={`${activeSource === "twelvelabs" ? "fill-white" : "fill-[#1d1c1b]"}`}
                >
                  <rect x="43.9" y="50.3" width="64.3" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect y="50.3" width="35.3" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="124.1" y="50.3" width="40.3" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="129.9" y="37.8" width="34.5" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="168.9" y="37.8" width="27.3" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="157.3" y="25" width="31.1" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="167.1" y="12.5" width="9.2" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="74.3" y="112.6" width="15.9" height="9" rx="2.6" ry="2.6"></rect>
                  <rect x="101.8" y="112.6" width="10.4" height="9" rx="2.6" ry="2.6"></rect>
                  <rect x="117" y="112.6" width="28" height="9" rx="2.6" ry="2.6"></rect>
                  <rect x="131" y="100.1" width="11.6" height="9" rx="2.6" ry="2.6"></rect>
                  <rect x="52.4" y="112.6" width="9.2" height="9" rx="2.6" ry="2.6"></rect>
                  <path d="M94.7,127.7c0-1.4,1.1-2.6,2.6-2.6h4c1.4,0,2.6,1.1,2.6,2.6v3.9c0,1.4-1.1,2.6-2.6,2.6h-4c-1.4,0-2.6-1.1-2.6-2.6v-3.9Z"></path>
                  <rect x="85.8" y="137.6" width="8.7" height="9" rx="2.6" ry="2.6"></rect>
                  <rect x="120.4" width="11.4" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="55.8" y="37.8" width="29" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="109.7" y="12.5" width="17.6" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="98.8" y="25" width="28.5" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="187.4" y="50.3" width="16.6" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="30.6" y="62.8" width="82.1" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="105.1" y="87.8" width="32.1" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="43.9" y="75.3" width="104.3" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="27.9" y="87.8" width="38.8" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="63.3" y="100.1" width="12.7" height="9" rx="2.6" ry="2.6"></rect>
                  <rect x="108.1" y="100.1" width="13.7" height="9" rx="2.6" ry="2.6"></rect>
                  <rect x="39.8" y="100.1" width="12.9" height="9" rx="2.6" ry="2.6"></rect>
                  <rect x="124.1" y="62.8" width="33.1" height="8.7" rx="2.6" ry="2.6"></rect>
                </svg>
              </div>
              <span className="text-sm">TwelveLabs</span>
            </button>
          ) : (
            <button
              onClick={onApiConnect}
              className="relative z-10 flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all duration-300 text-[#1d1c1b] hover:text-[#1d1c1b]/80"
            >
              <div className="w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 bg-gray-100">
                <svg width="14" height="14" viewBox="0 0 204 146.6" className="fill-[#1d1c1b]">
                  <rect x="43.9" y="50.3" width="64.3" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect y="50.3" width="35.3" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="124.1" y="50.3" width="40.3" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="129.9" y="37.8" width="34.5" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="168.9" y="37.8" width="27.3" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="157.3" y="25" width="31.1" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="167.1" y="12.5" width="9.2" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="74.3" y="112.6" width="15.9" height="9" rx="2.6" ry="2.6"></rect>
                  <rect x="101.8" y="112.6" width="10.4" height="9" rx="2.6" ry="2.6"></rect>
                  <rect x="117" y="112.6" width="28" height="9" rx="2.6" ry="2.6"></rect>
                  <rect x="131" y="100.1" width="11.6" height="9" rx="2.6" ry="2.6"></rect>
                  <rect x="52.4" y="112.6" width="9.2" height="9" rx="2.6" ry="2.6"></rect>
                  <path d="M94.7,127.7c0-1.4,1.1-2.6,2.6-2.6h4c1.4,0,2.6,1.1,2.6,2.6v3.9c0,1.4-1.1,2.6-2.6,2.6h-4c-1.4,0-2.6-1.1-2.6-2.6v-3.9Z"></path>
                  <rect x="85.8" y="137.6" width="8.7" height="9" rx="2.6" ry="2.6"></rect>
                  <rect x="120.4" width="11.4" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="55.8" y="37.8" width="29" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="109.7" y="12.5" width="17.6" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="98.8" y="25" width="28.5" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="187.4" y="50.3" width="16.6" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="30.6" y="62.8" width="82.1" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="105.1" y="87.8" width="32.1" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="43.9" y="75.3" width="104.3" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="27.9" y="87.8" width="38.8" height="8.7" rx="2.6" ry="2.6"></rect>
                  <rect x="63.3" y="100.1" width="12.7" height="9" rx="2.6" ry="2.6"></rect>
                  <rect x="108.1" y="100.1" width="13.7" height="9" rx="2.6" ry="2.6"></rect>
                  <rect x="39.8" y="100.1" width="12.9" height="9" rx="2.6" ry="2.6"></rect>
                  <rect x="124.1" y="62.8" width="33.1" height="8.7" rx="2.6" ry="2.6"></rect>
                </svg>
              </div>
              <span className="text-sm">TwelveLabs</span>
            </button>
          )}
        </div>

        {isHovered && (
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute top-1 left-4 w-1 h-1 bg-white/40 rounded-full animate-ping"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="absolute top-3 right-6 w-1 h-1 bg-white/30 rounded-full animate-ping"
              style={{ animationDelay: "200ms" }}
            />
            <div
              className="absolute bottom-2 left-8 w-1 h-1 bg-white/50 rounded-full animate-ping"
              style={{ animationDelay: "400ms" }}
            />
            <div
              className="absolute bottom-1 right-4 w-1 h-1 bg-white/20 rounded-full animate-ping"
              style={{ animationDelay: "600ms" }}
            />
          </div>
        )}
      </div>

      {isApiConnected && activeSource === "twelvelabs" && (
        <div className="flex items-center justify-center animate-in slide-in-from-top-3 duration-300">
          <button
            onClick={onApiDisconnect}
            className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm border border-white/40 rounded-xl text-[#1d1c1b] text-sm font-medium hover:bg-white/80 hover:border-white/60 transition-all duration-200 shadow-sm hover:shadow-md"
            title="Disconnect TwelveLabs API"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Connected</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="opacity-60"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16,17 21,12 16,7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
