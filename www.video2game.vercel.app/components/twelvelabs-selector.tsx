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

interface TwelveLabsSelectorProps {
  isVisible: boolean
  apiKey: string
  onVideoSelect: (videoId: string, videoName: string) => void
  selectedVideoId: string
}

export default function TwelveLabsSelector({
  isVisible,
  apiKey,
  onVideoSelect,
  selectedVideoId,
}: TwelveLabsSelectorProps) {
  const [indexes, setIndexes] = useState<Index[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [selectedIndex, setSelectedIndex] = useState("")
  const [isLoadingIndexes, setIsLoadingIndexes] = useState(false)
  const [isLoadingVideos, setIsLoadingVideos] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const API_BASE_URL = "http://localhost:8000" 

  useEffect(() => {
    if (isVisible && apiKey) {
      fetchIndexes()
    }
  }, [isVisible, apiKey])

  // Fetch videos when index changes
  useEffect(() => {
    if (selectedIndex) {
      fetchVideos(selectedIndex)
    } else {
      setVideos([])
    }
  }, [selectedIndex])

  const fetchIndexes = async () => {
    setIsLoadingIndexes(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/indexes`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) throw new Error("Failed to fetch indexes")

      const data = await response.json()
      setIndexes(data.indexes || [])
    } catch (err) {
      setError("Failed to load indexes")
      console.error("Error fetching indexes:", err)
    } finally {
      setIsLoadingIndexes(false)
    }
  }

  const fetchVideos = async (indexId: string) => {
    setIsLoadingVideos(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/indexes/${indexId}/videos`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) throw new Error("Failed to fetch videos")

      const data = await response.json()
      setVideos(data.videos || [])
    } catch (err) {
      setError("Failed to load videos")
      console.error("Error fetching videos:", err)
    } finally {
      setIsLoadingVideos(false)
    }
  }

  if (!isVisible) return null

  return (
    <div className="w-full max-w-md mx-auto space-y-4 animate-in slide-in-from-top-5 duration-500">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#1d1c1b]">Select Video Index</label>
        <select
          value={selectedIndex}
          onChange={(e) => setSelectedIndex(e.target.value)}
          disabled={isLoadingIndexes}
          className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-[#d3d1cf]/50 rounded-lg text-[#1d1c1b] focus:outline-none focus:ring-2 focus:ring-[#1d1c1b]/20 transition-all duration-200"
        >
          <option value="">{isLoadingIndexes ? "Loading indexes..." : "Choose an index"}</option>
          {indexes.map((index) => (
            <option key={index.id} value={index.id}>
              {index.name}
            </option>
          ))}
        </select>
      </div>

      {/* Video Selection */}
      {selectedIndex && (
        <div className="space-y-2 animate-in slide-in-from-top-3 duration-300">
          <label className="block text-sm font-medium text-[#1d1c1b]">Select Video</label>
          <select
            value={selectedVideoId}
            onChange={(e) => {
              const video = videos.find((v) => v.id === e.target.value)
              if (video) {
                onVideoSelect(video.id, video.name)
              }
            }}
            disabled={isLoadingVideos}
            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-[#d3d1cf]/50 rounded-lg text-[#1d1c1b] focus:outline-none focus:ring-2 focus:ring-[#1d1c1b]/20 transition-all duration-200"
          >
            <option value="">{isLoadingVideos ? "Loading videos..." : "Choose a video"}</option>
            {videos.map((video) => (
              <option key={video.id} value={video.id}>
                {video.name}
                {video.duration > 0 &&
                  ` (${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, "0")})`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Stats */}
      {selectedIndex && (
        <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-bottom-3 duration-400">
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-white/30">
            <div className="text-lg font-bold text-[#1d1c1b]">{indexes.length}</div>
            <div className="text-xs text-gray-600">Indexes</div>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-white/30">
            <div className="text-lg font-bold text-[#1d1c1b]">{videos.length}</div>
            <div className="text-xs text-gray-600">Videos</div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-100/80 backdrop-blur-sm text-red-700 rounded-lg text-sm border border-red-200/50">
          {error}
        </div>
      )}
    </div>
  )
}
