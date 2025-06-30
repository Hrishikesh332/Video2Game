"use client"

import { useState, useEffect } from "react"

interface Index {
  id: string
  name: string
}

interface Video {
  id: string
  name: string
  duration: number
}

interface ApiConnectionModalProps {
  isOpen: boolean
  onClose: () => void
  isConnected: boolean
  onConnect: (apiKey: string) => void
  onDisconnect: () => void
  currentApiKey?: string
  indexes: Index[]
  selectedIndex: string
  onIndexChange: (indexId: string) => void
  videos: Video[]
  selectedVideo: string
  onVideoChange: (videoId: string) => void
  isLoadingIndexes: boolean
  isLoadingVideos: boolean
}

export default function ApiConnectionModal({
  isOpen,
  onClose,
  isConnected,
  onConnect,
  onDisconnect,
  currentApiKey,
  indexes,
  selectedIndex,
  onIndexChange,
  videos,
  selectedVideo,
  onVideoChange,
  isLoadingIndexes,
  isLoadingVideos,
}: ApiConnectionModalProps) {
  const [apiKey, setApiKey] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    if (isOpen && currentApiKey) {
      setApiKey(currentApiKey)
    }
  }, [isOpen, currentApiKey])

  const handleConnect = async () => {
    if (!apiKey.trim()) return

    setIsConnecting(true)
    try {
      await onConnect(apiKey.trim())
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    onDisconnect()
    setApiKey("")
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {!isConnected ? (
          /* Connection Form - Clean Design */
          <div className="p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-8 text-center">
              Connect your API key to TwelveLabs
            </h2>

            <div className="space-y-6">
              <input
                type="password"
                placeholder="Enter your API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              />

              <p className="text-gray-600 text-sm text-center whitespace-nowrap">
                API key is optional. You can use public videos without an API key.
              </p>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="flex-1 px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConnecting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Connecting...
                    </div>
                  ) : (
                    "Connect"
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Connected State */
          <div className="p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">TwelveLabs API Connected</h2>

            <div className="space-y-6">
              {/* Connection Status */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-green-700 whitespace-nowrap">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  <span className="font-medium">Connected Successfully</span>
                </div>
              </div>

              {/* Index Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 whitespace-nowrap">
                  Select Video Index
                </label>
                <select
                  value={selectedIndex}
                  onChange={(e) => onIndexChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoadingIndexes}
                >
                  <option value="">{isLoadingIndexes ? "Loading indexes..." : "Select an index"}</option>
                  {indexes.map((index) => (
                    <option key={index.id} value={index.id}>
                      {index.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedIndex && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 whitespace-nowrap">Select Video</label>
                  <select
                    value={selectedVideo}
                    onChange={(e) => onVideoChange(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoadingVideos}
                  >
                    <option value="">{isLoadingVideos ? "Loading videos..." : "Select a video"}</option>
                    {videos.map((video) => (
                      <option key={video.id} value={video.id}>
                        {video.name}{" "}
                        {video.duration > 0 &&
                          `(${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, "0")})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Stats */}
              {selectedIndex && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{indexes.length}</div>
                    <div className="text-sm text-gray-600">Indexes</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{videos.length}</div>
                    <div className="text-sm text-gray-600">Videos</div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-6 py-3 text-white bg-black hover:bg-gray-800 rounded-lg font-medium transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
