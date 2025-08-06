"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import CodeViewer from "@/components/code-viewer"
import SourceToggle from "@/components/source-toggle"
import TwelveLabsSelector from "@/components/twelvelabs-selector"
import ApiConnectionModal from "@/components/api-connection-modal"

interface SampleVideo {
  id: number
  title: string
  duration: string
  type: string
  thumbnail: string
  videoUrl: string
  htmlFilePath: string
  isGenerated?: boolean
  channelName?: string
  viewCount?: string
  createdAt?: string
  videoId?: string
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
  const [activeSource, setActiveSource] = useState<"youtube" | "twelvelabs">("youtube")

  const [showApiModal, setShowApiModal] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [indexes, setIndexes] = useState<any[]>([])
  const [videos, setVideos] = useState<any[]>([])
  const [selectedTwelveLabsIndex, setSelectedTwelveLabsIndex] = useState("")
  const [selectedTwelveLabsVideo, setSelectedTwelveLabsVideo] = useState("")
  const [selectedTwelveLabsVideoName, setSelectedTwelveLabsVideoName] = useState("")
  const [isLoadingIndexes, setIsLoadingIndexes] = useState(false)
  const [isLoadingVideos, setIsLoadingVideos] = useState(false)
  const [iframeKey, setIframeKey] = useState(0) // Force iframe refresh
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [streamingProgress, setStreamingProgress] = useState<string>("")
  const [isStreaming, setIsStreaming] = useState(false)
  const streamingCodeRef = useRef<HTMLDivElement>(null)

  const [statusMessage, setStatusMessage] = useState("Starting process... This may take about 1 minute.");

  const [isRegenerate, setIsRegenerate] = useState(false);
  
  // Add state for YouTube warning popup
  const [showYouTubeWarning, setShowYouTubeWarning] = useState(false)
  
  // Add state to store pending YouTube URL for processing
  const [pendingYouTubeUrl, setPendingYouTubeUrl] = useState("")
  const [pendingRegenerate, setPendingRegenerate] = useState(false)

  const progressToMessage = (msg: string, isRegenerate: boolean) => {
    if (isRegenerate) {
      if (msg.includes("Starting analysis with TwelveLabs")) return "Analyzing the video content with TwelveLabs";
      if (msg.includes("Generating game with SambaNova")) return "Generating the Game with Sambanova";
      return "Analyzing the video content with TwelveLabs";
    } else {
      if (msg.includes("Validating YouTube URL")) return "Validating YouTube URL";
      if (msg.includes("Processing video")) return "Processing video";
      if (msg.includes("Video downloaded. Indexing with TwelveLabs")) return "Indexing the Video with TwelveLabs";
      if (msg.includes("Chunking video")) return "Chunking the video";
      if (msg.includes("Indexing chunk")) return msg.replace("progress\ndata: ", "");
      if (msg.includes("Indexing video")) return "Indexing the Video with TwelveLabs";
      if (msg.includes("Analyzing video content")) return "Analyzing the video content with TwelveLabs";
      if (msg.includes("Generating game with SambaNova")) return "Generating the Game with Sambanova";
      return "Processing the video";
    }
  };


  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000" 
  const extractVideoId = (url: string): string => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/
    const match = url.match(regex)
    return match ? match[1] : ""
  }

  const getYouTubeEmbedUrl = (url: string): string => {
    const videoId = extractVideoId(url)
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url
  }

  const [sampleVideos, setSampleVideos] = useState<SampleVideo[]>([])

  const fetchSampleGames = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sample-apps`)
      if (!response.ok) throw new Error("Failed to fetch sample games")
      const data = await response.json()
      const apps = (data.apps || []).map((app: any, idx: number) => {
        return {
          id: idx + 1,
          title: app.video_title || `Video ${app.video_id?.substring(0, 8) || idx + 1}`,
          duration: app.duration || "",
          type: app.has_html_file ? "Interactive App" : "Video",
          thumbnail: app.youtube_url
            ? `https://img.youtube.com/vi/${extractVideoId(app.youtube_url)}/maxresdefault.jpg`
            : "/placeholder.svg",
          videoUrl: app.youtube_url || "",
          htmlFilePath: app.html_file_path || "",
          isGenerated: !!app.has_html_file,
          channelName: app.channel_name || "",
          viewCount: app.view_count || "",
          createdAt: app.created_at || app.createdAt || "",
          videoId: app.video_id || app.videoId || "",
        }
      })
      setSampleVideos(apps)
    } catch (err) {
      setError("Could not load sample interactive games")
    }
  }

  useEffect(() => {
    fetchSampleGames()
  }, [API_BASE_URL])

  useEffect(() => {
    const ensureGifPlaying = () => {
      const gifs = document.querySelectorAll('img[src*="TwelveLabs.gif"]') as NodeListOf<HTMLImageElement>
      gifs.forEach(gif => {
        if (gif.complete && gif.naturalHeight !== 0) {
          const currentSrc = gif.src
          gif.src = ''
          gif.src = currentSrc
        }
      })
    }

    const interval = setInterval(ensureGifPlaying, 2000)
    
    return () => clearInterval(interval)
  }, [isLoading, isCheckingCache])

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

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["X-Twelvelabs-Api-Key"] = apiKey;
      const response = await fetch(`${API_BASE_URL}/youtube/process`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          youtube_url: url,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && data.data && data.data.html_file_path) {
        // Render the game immediately when response is received
        setGameHtml(data.data.html_file_path)

        const gameType = extractGameType(data.data.html_file_path)

        const existingVideoIndex = sampleVideos.findIndex((video) => video.videoUrl === url)
        if (existingVideoIndex !== -1) {
          setSampleVideos((prev) =>
            prev.map((video, index) =>
              index === existingVideoIndex
                ? {
                    ...video,
                    htmlFilePath: data.data.html_file_path,
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
        const apiKeyFromStorage = localStorage.getItem("twelvelabs_api_key")
        if (apiKeyFromStorage) {
          setApiKey(apiKeyFromStorage)
          setIsApiConnected(true)
        }
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


  const fetchYouTubeTitle = async (url: string): Promise<string> => {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
      const response = await fetch(oembedUrl)
      if (response.ok) {
        const data = await response.json()
        return data.title || extractVideoTitle(url)
      }
    } catch {}
    return extractVideoTitle(url)
  }

  const processYoutubeUrl = async (regenerate = false) => {
    setIsRegenerate(regenerate);
    if (!youtubeUrl) {
      setError("Please enter a YouTube URL")
      return
    }

    // Show YouTube warning for new URLs (not regenerations)
    if (!regenerate) {
      setPendingYouTubeUrl(youtubeUrl)
      setPendingRegenerate(false)
      setShowYouTubeWarning(true)
      return
    }

    let pendingTitle = extractVideoTitle(youtubeUrl)
    if (!regenerate) {
      try {
        pendingTitle = await fetchYouTubeTitle(youtubeUrl)
      } catch {}
    }

    if (!regenerate) {
      const tempId = Date.now()
      setSampleVideos((prev) => [
        {
          id: tempId,
          title: pendingTitle,
          duration: "",
          type: "Processing",
          thumbnail: `https://img.youtube.com/vi/${extractVideoId(youtubeUrl)}/maxresdefault.jpg`,
          videoUrl: youtubeUrl,
          htmlFilePath: "",
          isGenerated: false,
          channelName: "",
          viewCount: "",
          createdAt: new Date().toISOString(),
          videoId: extractVideoId(youtubeUrl),
        },
        ...prev,
      ])
      setExpandedVideo(tempId)
      setCurrentGameId(tempId)
    }

    setIsLoading(true)
    setError(null)
    setShowGeneratePopup(false)
    setGameHtml(null)
    let streamedHtml = ""
    let streamedAnalysis = ""
    let progressMsg = ""
    let indexingCompleted = false
    try {
      await new Promise<void>((resolve, reject) => {
        const endpoint = regenerate
          ? `${API_BASE_URL}/youtube/regenerate?youtube_url=${encodeURIComponent(youtubeUrl)}`
          : `${API_BASE_URL}/youtube/process?youtube_url=${encodeURIComponent(youtubeUrl)}`
        let evtSource: EventSource;
        if (apiKey) {
          fetch(endpoint, { headers: { "X-Twelvelabs-Api-Key": apiKey } })
            .then(() => {
              evtSource = new EventSource(endpoint);

              evtSource.onmessage = (event) => {
                const e = event as MessageEvent
                if (e.data === "[DONE]") {
                  evtSource.close()
                  setIsLoading(false)
                  setIsStreaming(false)
                  setStreamingProgress("")
                  setTimeout(async () => {
                    try {
                      // First refresh the sample games list
                      await fetchSampleGames()
                      
                      // Fetch the latest sample app for this YouTube video
                      const response = await fetch(`${API_BASE_URL}/sample-apps/youtube/${encodeURIComponent(youtubeUrl)}`)
                      if (response.ok) {
                        const data = await response.json()
                        if (data.success && data.data && data.data.html_file_path) {
                          setGameHtml(data.data.html_file_path)
                          setCurrentGameId(data.data.id || null)
                          setExpandedVideo(data.data.id || null)
                          setActiveTab("app") // Ensure we're on the app tab to see the rendered result
                          
                          // Save the game to user games for persistence
                          handleRenderGame(data.data)
                        } else {
                          // fallback: fetch all sample apps and try to find the right one
                          const allResp = await fetch(`${API_BASE_URL}/sample-apps`)
                          if (allResp.ok) {
                            const allData = await allResp.json()
                            const found = (allData.apps || []).find((app: any) => app.youtube_url === youtubeUrl)
                            if (found) {
                              setGameHtml(found.html_file_path)
                              setCurrentGameId(found.id)
                              setExpandedVideo(found.id)
                              setActiveTab("app") // Ensure we're on the app tab
                              
                              // Save the game to user games for persistence
                              handleRenderGame(found)
                            }
                          }
                        }
                      }
                    } catch (err) {
                      console.error("Error refreshing app data:", err)
                    }
                  }, 1000)
                  resolve()
                }
              }

              evtSource.addEventListener("progress", (event) => {
                const e = event as MessageEvent
                progressMsg = e.data
                setStreamingProgress(progressMsg)
                setStatusMessage(progressToMessage(progressMsg, regenerate))
                if (progressMsg.includes("Generating game with SambaNova")) {
                  setIsStreaming(true)
                }
              })

              evtSource.addEventListener("analysis", (event) => {
                const e = event as MessageEvent
                streamedAnalysis = e.data
                setStreamingProgress("Twelvelabs Analysis...")
                setGameHtml(streamedAnalysis)
              })

              evtSource.addEventListener("game_chunk", (event) => {
                const e = event as MessageEvent
                streamedHtml += e.data
                setGameHtml(streamedHtml)
                console.log("Received game chunk, total length:", streamedHtml.length)
              })

              evtSource.addEventListener("done", async () => {
                evtSource.close()
                setIsLoading(false)
                setIsStreaming(false)
                setStreamingProgress("")
                
                // Auto-refresh and select the processed video
                setTimeout(async () => {
                  try {
                    // First refresh the sample games list
                    await fetchSampleGames()
                    
                    // Fetch the latest sample app for this YouTube video
                    const response = await fetch(`${API_BASE_URL}/sample-apps/youtube/${encodeURIComponent(youtubeUrl)}`)
                    if (response.ok) {
                      const data = await response.json()
                      if (data.success && data.data && data.data.html_file_path) {
                        setGameHtml(data.data.html_file_path)
                        setCurrentGameId(data.data.id || null)
                        setExpandedVideo(data.data.id || null)
                        setActiveTab("app") // Ensure we're on the app tab to see the rendered result
                        
                        // Save the game to user games for persistence
                        handleRenderGame(data.data)
                      } else {
                        // fallback: fetch all sample apps and try to find the right one
                        const allResp = await fetch(`${API_BASE_URL}/sample-apps`)
                        if (allResp.ok) {
                          const allData = await allResp.json()
                          const found = (allData.apps || []).find((app: any) => app.youtube_url === youtubeUrl)
                          if (found) {
                            setGameHtml(found.html_file_path)
                            setCurrentGameId(found.id)
                            setExpandedVideo(found.id)
                            setActiveTab("app") // Ensure we're on the app tab
                            
                            // Save the game to user games for persistence
                            handleRenderGame(found)
                          }
                        }
                      }
                    }
                  } catch (err) {
                    console.error("Error refreshing app data:", err)
                  }
                }, 1000)
                
                resolve()
              })

              evtSource.addEventListener("error", (event) => {
                const e = event as MessageEvent
                setError(e.data || "Streaming error")
                evtSource.close()
                setIsLoading(false)
                setIsStreaming(false)
                setStreamingProgress("")
                reject(e.data || "Streaming error")
              })
            });
        } else {
          evtSource = new EventSource(endpoint);

          evtSource.onmessage = (event) => {
            const e = event as MessageEvent
            if (e.data === "[DONE]") {
              evtSource.close()
              setIsLoading(false)
              setIsStreaming(false)
              setStreamingProgress("")
                              setTimeout(async () => {
                  try {
                    // First refresh the sample games list
                    await fetchSampleGames()
                    
                    // Fetch the latest sample app for this YouTube video
                    const response = await fetch(`${API_BASE_URL}/sample-apps/youtube/${encodeURIComponent(youtubeUrl)}`)
                    if (response.ok) {
                      const data = await response.json()
                      if (data.success && data.data && data.data.html_file_path) {
                        setGameHtml(data.data.html_file_path)
                        setCurrentGameId(data.data.id || null)
                        setExpandedVideo(data.data.id || null)
                        setActiveTab("app") // Ensure we're on the app tab to see the rendered result
                        
                        // Save the game to user games for persistence
                        handleRenderGame(data.data)
                      } else {
                        // fallback: fetch all sample apps and try to find the right one
                        const allResp = await fetch(`${API_BASE_URL}/sample-apps`)
                        if (allResp.ok) {
                          const allData = await allResp.json()
                          const found = (allData.apps || []).find((app: any) => app.youtube_url === youtubeUrl)
                          if (found) {
                            setGameHtml(found.html_file_path)
                            setCurrentGameId(found.id)
                            setExpandedVideo(found.id)
                            setActiveTab("app") // Ensure we're on the app tab
                            
                            // Save the game to user games for persistence
                            handleRenderGame(found)
                          }
                        }
                      }
                    }
                  } catch (err) {
                    console.error("Error refreshing app data:", err)
                  }
                }, 1000)
              resolve()
            }
          }

          evtSource.addEventListener("progress", (event) => {
            const e = event as MessageEvent
            progressMsg = e.data
            setStreamingProgress(progressMsg)
            setStatusMessage(progressToMessage(progressMsg, regenerate))
            if (progressMsg.includes("Generating game with SambaNova")) {
              setIsStreaming(true)
            }
          })

          evtSource.addEventListener("analysis", (event) => {
            const e = event as MessageEvent
            streamedAnalysis = e.data
            setStreamingProgress("Twelvelabs Analysis...")
            setGameHtml(streamedAnalysis)
          })

          evtSource.addEventListener("game_chunk", (event) => {
            const e = event as MessageEvent
            streamedHtml += e.data
            setGameHtml(streamedHtml)
            console.log("Received game chunk, total length:", streamedHtml.length)
          })

          evtSource.addEventListener("done", async () => {
            evtSource.close()
            setIsLoading(false)
            setIsStreaming(false)
            setStreamingProgress("")
            
            // Auto-refresh and select the processed video
            setTimeout(async () => {
              try {
                // First refresh the sample games list
                await fetchSampleGames()
                
                // Fetch the latest sample app for this YouTube video
                const response = await fetch(`${API_BASE_URL}/sample-apps/youtube/${encodeURIComponent(youtubeUrl)}`)
                if (response.ok) {
                  const data = await response.json()
                  if (data.success && data.data && data.data.html_file_path) {
                    setGameHtml(data.data.html_file_path)
                    setCurrentGameId(data.data.id || null)
                    setExpandedVideo(data.data.id || null)
                    setActiveTab("app") // Ensure we're on the app tab to see the rendered result
                    
                    // Save the game to user games for persistence
                    handleRenderGame(data.data)
                  } else {
                    // fallback: fetch all sample apps and try to find the right one
                    const allResp = await fetch(`${API_BASE_URL}/sample-apps`)
                    if (allResp.ok) {
                      const allData = await allResp.json()
                      const found = (allData.apps || []).find((app: any) => app.youtube_url === youtubeUrl)
                      if (found) {
                        setGameHtml(found.html_file_path)
                        setCurrentGameId(found.id)
                        setExpandedVideo(found.id)
                        setActiveTab("app") // Ensure we're on the app tab
                        
                        // Save the game to user games for persistence
                        handleRenderGame(found)
                      }
                    }
                  }
                }
              } catch (err) {
                console.error("Error refreshing app data:", err)
              }
            }, 1000)
            
            resolve()
          })

          evtSource.addEventListener("error", (event) => {
            const e = event as MessageEvent
            setError(e.data || "Streaming error")
            evtSource.close()
            setIsLoading(false)
            setIsStreaming(false)
            setStreamingProgress("")
            reject(e.data || "Streaming error")
          })
        }
      })
    } catch (err) {
      setError(`Failed to process video: ${err instanceof Error ? err.message : String(err)}`)
      setIsLoading(false)
      setIsStreaming(false)
      setStreamingProgress("")
    }
    return
  }

  // Function to handle actual YouTube processing after warning
  const handleContinueWithYouTube = async () => {
    setShowYouTubeWarning(false)
    
    if (pendingYouTubeUrl) {
      setYoutubeUrl(pendingYouTubeUrl)
      setPendingYouTubeUrl("")
      
      // Process the pending URL
      const url = pendingYouTubeUrl
      const regenerate = pendingRegenerate
      setPendingRegenerate(false)
      
      let pendingTitle = extractVideoTitle(url)
      if (!regenerate) {
        try {
          pendingTitle = await fetchYouTubeTitle(url)
        } catch {}
      }

      if (!regenerate) {
        const tempId = Date.now()
        setSampleVideos((prev) => [
          {
            id: tempId,
            title: pendingTitle,
            duration: "",
            type: "Processing",
            thumbnail: `https://img.youtube.com/vi/${extractVideoId(url)}/maxresdefault.jpg`,
            videoUrl: url,
            htmlFilePath: "",
            isGenerated: false,
            channelName: "",
            viewCount: "",
            createdAt: new Date().toISOString(),
            videoId: extractVideoId(url),
          },
          ...prev,
        ])
        setExpandedVideo(tempId)
        setCurrentGameId(tempId)
      }

      setIsLoading(true)
      setError(null)
      setShowGeneratePopup(false)
      setGameHtml(null)
      let streamedHtml = ""
      let streamedAnalysis = ""
      let progressMsg = ""
      let indexingCompleted = false
      try {
        await new Promise<void>((resolve, reject) => {
          const endpoint = regenerate
            ? `${API_BASE_URL}/youtube/regenerate?youtube_url=${encodeURIComponent(url)}`
            : `${API_BASE_URL}/youtube/process?youtube_url=${encodeURIComponent(url)}`
          let evtSource: EventSource;
          if (apiKey) {
            fetch(endpoint, { headers: { "X-Twelvelabs-Api-Key": apiKey } })
              .then(() => {
                evtSource = new EventSource(endpoint);

                evtSource.onmessage = (event) => {
                  const e = event as MessageEvent
                  if (e.data === "[DONE]") {
                    evtSource.close()
                    setIsLoading(false)
                    setIsStreaming(false)
                    setStreamingProgress("")
                    setTimeout(async () => {
                      try {
                        await fetchSampleGames()
                        const response = await fetch(`${API_BASE_URL}/sample-apps/youtube/${encodeURIComponent(url)}`)
                        if (response.ok) {
                          const data = await response.json()
                          if (data.success && data.data && data.data.html_file_path) {
                            setGameHtml(data.data.html_file_path)
                            setCurrentGameId(data.data.id || null)
                            setExpandedVideo(data.data.id || null)
                            setActiveTab("app")
                            handleRenderGame(data.data)
                          } else {
                            const allResp = await fetch(`${API_BASE_URL}/sample-apps`)
                            if (allResp.ok) {
                              const allData = await allResp.json()
                              const found = (allData.apps || []).find((app: any) => app.youtube_url === url)
                              if (found) {
                                setGameHtml(found.html_file_path)
                                setCurrentGameId(found.id)
                                setExpandedVideo(found.id)
                                setActiveTab("app")
                                handleRenderGame(found)
                              }
                            }
                          }
                        }
                      } catch (err) {
                        console.error("Error refreshing app data:", err)
                      }
                    }, 1000)
                    resolve()
                  }
                }

                evtSource.addEventListener("progress", (event) => {
                  const e = event as MessageEvent
                  progressMsg = e.data
                  setStreamingProgress(progressMsg)
                  setStatusMessage(progressToMessage(progressMsg, regenerate))
                  if (progressMsg.includes("Generating game with SambaNova")) {
                    setIsStreaming(true)
                  }
                })

                evtSource.addEventListener("analysis", (event) => {
                  const e = event as MessageEvent
                  streamedAnalysis = e.data
                  setStreamingProgress("Twelvelabs Analysis...")
                  setGameHtml(streamedAnalysis)
                })

                evtSource.addEventListener("game_chunk", (event) => {
                  const e = event as MessageEvent
                  streamedHtml += e.data
                  setGameHtml(streamedHtml)
                  console.log("Received game chunk, total length:", streamedHtml.length)
                })

                evtSource.addEventListener("done", async () => {
                  evtSource.close()
                  setIsLoading(false)
                  setIsStreaming(false)
                  setStreamingProgress("")
                  
                  setTimeout(async () => {
                    try {
                      await fetchSampleGames()
                      const response = await fetch(`${API_BASE_URL}/sample-apps/youtube/${encodeURIComponent(url)}`)
                      if (response.ok) {
                        const data = await response.json()
                        if (data.success && data.data && data.data.html_file_path) {
                          setGameHtml(data.data.html_file_path)
                          setCurrentGameId(data.data.id || null)
                          setExpandedVideo(data.data.id || null)
                          setActiveTab("app")
                          handleRenderGame(data.data)
                        } else {
                          const allResp = await fetch(`${API_BASE_URL}/sample-apps`)
                          if (allResp.ok) {
                            const allData = await allResp.json()
                            const found = (allData.apps || []).find((app: any) => app.youtube_url === url)
                            if (found) {
                              setGameHtml(found.html_file_path)
                              setCurrentGameId(found.id)
                              setExpandedVideo(found.id)
                              setActiveTab("app")
                              handleRenderGame(found)
                            }
                          }
                        }
                      }
                    } catch (err) {
                      console.error("Error refreshing app data:", err)
                    }
                  }, 1000)
                  
                  resolve()
                })

                evtSource.addEventListener("error", (event) => {
                  const e = event as MessageEvent
                  setError(e.data || "Streaming error")
                  evtSource.close()
                  setIsLoading(false)
                  setIsStreaming(false)
                  setStreamingProgress("")
                  reject(e.data || "Streaming error")
                })
              });
          } else {
            evtSource = new EventSource(endpoint);

            evtSource.onmessage = (event) => {
              const e = event as MessageEvent
              if (e.data === "[DONE]") {
                evtSource.close()
                setIsLoading(false)
                setIsStreaming(false)
                setStreamingProgress("")
                setTimeout(async () => {
                  try {
                    await fetchSampleGames()
                    const response = await fetch(`${API_BASE_URL}/sample-apps/youtube/${encodeURIComponent(url)}`)
                    if (response.ok) {
                      const data = await response.json()
                      if (data.success && data.data && data.data.html_file_path) {
                        setGameHtml(data.data.html_file_path)
                        setCurrentGameId(data.data.id || null)
                        setExpandedVideo(data.data.id || null)
                        setActiveTab("app")
                        handleRenderGame(data.data)
                      } else {
                        const allResp = await fetch(`${API_BASE_URL}/sample-apps`)
                        if (allResp.ok) {
                          const allData = await allResp.json()
                          const found = (allData.apps || []).find((app: any) => app.youtube_url === url)
                          if (found) {
                            setGameHtml(found.html_file_path)
                            setCurrentGameId(found.id)
                            setExpandedVideo(found.id)
                            setActiveTab("app")
                            handleRenderGame(found)
                          }
                        }
                      }
                    }
                  } catch (err) {
                    console.error("Error refreshing app data:", err)
                  }
                }, 1000)
                resolve()
              }
            }

            evtSource.addEventListener("progress", (event) => {
              const e = event as MessageEvent
              progressMsg = e.data
              setStreamingProgress(progressMsg)
              setStatusMessage(progressToMessage(progressMsg, regenerate))
              if (progressMsg.includes("Generating game with SambaNova")) {
                setIsStreaming(true)
              }
            })

            evtSource.addEventListener("analysis", (event) => {
              const e = event as MessageEvent
              streamedAnalysis = e.data
              setStreamingProgress("Twelvelabs Analysis...")
              setGameHtml(streamedAnalysis)
            })

            evtSource.addEventListener("game_chunk", (event) => {
              const e = event as MessageEvent
              streamedHtml += e.data
              setGameHtml(streamedHtml)
              console.log("Received game chunk, total length:", streamedHtml.length)
            })

            evtSource.addEventListener("done", async () => {
              evtSource.close()
              setIsLoading(false)
              setIsStreaming(false)
              setStreamingProgress("")
              
              setTimeout(async () => {
                try {
                  await fetchSampleGames()
                  const response = await fetch(`${API_BASE_URL}/sample-apps/youtube/${encodeURIComponent(url)}`)
                  if (response.ok) {
                    const data = await response.json()
                    if (data.success && data.data && data.data.html_file_path) {
                      setGameHtml(data.data.html_file_path)
                      setCurrentGameId(data.data.id || null)
                      setExpandedVideo(data.data.id || null)
                      setActiveTab("app")
                      handleRenderGame(data.data)
                    } else {
                      const allResp = await fetch(`${API_BASE_URL}/sample-apps`)
                      if (allResp.ok) {
                        const allData = await allResp.json()
                        const found = (allData.apps || []).find((app: any) => app.youtube_url === url)
                        if (found) {
                          setGameHtml(found.html_file_path)
                          setCurrentGameId(found.id)
                          setExpandedVideo(found.id)
                          setActiveTab("app")
                          handleRenderGame(found)
                        }
                      }
                    }
                  }
                } catch (err) {
                  console.error("Error refreshing app data:", err)
                }
              }, 1000)
              
              resolve()
            })

            evtSource.addEventListener("error", (event) => {
              const e = event as MessageEvent
              setError(e.data || "Streaming error")
              evtSource.close()
              setIsLoading(false)
              setIsStreaming(false)
              setStreamingProgress("")
              reject(e.data || "Streaming error")
            })
          }
        })
      } catch (err) {
        setError(`Failed to process video: ${err instanceof Error ? err.message : String(err)}`)
        setIsLoading(false)
        setIsStreaming(false)
        setStreamingProgress("")
      }
    }
  }

  const extractGameType = (htmlFilePath: string): string => {
    const title = htmlFilePath.match(/<title>(.*?)<\/title>/i)?.[1] || ""

    if (title.toLowerCase().includes("quiz")) return "Interactive Quiz"
    if (title.toLowerCase().includes("explorer") || title.toLowerCase().includes("regression")) return "Data Explorer"
    if (title.toLowerCase().includes("weather")) return "API Tutorial"
    if (title.toLowerCase().includes("game")) return "Learning Game"
    if (title.toLowerCase().includes("tutorial")) return "Interactive Tutorial"

    return "Interactive App"
  }

  const fetchHtmlFromFile = async (htmlFilePath: string): Promise<string> => {
    if (!htmlFilePath) return ""
    try {
      const filename = htmlFilePath.split('/').pop()
      const response = await fetch(`${API_BASE_URL}/games/open/${filename}`)
      if (response.ok) {
        const data = await response.json()
        return data.content || ""
      }
    } catch (err) {
      console.error("Failed to fetch HTML file:", err)
    }
    return ""
  }

  useEffect(() => {
    if (activeTab === "app" && gameHtml && iframeRef.current) {
      const iframe = iframeRef.current
      if (!iframe) return
      
      console.log("Setting iframe content:", gameHtml.substring(0, 100) + "...")
      
      // Force clear iframe first for clean refresh
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      if (iframeDoc) {
        iframeDoc.open()
        iframeDoc.write('')
        iframeDoc.close()
      }
      
      // Small delay to ensure clean refresh
      setTimeout(() => {
        // Check if gameHtml is a file path (starts with /) or actual HTML content
        if (gameHtml.startsWith('/') || gameHtml.includes('.html')) {
          // It's a file path - fetch the content
          fetchHtmlFromFile(gameHtml).then((html) => {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
            if (iframeDoc) {
              iframeDoc.open()
              iframeDoc.write(html)
              iframeDoc.close()
              console.log("Iframe content set from file path")
            }
          })
        } else {
          // It's actual HTML content - use it directly
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
          if (iframeDoc) {
            iframeDoc.open()
            iframeDoc.write(gameHtml)
            iframeDoc.close()
            console.log("Iframe content set from direct HTML")
          }
        }
      }, 100) // Small delay for clean refresh
    }
  }, [gameHtml, activeTab, iframeKey])

  const handleVideoClick = async (videoId: number) => {
    const video = sampleVideos.find((v) => v.id === videoId)
    if (video) {
      // Allow direct access to all sample apps without warning
      setYoutubeUrl(video.videoUrl)
      setExpandedVideo(videoId)
      setCurrentGameId(videoId)
      
      // Force iframe refresh by clearing first, then setting content
      setGameHtml(null) // Clear first
      setIframeKey(prev => prev + 1) // Force refresh
      
      // Small delay to ensure clean refresh
      setTimeout(async () => {
        if (video.htmlFilePath) {
          setGameHtml(video.htmlFilePath)
        } else {
          try {
            const response = await fetch(`${API_BASE_URL}/sample-apps/youtube/${encodeURIComponent(video.videoUrl)}`)
            if (response.ok) {
              const data = await response.json()
              if (data.success && data.data && data.data.html_file_path) {
                setGameHtml(data.data.html_file_path)
                
                setSampleVideos((prev) =>
                  prev.map((v) =>
                    v.id === videoId
                      ? {
                          ...v,
                          htmlFilePath: data.data.html_file_path,
                          type: extractGameType(data.data.html_file_path),
                          isGenerated: true,
                        }
                      : v
                  )
                )
                return
              }
            }
          } catch (err) {
            console.error("Error fetching from cache:", err)
          }
          
          setShowGeneratePopup(true)
        }
      }, 150) // Small delay for clean refresh
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

  const closeExpandedVideo = () => {
    setExpandedVideo(null)
    setShowGeneratePopup(false)
  }

  const selectedVideoData = expandedVideo ? sampleVideos.find((v) => v.id === expandedVideo) : null

  const handleApiConnect = async (newApiKey: string) => {
    setApiKey(newApiKey)
    setIsApiConnected(true)
    setShowApiModal(false)
    localStorage.setItem("twelvelabs_api_key", newApiKey)
    setActiveSource("twelvelabs")
  }

  const handleApiDisconnect = () => {
    setApiKey("")
    setIsApiConnected(false)
    setIndexes([])
    setVideos([])
    setSelectedTwelveLabsIndex("")
    setSelectedTwelveLabsVideo("")
    localStorage.removeItem("twelvelabs_api_key")
    setActiveSource("youtube")
  }

  const handleVideoSelect = async (videoId: string, videoName: string) => {
    setSelectedTwelveLabsVideo(videoId)
    setSelectedTwelveLabsVideoName(videoName)

    // Force iframe refresh when selecting video
    setGameHtml(null) // Clear first
    setIframeKey(prev => prev + 1) // Force refresh

    setTimeout(async () => {
      try {
        // Fetch game data from /game/<video_id>
        const response = await fetch(`${API_BASE_URL}/game/${videoId}`)
        if (response.ok) {
          const data = await response.json()
          if (data && data.html_file_path) {
            setGameHtml(data.html_file_path)
            setCurrentGameId(null) // No numeric ID for Twelvelabs games
            setExpandedVideo(null)
          } else {
            setGameHtml(null)
            setCurrentGameId(null)
            setExpandedVideo(null)
          }
        } else {
          setGameHtml(null)
          setCurrentGameId(null)
          setExpandedVideo(null)
        }
      } catch (err) {
        setGameHtml(null)
        setCurrentGameId(null)
        setExpandedVideo(null)
      }
    }, 150) // Small delay for clean refresh
  }

  const processTwelveLabsRegenerate = async () => {
    if (!selectedTwelveLabsVideo) {
      setError("Please select a video from TwelveLabs")
      return
    }
    if (!apiKey) {
      setError("TwelveLabs API key is required. Please connect your API key.")
      return
    }
    setIsLoading(true)
    setError(null)
    setGameHtml(null)
    setIsStreaming(false)
    setStreamingProgress("")
    let streamedHtml = ""
    let progressMsg = ""
    try {
      await new Promise<void>((resolve, reject) => {
        // Double-encode apiKey for safety
        const safeApiKey = encodeURIComponent(encodeURIComponent(apiKey))
        const endpoint = `${API_BASE_URL}/twelvelabs/regenerate?video_id=${encodeURIComponent(selectedTwelveLabsVideo)}&api_key=${safeApiKey}`
        const evtSource = new EventSource(endpoint, { withCredentials: false })

        evtSource.onmessage = (event) => {
          const e = event as MessageEvent
          if (e.data === "[DONE]") {
            evtSource.close()
            setIsLoading(false)
            setIsStreaming(false)
            setStreamingProgress("")
            setTimeout(() => {
              resolve()
            }, 500)
          }
        }

        evtSource.addEventListener("progress", (event) => {
          const e = event as MessageEvent
          progressMsg = e.data
          setStreamingProgress(progressMsg)
          setStatusMessage(progressToMessage(progressMsg, true))
          if (progressMsg.includes("Generating game with SambaNova")) {
            setIsStreaming(true)
          }
        })

        evtSource.addEventListener("game_chunk", (event) => {
          const e = event as MessageEvent
          streamedHtml += e.data
          setGameHtml(streamedHtml)
          console.log("Received game chunk, total length:", streamedHtml.length)
        })

        evtSource.addEventListener("done", async () => {
          evtSource.close()
          setIsLoading(false)
          setIsStreaming(false)
          setStreamingProgress("")
          
          // Auto-refresh and select the processed video for TwelveLabs
          setTimeout(async () => {
            try {
              // First refresh the sample games list
              await fetchSampleGames()
              
              // Fetch the latest sample app for this TwelveLabs video_id
              const response = await fetch(`${API_BASE_URL}/sample-apps/twelvelabs/${encodeURIComponent(selectedTwelveLabsVideo)}`)
              if (response.ok) {
                const data = await response.json()
                if (data.success && data.data && data.data.html_file_path) {
                  setGameHtml(data.data.html_file_path)
                  setCurrentGameId(data.data.id || null)
                  setExpandedVideo(data.data.id || null)
                  setActiveTab("app") // Ensure we're on the app tab to see the rendered result
                  
                  // Save the game to user games for persistence
                  handleRenderGame(data.data)
                } else {
                  // fallback: fetch all sample apps and try to find the right one
                  const allResp = await fetch(`${API_BASE_URL}/sample-apps`)
                  if (allResp.ok) {
                    const allData = await allResp.json()
                    const found = (allData.apps || []).find((app: any) => app.video_id === selectedTwelveLabsVideo || (app.twelvelabs_video_ids && app.twelvelabs_video_ids.includes(selectedTwelveLabsVideo)))
                    if (found) {
                      setGameHtml(found.html_file_path)
                      setCurrentGameId(found.id)
                      setExpandedVideo(found.id)
                      setActiveTab("app") // Ensure we're on the app tab
                      
                      // Save the game to user games for persistence
                      handleRenderGame(found)
                    }
                  }
                }
              }
            } catch (err) {
              console.error("Error refreshing TwelveLabs app data:", err)
            }
          }, 1000)
          
          resolve()
        })

        evtSource.addEventListener("error", (event) => {
          const e = event as MessageEvent
          setError(e.data || "Streaming error")
          evtSource.close()
          setIsLoading(false)
          setIsStreaming(false)
          setStreamingProgress("")
          reject(e.data || "Streaming error")
        })
      })
    } catch (err) {
      setError(`Failed to process video: ${err instanceof Error ? err.message : String(err)}`)
      setIsLoading(false)
      setIsStreaming(false)
      setStreamingProgress("")
      console.error("Error processing TwelveLabs video:", err)
    }
  }

  useEffect(() => {
    if (isStreaming && streamingCodeRef.current) {
      streamingCodeRef.current.scrollTop = streamingCodeRef.current.scrollHeight;
    }
  }, [gameHtml, isStreaming]);

  const [htmlCode, setHtmlCode] = useState<string>("")
  useEffect(() => {
    if (activeTab === "code" && gameHtml) {
      fetchHtmlFromFile(gameHtml).then(setHtmlCode)
    }
  }, [gameHtml, activeTab])

  // Clear portal when switching between toggle sources
  useEffect(() => {
    // Clear the game display when switching toggles
    setGameHtml(null)
    setCurrentGameId(null)
    setExpandedVideo(null)
    setError(null)
    setShowGeneratePopup(false)
    setActiveTab("app") // Reset to app tab for clean UX
    
    // Add smooth delay for better user experience
    setTimeout(() => {
      // Clear source-specific states
      if (activeSource === 'youtube') {
        // Clear TwelveLabs selections when switching to YouTube
        setSelectedTwelveLabsVideo("")
        setSelectedTwelveLabsVideoName("")
        setSelectedTwelveLabsIndex("")
      } else {
        // Clear YouTube URL when switching to TwelveLabs
        setYoutubeUrl("")
      }
    }, 100) // Small delay for smoother transition
  }, [activeSource])

  useEffect(() => {
    if (isLoading) return;
    if (activeSource === 'youtube' && youtubeUrl) {
      const found = sampleVideos.find(app => app.videoUrl === youtubeUrl);
      if (found) {
        setGameHtml(found.htmlFilePath);
        setCurrentGameId(found.id);
        setExpandedVideo(found.id);
      }
    }
  }, [sampleVideos, youtubeUrl, activeSource, isLoading]);

  // Utility to load games from sessionStorage
  const loadUserGames = () => {
    try {
      const games = JSON.parse(sessionStorage.getItem('userGames') || '[]');
      return Array.isArray(games) ? games : [];
    } catch {
      return [];
    }
  };

  // Utility to save games to sessionStorage (max 5)
  const saveUserGame = (game: any) => {
    let games = loadUserGames();
    // Remove any existing game with the same videoUrl
    games = games.filter((g: any) => g.videoUrl !== game.videoUrl);
    games.unshift(game); // Add new game to the front
    if (games.length > 5) games = games.slice(0, 5);
    sessionStorage.setItem('userGames', JSON.stringify(games));
  };

  // When a game is rendered (auto-refresh or manual), save it to sessionStorage
  const handleRenderGame = (game: any) => {
    if (!game || !game.html_file_path) return;
    saveUserGame({
      id: Date.now(),
      title: game.video_title || `Video ${game.video_id?.substring(0, 8) || ''}`,
      duration: game.duration || '',
      type: 'Interactive App',
      thumbnail: game.youtube_url ? `https://img.youtube.com/vi/${extractVideoId(game.youtube_url)}/maxresdefault.jpg` : '/placeholder.svg',
      videoUrl: game.youtube_url || '',
      htmlFilePath: game.html_file_path,
      isGenerated: true,
      channelName: game.channel_name || '',
      viewCount: game.view_count || '',
      createdAt: game.created_at || new Date().toISOString(),
      videoId: game.video_id || '',
    });
  };

  // On mount, load user games from sessionStorage
  useEffect(() => {
    const userGames = loadUserGames();
    if (userGames.length > 0) {
      setSampleVideos((prev) => {
        // Only add games not already in prev
        const prevUrls = new Set(prev.map((v) => v.videoUrl));
        return [...userGames.filter((g: any) => !prevUrls.has(g.videoUrl)), ...prev];
      });
    }
  }, []);



  return (
    <div className="min-h-screen bg-[#f4f3f3] relative overflow-hidden">

      <div className="relative bg-white/30 z-20 pt-3 px-6">
        <div className="bg-white/80 backdrop-blur-md rounded-xl px-4 py-2.5 max-w-5xl mx-auto shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="logo-container">
                <svg
                  id="Layer_1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 204 146.6"
                  width="24px"
                  height="24px"
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

              <h1 className="text-base font-bold text-[#1d1c1b]">Video2Game</h1>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="https://github.com/Hrishikesh332/Video2Game"
                className="text-[#1d1c1b] hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-white/50"
                target="_blank"
                rel="noopener noreferrer"
                title="GitHub"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>

              {/* Blog icon improved, pen nib SVG */}

<a
  href="#"
  className="text-[#1d1c1b] hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-white/50"
  onClick={e => e.preventDefault()}
  title="Blog"
>
  <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 32.00 32.00" fill="#808184" stroke="#000000" strokeWidth="1.504" width="20" height="20">
    <g>
      <path fill="#808184" d="M30.5,0h-29C0.673,0,0,0.673,0,1.5v8C0,10.327,0.673,11,1.5,11h29c0.827,0,1.5-0.673,1.5-1.5v-8 C32,0.673,31.327,0,30.5,0z M31,9.5c0,0.275-0.225,0.5-0.5,0.5h-29C1.225,10,1,9.775,1,9.5v-8C1,1.225,1.225,1,1.5,1h29 C30.775,1,31,1.225,31,1.5V9.5z"></path>
      <path fill="#808184" d="M31.5,12.5c-0.276,0-0.5,0.224-0.5,0.5v17.5c0,0.275-0.225,0.5-0.5,0.5h-29C1.225,31,1,30.775,1,30.5V13 c0-0.276-0.224-0.5-0.5-0.5S0,12.724,0,13v17.5C0,31.327,0.673,32,1.5,32h29c0.827,0,1.5-0.673,1.5-1.5V13 C32,12.724,31.776,12.5,31.5,12.5z"></path>
      <path fill="#808184" d="M13.5,27c0.827,0,1.5-0.673,1.5-1.5v-8c0-0.827-0.673-1.5-1.5-1.5h-8C4.673,16,4,16.673,4,17.5v8 C4,26.327,4.673,27,5.5,27H13.5z M5,25.5v-8C5,17.225,5.225,17,5.5,17h8c0.275,0,0.5,0.225,0.5,0.5v8c0,0.275-0.225,0.5-0.5,0.5h-8 C5.225,26,5,25.775,5,25.5z"></path>
      <path fill="#808184" d="M18,18h9c0.276,0,0.5-0.224,0.5-0.5S27.276,17,27,17h-9c-0.276,0-0.5,0.224-0.5,0.5S17.724,18,18,18z"></path>
      <path fill="#808184" d="M18,22h9c0.276,0,0.5-0.224,0.5-0.5S27.276,21,27,21h-9c-0.276,0-0.5,0.224-0.5,0.5S17.724,22,18,22z"></path>
      <path fill="#808184" d="M18,26h9c0.276,0,0.5-0.224,0.5-0.5S27.276,25,27,25h-9c-0.276,0-0.5,0.224-0.5,0.5S17.724,26,18,26z"></path>
    </g>
  </svg>
</a>

              <a
                href="#"
                className="text-[#1d1c1b] hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-white/50"
                onClick={e => {
                  e.preventDefault();
                  const el = document.querySelector('.sample-apps-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                title="Apps"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-green-300/30 to-green-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-32 left-32 w-80 h-80 bg-gradient-to-tr from-orange-300/25 to-pink-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-gradient-to-r from-green-200/20 to-yellow-200/15 rounded-full blur-2xl"></div>

        <div className="absolute top-10 left-1/4 w-72 h-72 bg-gradient-to-bl from-blue-200/15 to-purple-200/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-1/4 w-60 h-60 bg-gradient-to-tl from-yellow-300/20 to-orange-200/15 rounded-full blur-2xl"></div>
        <div className="absolute top-2/3 left-10 w-56 h-56 bg-gradient-to-r from-pink-200/15 to-red-200/10 rounded-full blur-2xl"></div>

        <div className="absolute top-1/4 right-10 w-40 h-40 bg-gradient-to-br from-cyan-200/20 to-blue-300/15 rounded-full blur-xl"></div>
        <div className="absolute bottom-1/3 left-1/2 w-48 h-48 bg-gradient-to-tr from-lime-200/15 to-green-300/10 rounded-full blur-xl"></div>
        <div className="absolute top-3/4 right-2/3 w-36 h-36 bg-gradient-to-bl from-violet-200/15 to-purple-300/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-1/3 w-44 h-44 bg-gradient-to-tl from-amber-200/20 to-yellow-300/15 rounded-full blur-xl"></div>

        <div className="absolute top-1/3 left-1/3 w-24 h-24 bg-gradient-to-r from-emerald-200/25 to-teal-200/15 rounded-full blur-lg"></div>
        <div className="absolute bottom-1/4 left-3/4 w-28 h-28 bg-gradient-to-br from-rose-200/20 to-pink-200/10 rounded-full blur-lg"></div>
        <div className="absolute top-1/2 left-1/6 w-32 h-32 bg-gradient-to-tr from-indigo-200/15 to-blue-200/10 rounded-full blur-lg"></div>
        <div className="absolute bottom-2/3 right-1/6 w-20 h-20 bg-gradient-to-bl from-orange-200/25 to-amber-200/15 rounded-full blur-lg"></div>

        <div className="absolute top-0 left-1/2 w-80 h-80 bg-gradient-to-b from-green-100/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/2 w-72 h-72 bg-gradient-to-t from-orange-100/10 to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* API Connection Modal */}
      {showApiModal && (
        <ApiConnectionModal
          isOpen={showApiModal}
          onClose={() => setShowApiModal(false)}
          isConnected={isApiConnected}
          onConnect={handleApiConnect}
          onDisconnect={handleApiDisconnect}
          currentApiKey={apiKey}
          indexes={indexes}
          selectedIndex={selectedTwelveLabsIndex}
          onIndexChange={setSelectedTwelveLabsIndex}
          videos={videos}
          selectedVideo={selectedTwelveLabsVideo}
          onVideoChange={setSelectedTwelveLabsVideo}
          isLoadingIndexes={isLoadingIndexes}
          isLoadingVideos={isLoadingVideos}
        />
      )}

      {/* YouTube Warning Popup */}
      {showYouTubeWarning && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-300 border border-gray-200">
            <div className="flex items-start gap-6">
              <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-white"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-black mb-3">YouTube Feature Notice</h3>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  The YouTube processing feature may have limitations and might not work reliably. 
                  We recommend using the <strong className="text-black">TwelveLabs</strong> toggle for better video interaction and more reliable game generation.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowYouTubeWarning(false)
                      if (!isApiConnected) {
                        setShowApiModal(true)
                      } else {
                        setActiveSource("twelvelabs")
                      }
                    }}
                    className="flex-1 px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Switch to TwelveLabs
                  </button>
                  <button
                    onClick={handleContinueWithYouTube}
                    className="px-6 py-3 bg-white hover:bg-gray-50 text-black border-2 border-black rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Continue with YouTube
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

      <div ref={containerRef} className="relative z-10 flex h-[calc(100vh-80px)]">

        <div className="bg-white/30 backdrop-blur-sm relative flex flex-col" style={{ width: `${leftWidth}%` }}>
          <div
            className={`h-full flex flex-col p-8 overflow-y-auto transition-all duration-300 ${selectedVideoData && activeSource === 'youtube' ? "blur-sm" : ""}`}
          >
            <div className="text-center mb-8">
              <h1 className="text-5xl font-bold text-[#1d1c1b] mb-4">Video2Game</h1>
              <p className="text-lg text-gray-600 max-w-md mx-auto mb-6">
                Transform video content into interactive educational experiences
              </p>

              <SourceToggle
                activeSource={activeSource}
                onSourceChange={(source) => {
                  if (source === "twelvelabs" && !isApiConnected) {
                    setShowApiModal(true)
                  } else {
                    setActiveSource(source)
                  }
                }}
                isApiConnected={isApiConnected}
                onApiConnect={() => setShowApiModal(true)}
                onApiDisconnect={handleApiDisconnect}
              />
            </div>


            <div className="w-full max-w-md mx-auto space-y-4 mb-8">
              {activeSource === "youtube" ? (
                <>
                  <input
                    type="text"
                    placeholder="Paste YouTube URL here..."
                    className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-[#d3d1cf]/50 rounded-lg text-[#1d1c1b] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d1c1b]/20 transition-all duration-200"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                  />
                  <button
                    className={`w-full px-6 py-3 bg-[#1d1c1b] hover:bg-[#1d1c1b]/90 text-white rounded-lg font-medium transition-all duration-200 ${
                      isLoading ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                    onClick={() => processYoutubeUrl(false)}
                    disabled={isLoading || !youtubeUrl.trim()}
                  >
                    {isLoading ? "Generating..." : "Generate from YouTube"}
                  </button>
                </>
              ) : (
                <>
                  <TwelveLabsSelector
                    isVisible={activeSource === "twelvelabs"}
                    apiKey={apiKey}
                    onVideoSelect={handleVideoSelect}
                    selectedVideoId={selectedTwelveLabsVideo}
                  />
                  {selectedTwelveLabsVideo && (
                    <button
                      className={`w-full px-6 py-3 bg-[#1d1c1b] hover:bg-[#1d1c1b]/90 text-white rounded-lg font-medium transition-all duration-200 ${
                        isLoading ? "opacity-70 cursor-not-allowed" : ""
                      }`}
                      onClick={processTwelveLabsRegenerate}
                      disabled={isLoading || !selectedTwelveLabsVideo}
                    >
                      {isLoading ? "Generating..." : "Generate from TwelveLabs"}
                    </button>
                  )}
                </>
              )}

              {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
            </div>

            {/* Sample Videos */}
            <div className="w-full mx-auto max-w-md sample-apps-section">
              <h3 className="text-lg font-semibold text-[#1d1c1b] mb-4">Sample Interactive Apps</h3>
              <div className="space-y-4">
                {sampleVideos.filter(video => video.videoUrl && video.videoUrl !== '').map((video) => (
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
                          src={video.thumbnail && video.thumbnail !== '' ? video.thumbnail : "/placeholder.svg"}
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
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="font-semibold text-[#1d1c1b] text-base leading-tight line-clamp-2 group-hover:text-[#0f0e0e] transition-colors">
                            {video.title}
                          </div>
                          <div className="text-sm text-gray-600 font-medium">{video.channelName}</div>
                          <div className="text-xs text-gray-500">
                            {video.viewCount && <span>{video.viewCount}</span>}
                            {video.createdAt && (
                              <span>
                                {video.viewCount ? " | " : ""}Created: {video.createdAt}
                              </span>
                            )}
                            {video.videoId && (
                              <span>
                                {video.viewCount || video.createdAt ? " | " : ""}ID: {video.videoId}
                              </span>
                            )}
                          </div>
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
          {selectedVideoData && activeSource === 'youtube' && selectedVideoData.videoUrl ? (
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
                        <img 
                          src="/TwelveLabs.gif" 
                          alt="Loading..." 
                          className="w-8 h-8 mx-auto mb-2 object-contain"
                          style={{ imageRendering: 'auto' }}
                        />
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
          ) : null}
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
              <div className="h-full flex flex-col items-center justify-center p-4 w-full">
                <img 
                  src="/TwelveLabs.gif" 
                  alt="Loading..." 
                  className="w-20 h-20 mb-4 object-contain"
                  style={{ imageRendering: 'auto' }}
                />
                <div className="text-[#1d1c1b] text-base mb-2 text-center min-h-[1.5em] font-medium">{statusMessage}</div>
                <div className="text-xs text-gray-500 mb-4">Note - It takes only 1 min to process.</div>
                {isStreaming && (
                  <div
                    ref={streamingCodeRef}
                    className="w-full max-w-2xl flex-1 bg-gradient-to-br from-[#18181b] to-[#232323] text-white rounded-2xl shadow-2xl p-8 overflow-y-auto text-base border-2 border-blue-900/40 animate-in fade-in-0 duration-500 relative"
                    style={{ fontFamily: 'Fira Mono, Menlo, monospace', minHeight: 320, maxHeight: 480 }}
                  >
                    <pre className="whitespace-pre-wrap break-words" style={{ margin: 0 }}>
                      <code>{gameHtml || ""}{isStreaming && <span className="animate-pulse text-blue-400">|</span>}</code>
                    </pre>
                  </div>
                )}
              </div>
            ) : gameHtml ? (
              <div className="h-full flex flex-col min-h-0">
                <div className="flex items-center justify-between p-4 pb-0 flex-shrink-0">
                  <h2 className="text-xl font-bold text-[#1d1c1b]">
                    {activeSource === 'youtube' ? 'Interactive Learning Game' : 'TwelveLabs Generated Game'}
                  </h2>
                  <div className="flex items-center gap-2">
                    {activeSource === 'youtube' && (
                      <button
                        onClick={() => {
                          if (expandedVideo) {
                            const video = sampleVideos.find((v) => v.id === expandedVideo);
                            if (video && video.videoUrl) {
                              // Only show warning for YouTube videos that are being regenerated
                              if (video.videoUrl.includes('youtube.com') && !video.isGenerated) {
                                setPendingYouTubeUrl(video.videoUrl)
                                setPendingRegenerate(true)
                                setShowYouTubeWarning(true)
                                return
                              }
                              setYoutubeUrl(video.videoUrl);
                              setTimeout(() => processYoutubeUrl(true), 0); // Ensure state is updated before calling
                              return;
                            }
                          }
                          processYoutubeUrl(true);
                        }}
                        disabled={isLoading}
                        className="flex items-center gap-1 text-xs bg-white/60 hover:bg-white/80 px-3 py-1.5 rounded-full transition-all duration-200 border border-[#ececec]/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Regenerate with new content"
                      >
                        {isLoading ? (
                          <img 
                            src="/TwelveLabs.gif" 
                            alt="Loading..." 
                            className="w-3 h-3 object-contain"
                            style={{ imageRendering: 'auto' }}
                          />
                        ) : (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                            <path d="M21 3v5h-5" />
                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                            <path d="M3 21v-5h5" />
                          </svg>
                        )}
                        {isLoading ? "Regenerating..." : "Regenerate"}
                      </button>
                    )}
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
                        key={iframeKey}
                        ref={iframeRef}
                        className="w-full h-full"
                        title="Interactive Game"
                        sandbox="allow-scripts allow-same-origin"
                      />
                    </div>
                  ) : (
                    <div className="h-full bg-white rounded-lg overflow-hidden border border-[#ececec] shadow-sm">
                      <CodeViewer code={htmlCode} />
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

