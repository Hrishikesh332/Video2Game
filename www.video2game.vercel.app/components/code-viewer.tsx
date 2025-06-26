"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"

interface CodeViewerProps {
  code: string
}

export default function CodeViewer({ code }: CodeViewerProps) {
  const [formattedCode, setFormattedCode] = useState("")
  const [copied, setCopied] = useState(false)
  const [lineNumbers, setLineNumbers] = useState<number[]>([])
  const codeContainerRef = useRef<HTMLDivElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const formatHtml = (html: string) => {
      let formatted = html
      let indent = 0
      const tab = "  "

      formatted = formatted.replace(/></g, ">\n<")
      formatted = formatted.replace(/({|})/g, "$1\n")
      formatted = formatted.replace(/;/g, ";\n")

      const lines = formatted.split("\n")
      const formattedLines = lines
        .map((line) => {
          const trimmed = line.trim()
          if (!trimmed) return ""

          if (trimmed.startsWith("</") || trimmed.startsWith("}")) {
            indent = Math.max(0, indent - 1)
          }

          const indentedLine = tab.repeat(indent) + trimmed

          if (
            (trimmed.startsWith("<") &&
              !trimmed.startsWith("</") &&
              !trimmed.endsWith("/>") &&
              !trimmed.includes("<!")) ||
            trimmed.endsWith("{")
          ) {
            const tagName = trimmed.match(/<(\w+)/)?.[1]
            if (
              !tagName ||
              ![
                "img",
                "br",
                "hr",
                "input",
                "meta",
                "link",
                "area",
                "base",
                "col",
                "embed",
                "source",
                "track",
                "wbr",
              ].includes(tagName.toLowerCase())
            ) {
              indent++
            }
          }

          return indentedLine
        })
        .filter((line) => line.length > 0)

      return formattedLines.join("\n")
    }

    const formatted = formatHtml(code)
    setFormattedCode(formatted)
    const lines = formatted.split("\n")
    setLineNumbers(Array.from({ length: lines.length }, (_, i) => i + 1))
  }, [code])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy code:", err)
    }
  }

  const highlightSyntax = (code: string) => {
    return (
      code
        .replace(
          /(&lt;\/?)([a-zA-Z][a-zA-Z0-9]*)(.*?)(&gt;)/g,
          '<span class="text-blue-600 font-medium">$1$2</span><span class="text-green-600">$3</span><span class="text-blue-600 font-medium">$4</span>',
        )
        .replace(
          /(\s)([a-zA-Z-]+)(=)(&quot;[^&]*&quot;|&#039;[^&#]*&#039;)/g,
          '$1<span class="text-purple-600">$2</span><span class="text-gray-500">$3</span><span class="text-orange-600">$4</span>',
        )
        .replace(
          /([a-zA-Z-]+)(\s*:\s*)([^;]+)(;)/g,
          '<span class="text-indigo-600">$1</span><span class="text-gray-500">$2</span><span class="text-green-700">$3</span><span class="text-gray-500">$4</span>',
        )
        .replace(
          /\b(function|var|let|const|if|else|for|while|return|class|extends|import|export|from|default|true|false|null|undefined|new|this|typeof|instanceof)\b/g,
          '<span class="text-pink-600 font-semibold">$1</span>',
        )
        .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-gray-400 italic">$1</span>')
        .replace(/(\/\/.*$)/gm, '<span class="text-gray-400 italic">$1</span>')
        .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="text-gray-400 italic">$1</span>')
        .replace(/(&quot;[^&]*&quot;)/g, '<span class="text-orange-600">$1</span>')
        .replace(/(&#039;[^&#]*&#039;)/g, '<span class="text-orange-600">$1</span>')
        .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-red-600">$1</span>')
        .replace(/([.#][a-zA-Z][a-zA-Z0-9-_]*)/g, '<span class="text-yellow-600 font-medium">$1</span>')
    )
  }

  const escapeHtml = (html: string) => {
    return html
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
  }

  const processedCode = highlightSyntax(escapeHtml(formattedCode))
  const codeLines = processedCode.split("\n")

  return (
    <>
      <style jsx global>{`
        .code-viewer-vertical-scroll::-webkit-scrollbar {
          width: 16px;
        }
        .code-viewer-vertical-scroll::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 8px;
          margin: 4px;
        }
        .code-viewer-vertical-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 8px;
          border: 2px solid #f1f5f9;
        }
        .code-viewer-vertical-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .code-viewer-vertical-scroll::-webkit-scrollbar-thumb:active {
          background: #64748b;
        }
        .line-numbers-hidden::-webkit-scrollbar {
          display: none;
        }
        .line-numbers-hidden {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      `}</style>

      <div className="h-full flex flex-col bg-white">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <span className="text-sm font-medium text-gray-300">Generated Game Code</span>
          </div>

          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-md transition-colors"
          >
            {copied ? (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-green-400"
                >
                  <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy Code
              </>
            )}
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="bg-gray-50 border-r border-gray-200 flex-shrink-0 w-16 overflow-hidden">
            <div
              ref={lineNumbersRef}
              className="h-full overflow-y-auto overflow-x-hidden px-3 py-4 line-numbers-hidden"
            >
              <pre className="text-sm leading-6 font-mono text-gray-500 text-right select-none">
                {lineNumbers.map((num) => (
                  <div key={num} className="h-6 flex items-center justify-end">
                    {num}
                  </div>
                ))}
              </pre>
            </div>
          </div>

          <div className="flex-1 min-w-0 overflow-hidden">
            <div
              ref={codeContainerRef}
              className="h-full overflow-y-auto overflow-x-hidden px-4 py-4 bg-white code-viewer-vertical-scroll"
              onScroll={handleScroll}
            >
              <pre className="text-sm leading-6 font-mono">
                <code>
                  {codeLines.map((line, index) => (
                    <div key={index} className="min-h-[24px] hover:bg-gray-50 px-1 -mx-1 rounded flex items-start">
                      <span
                        className="break-all whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: line || "&nbsp;" }}
                      />
                    </div>
                  ))}
                </code>
              </pre>
              <div className="h-12"></div>
            </div>
          </div>
        </div>

        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14,2 14,8 20,8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10,9 9,9 8,9"></polyline>
                </svg>
                {lineNumbers.length} lines
              </span>
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7V4a2 2 0 0 1 2-2h8.5L20 7.5V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3"></path>
                  <path d="M14 2v6h6"></path>
                  <path d="M10 20v-1a2 2 0 1 1 4 0v1a2 2 0 1 1-4 0Z"></path>
                </svg>
                {code.length.toLocaleString()} chars
              </span>
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7,10 12,15 17,10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                {(code.length / 1024).toFixed(1)} KB
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium">HTML/CSS/JS</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
