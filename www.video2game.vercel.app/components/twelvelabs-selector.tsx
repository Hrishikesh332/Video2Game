"use client"

import { useState, useEffect } from "react"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "./ui/select"
import { useMemo } from "react"

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

interface VideoDetails {
  id: string
  name: string
  duration: number
  description?: string
  thumbnailUrl?: string
  filename?: string
  createdAt?: string
}

export default function TwelveLabsSelector({
  isVisible,
  apiKey,
  onVideoSelect,
  selectedVideoId,
}: TwelveLabsSelectorProps) {
  const [indexes, setIndexes] = useState<Index[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [videoDetails, setVideoDetails] = useState<Record<string, VideoDetails>>({})
  const [selectedIndex, setSelectedIndex] = useState("")
  const [isLoadingIndexes, setIsLoadingIndexes] = useState(false)
  const [isLoadingVideos, setIsLoadingVideos] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  useEffect(() => {
    if (isVisible && apiKey) {
      fetchIndexes()
    }
  }, [isVisible, apiKey])

  useEffect(() => {
    if (selectedIndex) {
      fetchVideos(selectedIndex)
    } else {
      setVideos([])
      setVideoDetails({})
    }
  }, [selectedIndex])

  // Fetch video details and thumbnails for all videos in the index
  useEffect(() => {
    if (videos.length > 0 && selectedIndex) {
      setIsLoadingDetails(true)
      const fetchAllDetails = async () => {
        const details: Record<string, VideoDetails> = {}
        await Promise.all(
          videos.map(async (video) => {
            try {
              const res = await fetch(
                `${API_BASE_URL}/indexes/${selectedIndex}/videos/${video.id}/details`,
                {
                  headers: {
                    "X-Twelvelabs-Api-Key": apiKey,
                  },
                }
              )
              let detail = await res.json()
              let thumbnailUrl = `${API_BASE_URL}/indexes/${selectedIndex}/videos/${video.id}/thumbnail?api_key=${encodeURIComponent(apiKey)}&t=${Date.now()}`
              console.log('Constructed thumbnail URL:', thumbnailUrl)
              const systemMeta = detail.system_metadata || {}
              const duration = systemMeta.duration || video.duration
              const filename = systemMeta.filename || video.name
              const createdAt = detail.created_at
              details[video.id] = {
                id: video.id,
                name: video.name,
                duration,
                description: filename,
                thumbnailUrl,
                filename,
                createdAt,
              }
            } catch (e) {
              details[video.id] = {
                id: video.id,
                name: video.name,
                duration: video.duration,
                description: video.name,
                thumbnailUrl: undefined,
              }
            }
          })
        )
        setVideoDetails(details)
        setIsLoadingDetails(false)
      }
      fetchAllDetails()
    }
  }, [videos, selectedIndex, apiKey])

  const fetchIndexes = async () => {
    setIsLoadingIndexes(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/indexes`, {
        headers: {
          "X-Twelvelabs-Api-Key": apiKey,
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
          "X-Twelvelabs-Api-Key": apiKey,
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

      {/* Video Selection - Custom Dropdown */}
      {selectedIndex && (
        <div className="space-y-2 animate-in slide-in-from-top-3 duration-300">
          <label className="block text-sm font-medium text-[#1d1c1b]">Select Video</label>
          <Select
            value={selectedVideoId}
            onValueChange={(val) => {
              const video = videoDetails[val] || videos.find((v) => v.id === val)
              if (video) {
                onVideoSelect(video.id, video.name)
              }
            }}
            disabled={isLoadingVideos || isLoadingDetails}
          >
            <SelectTrigger className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-[#d3d1cf]/50 rounded-lg text-[#1d1c1b] focus:outline-none focus:ring-2 focus:ring-[#1d1c1b]/20 transition-all duration-200">
              {selectedVideoId && videoDetails[selectedVideoId] ? (
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-shrink-0 w-12 h-8 flex items-center justify-center">
                    <img
                      src={videoDetails[selectedVideoId].thumbnailUrl}
                      alt={videoDetails[selectedVideoId].name}
                      className="w-12 h-8 object-cover rounded border border-gray-200"
                      style={{ minWidth: 48 }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg?height=32&width=48"
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <span className="truncate font-medium max-w-xs leading-tight">{videoDetails[selectedVideoId].filename || videoDetails[selectedVideoId].name}</span>
                    {videoDetails[selectedVideoId].duration !== undefined && videoDetails[selectedVideoId].duration > 0 && (
                      <span className="text-xs text-gray-500 truncate">{`${Math.floor(videoDetails[selectedVideoId].duration / 60)}:${(Math.round(videoDetails[selectedVideoId].duration % 60)).toString().padStart(2, "0")}`}</span>
                    )}
                  </div>
                </div>
              ) : (
                <span className="truncate">{isLoadingVideos || isLoadingDetails ? "Loading videos..." : "Choose a video"}</span>
              )}
            </SelectTrigger>
            <SelectContent className="max-h-80 overflow-y-auto">
              {videos.map((video) => {
                const details = videoDetails[video.id]
                return (
                  <SelectItem key={video.id} value={video.id} className="py-2 px-2 cursor-pointer hover:bg-gray-100 rounded-lg transition-all">
                    <div className="flex flex-row items-center gap-3 w-full">
                      <div className="flex-shrink-0 w-16 h-10 flex items-center justify-center">
                        {details?.thumbnailUrl ? (
                          <img
                            src={details.thumbnailUrl}
                            alt={details.name}
                            className="w-16 h-10 object-cover rounded-md border border-gray-200 shadow-sm"
                            style={{ minWidth: 64 }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = "/placeholder.svg?height=60&width=100"
                            }}
                          />
                        ) : (
                          <div className="w-16 h-10 bg-gray-200 rounded-md flex items-center justify-center text-xs text-gray-500">No Image</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="font-medium text-[#1d1c1b] truncate max-w-xs">{details?.filename || details?.name || video.name}</div>
                        <div className="text-xs text-gray-600 truncate max-w-xs">{details?.createdAt ? `Created: ${new Date(details.createdAt).toLocaleString()}` : ''}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {details?.duration !== undefined && details?.duration > 0 && (
                            <span>Duration: {`${Math.floor(details.duration / 60)}:${(Math.round(details.duration % 60)).toString().padStart(2, "0")}`}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Note */}
      {selectedIndex && (
        <div className="text-xs text-gray-500 mt-2 px-1">
          Note: You can access the most recent 10 videos indexed in the selected index.
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
