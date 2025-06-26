"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import CodeViewer from "@/components/code-viewer"

interface SampleVideo {
  id: number
  title: string
  duration: string
  type: string
  thumbnail: string
  videoUrl: string
  gameHtml?: string
  isGenerated?: boolean
  channelName?: string
  viewCount?: string
}

export default function VideoToLearningApp() {
  const [selectedIndex, setSelectedIndex] = useState("Dance (Public)")
  const [selectedVideo, setSelectedVideo] = useState("No videos found")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isApiConnected, setIsApiConnected] = useState(false)
  const [leftWidth, setLeftWidth] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const [expandedVideo, setExpandedVideo] = useState<number | null>(null)
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [gameHtml, setGameHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentGameId, setCurrentGameId] = useState<number | null>(null)
  const [isCheckingCache, setIsCheckingCache] = useState(false)
  const [showGeneratePopup, setShowGeneratePopup] = useState(false)
  const [activeTab, setActiveTab] = useState<"app" | "code">("app")
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const getApiBaseUrl = () => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname

      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return "http://localhost:8000"
      }

      return "https://production.onrender.com"
    }

    // Server-side fallback
    return process.env.NEXT_PUBLIC_API_URL || "https://production.onrender.com"
  }

  const API_BASE_URL = getApiBaseUrl()
  // Function to extract video ID from YouTube URL
  const extractVideoId = (url: string): string => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/
    const match = url.match(regex)
    return match ? match[1] : ""
  }

  // Function to get YouTube embed URL
  const getYouTubeEmbedUrl = (url: string): string => {
    const videoId = extractVideoId(url)
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url
  }

  const [sampleVideos, setSampleVideos] = useState<SampleVideo[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sampleVideos")
      if (saved) {
        return JSON.parse(saved)
      }
    }
    return [
      {
        id: 1,
        title: "How I Would Learn Data Science (If I Had to Start Over)",
        duration: "11:42",
        type: "Educational Tutorial",
        thumbnail: `https://img.youtube.com/vi/${extractVideoId("https://www.youtube.com/watch?v=qxo8p8PtFeA")}/maxresdefault.jpg`,
        videoUrl: "https://www.youtube.com/watch?v=qxo8p8PtFeA",
        channelName: "Thu Vu data analytics",
        viewCount: "2.1M views",
        isGenerated: false,
      },
      {
        id: 2,
        title: "I Tried Andrew Tate's Hustlers University For 30 Days",
        duration: "16:28",
        type: "Review & Analysis",
        thumbnail: `https://img.youtube.com/vi/${extractVideoId("https://www.youtube.com/watch?v=_2v6Mbx5v1w")}/maxresdefault.jpg`,
        videoUrl: "https://www.youtube.com/watch?v=_2v6Mbx5v1w",
        channelName: "Coffeezilla",
        viewCount: "8.9M views",
        isGenerated: false,
      },
      {
        id: 3,
        title: "I Tried Dropshipping for 30 Days (Realistic Results)",
        duration: "14:35",
        type: "Business Experiment",
        thumbnail: `https://img.youtube.com/vi/${extractVideoId("https://www.youtube.com/watch?v=qfk8lOzwo2Q")}/maxresdefault.jpg`,
        videoUrl: "https://www.youtube.com/watch?v=qfk8lOzwo2Q",
        channelName: "Ryan Kaji",
        viewCount: "1.8M views",
        isGenerated: false,
      },
      {
        id: 4,
        title: "The TRUTH About Making Money Online",
        duration: "18:22",
        type: "Financial Education",
        thumbnail: `https://img.youtube.com/vi/${extractVideoId("https://www.youtube.com/watch?v=_A0udZPwHxs")}/maxresdefault.jpg`,
        videoUrl: "https://www.youtube.com/watch?v=_A0udZPwHxs",
        channelName: "Graham Stephan",
        viewCount: "3.2M views",
        isGenerated: false,
      },
    ]
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sampleVideos", JSON.stringify(sampleVideos))
    }
  }, [sampleVideos])

  const handleMouseDown = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

      const constrainedWidth = Math.min(Math.max(newLeftWidth, 20), 80)
      setLeftWidth(constrainedWidth)
    },
    [isDragging],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)

      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const checkCacheAndProcess = async (url: string): Promise<void> => {
    try {
      setIsCheckingCache(true)
      setError(null)

      console.log("Attempting to connect to:", `${API_BASE_URL}/youtube/process`)

      const response = await fetch(`${API_BASE_URL}/youtube/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          youtube_url: url,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && data.data && data.data.html_content) {
        // Render the game immediately when response is received
        setGameHtml(data.data.html_content)
        setIsApiConnected(true)

        const gameType = extractGameType(data.data.html_content)

        const existingVideoIndex = sampleVideos.findIndex((video) => video.videoUrl === url)
        if (existingVideoIndex !== -1) {
          setSampleVideos((prev) =>
            prev.map((video, index) =>
              index === existingVideoIndex
                ? {
                    ...video,
                    gameHtml: data.data.html_content,
                    type: gameType,
                    title: data.data.video_title || video.title,
                    isGenerated: true,
                  }
                : video,
            ),
          )
        }
      } else {
        setShowGeneratePopup(true)
      }
    } catch (err) {
      console.error("Full error details:", err)

      let errorMessage = "Unknown error occurred"

      if (err instanceof TypeError && err.message.includes("Failed to fetch")) {
        errorMessage = `Cannot connect to backend server at ${API_BASE_URL}. Please ensure your backend is running.`
      } else if (err instanceof Error) {
        errorMessage = err.message
      }

      setError(errorMessage)
      setIsApiConnected(false)
    } finally {
      setIsCheckingCache(false)
    }
  }

  // Add this function before your component
  const testApiConnection = async (baseUrl: string): Promise<boolean> => {
    try {
      const response = await fetch(`${baseUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`, {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        })
        setIsApiConnected(response.ok)
      } catch {
        setIsApiConnected(false)
        console.log(`Backend not reachable at ${API_BASE_URL}`)
      }
    }

    checkConnection()
  }, [])

  const extractVideoTitle = (url: string): string => {
    try {
      const urlObj = new URL(url)
      const videoId = urlObj.searchParams.get("v") || urlObj.pathname.split("/").pop()
      return `Video ${videoId?.substring(0, 8) || "Unknown"}`
    } catch {
      return `Video ${Date.now().toString().substring(-6)}`
    }
  }

  const extractVideoDuration = (): string => {
    return `${Math.floor(Math.random() * 15) + 1}:${Math.floor(Math.random() * 60)
      .toString()
      .padStart(2, "0")}`
  }

  // Function to process YouTube URL and generate game
  const processYoutubeUrl = async (regenerate = false) => {
    if (!youtubeUrl) {
      setError("Please enter a YouTube URL")
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      setShowGeneratePopup(false)
      if (!regenerate) {
        setGameHtml(null)
      }

      const response = await fetch(`${API_BASE_URL}/youtube/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          youtube_url: youtubeUrl,
          ...(regenerate && { regenerate: true }),
        }),
      })

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.data && data.data.html_content) {
        setGameHtml(data.data.html_content)
        setIsApiConnected(true)

        const gameType = extractGameType(data.data.html_content)

        // Check if this URL already exists in sample videos
        const existingVideoIndex = sampleVideos.findIndex((video) => video.videoUrl === youtubeUrl)

        if (existingVideoIndex !== -1) {
          // Update existing video with new game content
          setSampleVideos((prev) =>
            prev.map((video, index) =>
              index === existingVideoIndex
                ? {
                    ...video,
                    gameHtml: data.data.html_content,
                    type: gameType,
                    title: data.data.video_title || video.title,
                    isGenerated: true,
                  }
                : video,
            ),
          )
          setCurrentGameId(sampleVideos[existingVideoIndex].id)
        } else {
          // Create new video entry
          const videoId = extractVideoId(youtubeUrl)
          const newVideo: SampleVideo = {
            id: Date.now(),
            title: data.data.video_title || extractVideoTitle(youtubeUrl),
            duration: extractVideoDuration(),
            type: gameType,
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            videoUrl: youtubeUrl,
            gameHtml: data.data.html_content,
            isGenerated: true,
            channelName: "Generated Content",
            viewCount: "New",
          }

          setSampleVideos((prev) => [newVideo, ...prev])
          setCurrentGameId(newVideo.id)
        }
      } else {
        throw new Error("Invalid response format")
      }
    } catch (err) {
      setError(`Failed to process video: ${err instanceof Error ? err.message : String(err)}`)
      console.error("Error processing YouTube URL:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const extractGameType = (htmlContent: string): string => {
    const title = htmlContent.match(/<title>(.*?)<\/title>/i)?.[1] || ""

    if (title.toLowerCase().includes("quiz")) return "Interactive Quiz"
    if (title.toLowerCase().includes("explorer") || title.toLowerCase().includes("regression")) return "Data Explorer"
    if (title.toLowerCase().includes("weather")) return "API Tutorial"
    if (title.toLowerCase().includes("game")) return "Learning Game"
    if (title.toLowerCase().includes("tutorial")) return "Interactive Tutorial"

    return "Interactive App"
  }

  useEffect(() => {
    if (gameHtml && iframeRef.current) {
      const iframe = iframeRef.current
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document

      if (iframeDoc) {
        iframeDoc.open()
        iframeDoc.write(gameHtml)
        iframeDoc.close()
      }
    }
  }, [gameHtml])

  const handleVideoClick = async (videoId: number) => {
    const video = sampleVideos.find((v) => v.id === videoId)
    if (video) {
      setYoutubeUrl(video.videoUrl)
      setExpandedVideo(videoId)
      setCurrentGameId(videoId)

      // If this video has generated game content, load it
      if (video.gameHtml) {
        setGameHtml(video.gameHtml)
      } else {
        await checkCacheAndProcess(video.videoUrl)
      }
    }
  }

  // Function to remove a generated video from the list
  const removeGeneratedVideo = (videoId: number) => {
    setSampleVideos((prev) => prev.filter((video) => video.id !== videoId))

    // If the removed video was currently selected, clear the game
    if (currentGameId === videoId) {
      setGameHtml(null)
      setCurrentGameId(null)
      setExpandedVideo(null)
    }
  }

  // Close expanded video
  const closeExpandedVideo = () => {
    setExpandedVideo(null)
    setShowGeneratePopup(false)
  }

  const selectedVideoData = expandedVideo ? sampleVideos.find((v) => v.id === expandedVideo) : null

  return (
    <div className="min-h-screen bg-[#f4f3f3] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        {/* Primary large blobs */}
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-green-300/30 to-green-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-32 left-32 w-80 h-80 bg-gradient-to-tr from-orange-300/25 to-pink-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-gradient-to-r from-green-200/20 to-yellow-200/15 rounded-full blur-2xl"></div>

        {/* Additional medium blobs */}
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-gradient-to-bl from-blue-200/15 to-purple-200/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-1/4 w-60 h-60 bg-gradient-to-tl from-yellow-300/20 to-orange-200/15 rounded-full blur-2xl"></div>
        <div className="absolute top-2/3 left-10 w-56 h-56 bg-gradient-to-r from-pink-200/15 to-red-200/10 rounded-full blur-2xl"></div>

        {/* Small accent blobs */}
        <div className="absolute top-1/4 right-10 w-40 h-40 bg-gradient-to-br from-cyan-200/20 to-blue-300/15 rounded-full blur-xl"></div>
        <div className="absolute bottom-1/3 left-1/2 w-48 h-48 bg-gradient-to-tr from-lime-200/15 to-green-300/10 rounded-full blur-xl"></div>
        <div className="absolute top-3/4 right-2/3 w-36 h-36 bg-gradient-to-bl from-violet-200/15 to-purple-300/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-1/3 w-44 h-44 bg-gradient-to-tl from-amber-200/20 to-yellow-300/15 rounded-full blur-xl"></div>

        {/* Tiny floating blobs for depth */}
        <div className="absolute top-1/3 left-1/3 w-24 h-24 bg-gradient-to-r from-emerald-200/25 to-teal-200/15 rounded-full blur-lg"></div>
        <div className="absolute bottom-1/4 left-3/4 w-28 h-28 bg-gradient-to-br from-rose-200/20 to-pink-200/10 rounded-full blur-lg"></div>
        <div className="absolute top-1/2 left-1/6 w-32 h-32 bg-gradient-to-tr from-indigo-200/15 to-blue-200/10 rounded-full blur-lg"></div>
        <div className="absolute bottom-2/3 right-1/6 w-20 h-20 bg-gradient-to-bl from-orange-200/25 to-amber-200/15 rounded-full blur-lg"></div>

        <div className="absolute top-0 left-1/2 w-80 h-80 bg-gradient-to-b from-green-100/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/2 w-72 h-72 bg-gradient-to-t from-orange-100/10 to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* Top Navigation Bar */}
      <div className="relative z-20 bg-white/60 backdrop-blur-sm border-b border-[#ececec]/50 px-6 py-4">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="logo-container">
              <svg
                id="Layer_1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 204 146.6"
                width="32px"
                height="32px"
                className="fill-[#1d1c1b]"
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

            {/* Search/Dropdown Container */}
            <div className="relative">
              <button
                className="flex items-center justify-between gap-3 px-3 py-2 bg-white/80 backdrop-blur-sm border border-[#d3d1cf]/50 rounded-lg hover:bg-white/90 focus:outline-none transition-all duration-200"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span className="text-sm text-[#1d1c1b] max-w-[180px] truncate">{selectedIndex}</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className={`transform transition-transform text-[#1d1c1b] ${isDropdownOpen ? "rotate-180" : ""}`}
                >
                  <path d="M2 5l6 6 6-6"></path>
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-white/95 backdrop-blur-sm border border-[#d3d1cf]/50 rounded-lg shadow-lg z-[100]">
                  <div className="p-3">
                    <select
                      className="w-full p-2 border border-[#d3d1cf]/50 rounded-md focus:outline-none focus:ring-1 focus:ring-[#1d1c1b] bg-white/90 text-sm"
                      value={selectedIndex}
                      onChange={(e) => setSelectedIndex(e.target.value)}
                    >
                      <option value="" disabled>
                        Select an index
                      </option>
                      <option value="Dance (Public)">Dance (Public)</option>
                      <option value="Sports (Public)">Sports (Public)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <a
              href="#"
              className="text-[#1d1c1b] hover:text-gray-600 transition-colors"
              onClick={(e) => e.preventDefault()}
            >
              <svg fill="currentColor" width="14" height="14" viewBox="0 0 24 24">
                <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"></path>
              </svg>
            </a>
          </div>

          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-200 bg-green-100/80 text-green-700 border border-green-200/50"
            onClick={() => {
            }}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${isApiConnected ? "bg-green-500" : "bg-red-500"}`}></div>
            <span>TwelveLabs API {isApiConnected ? "Connected" : "Disconnected"}</span>
          </div>
        </div>
      </div>

      {/* Generate Popup */}
      {showGeneratePopup && (
        <div className="fixed top-4 right-4 z-50 bg-white/95 backdrop-blur-sm border border-orange-200 rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-right-5 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-orange-600"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">No Cached Game Found</h4>
              <p className="text-sm text-gray-600 mb-3">
                This video doesn't have a generated game yet. Click Generate to create one!
              </p>
              <button onClick={() => setShowGeneratePopup(false)} className="text-xs text-gray-500 hover:text-gray-700">
                Dismiss
              </button>
            </div>
            <button
              onClick={() => setShowGeneratePopup(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area with Resizable Panels */}
      <div ref={containerRef} className="relative z-10 flex h-[calc(100vh-73px)]">
        {/* Left Compartment */}
        <div className="bg-white/30 backdrop-blur-sm relative flex flex-col" style={{ width: `${leftWidth}%` }}>
          <div
            className={`h-full flex flex-col p-8 overflow-y-auto transition-all duration-300 ${selectedVideoData ? "blur-sm" : ""}`}
          >
            {/* Main Title */}
            <div className="text-center mb-8">
              <h1 className="text-5xl font-bold text-[#1d1c1b] mb-4">Video to Gamified Learning</h1>
              <p className="text-lg text-gray-600 max-w-md mx-auto">
                Transform video content into interactive educational experiences
              </p>
            </div>

            {/* URL Input */}
            <div className="w-full max-w-md mx-auto space-y-4 mb-8">
              <input
                type="text"
                placeholder="Paste video URL here..."
                className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-[#d3d1cf]/50 rounded-lg text-[#1d1c1b] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d1c1b]/20 transition-all duration-200"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
              <button
                className={`w-full px-6 py-3 bg-[#1d1c1b] hover:bg-[#1d1c1b]/90 text-white rounded-lg font-medium transition-all duration-200 ${
                  isLoading ? "opacity-70 cursor-not-allowed" : ""
                }`}
                onClick={() => processYoutubeUrl(false)}
                disabled={isLoading}
              >
                {isLoading ? "Generating..." : "Generate"}
              </button>

              {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
            </div>

            {/* Sample Videos */}
            <div className="w-full mx-auto max-w-md">
              <h3 className="text-lg font-semibold text-[#1d1c1b] mb-4">Sample Interactive Apps</h3>
              <div className="space-y-4">
                {sampleVideos.map((video) => (
                  <div
                    key={video.id}
                    className={`bg-white/70 backdrop-blur-sm border border-[#ececec]/60 rounded-xl p-5 hover:bg-white/85 cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-xl group ${
                      expandedVideo === video.id ? "ring-2 ring-[#1d1c1b]/30 scale-[1.01] shadow-xl" : ""
                    } ${video.isGenerated ? "border-l-4 border-l-blue-400 bg-gradient-to-r from-blue-50/30 to-white/70" : ""}`}
                    onClick={() => handleVideoClick(video.id)}
                  >
                    <div className="flex gap-5">
                      <div className="relative flex-shrink-0">
                        <img
                          src={video.thumbnail || "/placeholder.svg"}
                          alt={video.title}
                          className="w-36 h-20 object-cover rounded-lg shadow-md transition-all duration-300 group-hover:shadow-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = "/placeholder.svg?height=90&width=160"
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 bg-black/70 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-300 group-hover:bg-black/80 group-hover:scale-110">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="text-white ml-0.5"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                        <div className="absolute bottom-1 right-1 bg-black/90 text-white text-xs px-2 py-1 rounded-md font-medium">
                          {video.duration}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="font-semibold text-[#1d1c1b] text-base leading-tight line-clamp-2 group-hover:text-[#0f0e0e] transition-colors">
                            {video.title}
                          </div>
                          <div className="text-sm text-gray-600 font-medium">{video.channelName}</div>
                          <div className="text-xs text-gray-500">{video.viewCount}</div>
                        </div>
                        <div className="flex items-center mt-3">
                          <div
                            className={`inline-block px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-300 ${
                              video.isGenerated
                                ? "bg-blue-100 text-blue-700 border border-blue-200"
                                : "bg-gray-100 text-gray-700 border border-gray-200"
                            }`}
                          >
                            {video.type}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Video Player */}
          {selectedVideoData && (
            <div className="absolute inset-0 flex items-center justify-center p-8 z-20">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 w-full max-w-2xl border border-white/20 animate-in zoom-in-95 duration-300">
                {/* Close Button */}
                <button
                  onClick={closeExpandedVideo}
                  className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors z-30"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>

                {/* Video Player */}
                <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                  {isCheckingCache ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                      <div className="text-center text-white">
                        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-sm">Checking cache...</p>
                      </div>
                    </div>
                  ) : (
                    <iframe
                      src={getYouTubeEmbedUrl(selectedVideoData.videoUrl)}
                      title={selectedVideoData.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>

                {/* Video Info */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-[#1d1c1b] text-lg leading-tight">{selectedVideoData.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{selectedVideoData.channelName}</span>
                    <span>•</span>
                    <span>{selectedVideoData.viewCount}</span>
                    <span>•</span>
                    <span>{selectedVideoData.duration}</span>
                  </div>
                  <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                    {selectedVideoData.type}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resizable Divider */}
        <div
          className="w-1 bg-[#d3d1cf]/30 hover:bg-[#d3d1cf]/50 cursor-col-resize relative group transition-colors duration-200 select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-y-0 -inset-x-2 flex items-center justify-center">
            <div className="w-1 h-8 bg-[#1d1c1b]/20 rounded-full group-hover:bg-[#1d1c1b]/40 transition-colors duration-200"></div>
          </div>
        </div>

        <div className="bg-white/40 backdrop-blur-sm relative flex flex-col" style={{ width: `${100 - leftWidth}%` }}>
          <div className="h-full flex flex-col">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center p-4">
                <div className="w-16 h-16 border-4 border-[#1d1c1b]/20 border-t-[#1d1c1b] rounded-full animate-spin mb-4"></div>
                <p className="text-[#1d1c1b] font-medium">Generating interactive content...</p>
              </div>
            ) : gameHtml ? (
              <div className="h-full flex flex-col min-h-0">
                <div className="flex items-center justify-between p-4 pb-0 flex-shrink-0">
                  <h2 className="text-xl font-bold text-[#1d1c1b]">Interactive Learning Game</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => processYoutubeUrl(true)}
                      disabled={isLoading}
                      className="flex items-center gap-1 text-xs bg-white/60 hover:bg-white/80 px-3 py-1.5 rounded-full transition-all duration-200 border border-[#ececec]/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Regenerate with new content"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={isLoading ? "animate-spin" : ""}
                      >
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                        <path d="M21 3v5h-5" />
                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                        <path d="M3 21v-5h5" />
                      </svg>
                      {isLoading ? "Regenerating..." : "Regenerate"}
                    </button>
                    <button
                      onClick={() => setGameHtml(null)}
                      className="text-xs bg-[#1d1c1b]/10 hover:bg-[#1d1c1b]/20 px-2 py-1 rounded-md transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center px-4 pt-2 pb-0 flex-shrink-0">
                  <div className="flex bg-white/60 backdrop-blur-sm rounded-lg p-1 border border-[#ececec]/50">
                    <button
                      onClick={() => setActiveTab("app")}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                        activeTab === "app"
                          ? "bg-white text-[#1d1c1b] shadow-sm border border-[#ececec]/30"
                          : "text-gray-600 hover:text-[#1d1c1b] hover:bg-white/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                          <line x1="8" y1="21" x2="16" y2="21"></line>
                          <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                        App
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab("code")}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                        activeTab === "code"
                          ? "bg-white text-[#1d1c1b] shadow-sm border border-[#ececec]/30"
                          : "text-gray-600 hover:text-[#1d1c1b] hover:bg-white/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="16,18 22,12 16,6"></polyline>
                          <polyline points="8,6 2,12 8,18"></polyline>
                        </svg>
                        Code
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 p-4 pt-2">
                  {activeTab === "app" ? (
                    <div className="h-full bg-white rounded-lg overflow-hidden border border-[#ececec] shadow-sm">
                      <iframe
                        ref={iframeRef}
                        className="w-full h-full"
                        title="Interactive Game"
                        sandbox="allow-scripts allow-same-origin"
                      />
                    </div>
                  ) : (
                    <div className="h-full bg-white rounded-lg overflow-hidden border border-[#ececec] shadow-sm">
                      <CodeViewer code={gameHtml} />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Instructions */
              <div className="h-full flex flex-col justify-center items-center p-4">
                <div className="text-center max-w-md">
                  <div className="w-20 h-20 mx-auto mb-6 bg-white/60 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-[#ececec]/50">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="text-gray-400"
                    >
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  </div>

                  <h2 className="text-2xl font-bold text-[#1d1c1b] mb-6">Get Started</h2>

                  <div className="space-y-4 text-left">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-[#1d1c1b] text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                        1
                      </div>
                      <p className="text-gray-600 text-sm">
                        Click any sample video to automatically check for cached games
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-[#1d1c1b] text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                        2
                      </div>
                      <p className="text-gray-600 text-sm">
                        If no cached game exists, you'll see a popup to click Generate
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-[#1d1c1b] text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                        3
                      </div>
                      <p className="text-gray-600 text-sm">Or paste any video URL to create new learning experiences</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
