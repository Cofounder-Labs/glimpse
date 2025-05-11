"use client"

import Image from "next/image"
import {
  ChevronRight,
  FileText,
  Users,
  Settings,
  ShoppingCart,
  PlusCircle,
  Menu,
  MoreHorizontal,
  Upload,
  ChevronDown,
  Code,
  Monitor,
  Figma,
  Copy,
  Share2,
  ArrowLeft,
} from "lucide-react"
import { useState, useEffect } from "react"

// LoadingIndicator component
const LoadingIndicator = ({ loadingText, loadingDots }: { loadingText: string; loadingDots: string }) => (
  <div className="mb-8">
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center">
        <div className="animate-pulse">
          <svg
            className="w-5 h-5 text-gray-500"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 4V4.01M12 8V16M12 20V20.01M4 12H4.01M8 12H16M20 12H20.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      <div>
        <div className="flex items-center">
          <p className="text-gray-500">{loadingText}</p>
          <span className="text-gray-500 w-6 inline-block">{loadingDots}</span>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
          <div className="bg-gray-500 h-1.5 rounded-full animate-progress"></div>
        </div>
      </div>
    </div>
  </div>
)

// PreviousDemoCard component
const PreviousDemoCard = ({
  title,
  description,
  image,
}: {
  title: string;
  description: string;
  image: string;
}) => (
  <div className="border rounded-lg overflow-hidden bg-gray-50">
    <div className="h-48 bg-gray-100 flex items-center justify-center">
      <Image
        src={image || "/placeholder.svg"}
        alt={title}
        width={300}
        height={200}
        className="object-cover w-full h-full"
      />
    </div>
    <div className="p-4">
      <h3 className="font-medium text-lg">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
      <div className="mt-3 flex justify-between items-center">
        <span className="text-xs text-gray-400">2 days ago</span>
        <button className="text-xs text-gray-600 hover:text-gray-900 border px-2 py-1 rounded">
          View
        </button>
      </div>
    </div>
  </div>
)

// ActionButton component
const ActionButton = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <button className="flex items-center gap-2 px-4 py-2 rounded-full border hover:bg-gray-50">
    {icon}
    <span>{label}</span>
  </button>
)

// Slide component
const Slide = ({ slide, index, isActive, onClick }: { 
  slide: { id: number; title: string; content: string }; 
  index: number; 
  isActive: boolean; 
  onClick: () => void 
}) => (
  <div
    className={`mb-2 p-1 rounded cursor-pointer border ${
      isActive ? "border-black" : "border-gray-200"
    }`}
    onClick={onClick}
  >
    <div className="aspect-video bg-white rounded flex items-center justify-center relative">
      <span className="absolute bottom-1 left-1 text-xs bg-white rounded-full w-5 h-5 flex items-center justify-center">
        {index + 1}
      </span>
      <div className="text-xs text-gray-400">{slide.content}</div>
    </div>
  </div>
)

// PublishedView component
const PublishedView = ({ 
  submittedText, 
  publishedUrl, 
  handleStartNewTask 
}: { 
  submittedText: string; 
  publishedUrl: string; 
  handleStartNewTask: () => void 
}) => (
  <div className="min-h-screen bg-white p-8">
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <button onClick={handleStartNewTask} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5" />
          <span>Back to home</span>
        </button>
      </div>

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Your Glimpse has been published!</h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Your demo is now available. Share the link below with your audience.
        </p>
      </div>

      <div className="bg-gray-50 border rounded-lg p-8 mb-8">
        <div className="aspect-video bg-white rounded-lg border shadow-lg overflow-hidden mb-8">
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-purple-600 to-purple-200 p-8">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl aspect-video flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">{submittedText || "Your Presentation"}</h2>
                <p className="text-gray-500">10 slides • Created with Glimpse</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <p className="text-gray-500 mb-3">Share this link with your audience:</p>
          <div className="flex items-center gap-2 w-full max-w-xl">
            <div className="flex-1 bg-white border rounded-l-lg p-3 text-gray-700 overflow-hidden overflow-ellipsis">
              {publishedUrl}
            </div>
            <button className="bg-gray-100 border border-l-0 rounded-r-lg p-3 text-gray-700 hover:bg-gray-200">
              <Copy className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <button className="px-6 py-3 border rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2">
          <Share2 className="w-5 h-5" />
          <span>Share</span>
        </button>
        <button
          onClick={handleStartNewTask}
          className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Create new</span>
        </button>
      </div>
    </div>
  </div>
)

// EditorNavBar component
const EditorNavBar = ({ handlePublish }: { handlePublish: () => void }) => (
  <div className="border-b flex items-center justify-between px-4 py-2">
    <div className="flex items-center gap-4">
      <button className="p-1 text-gray-600 hover:text-gray-900">
        <Menu className="w-5 h-5" />
      </button>
      <div className="text-sm text-gray-600">Just me</div>
      <div className="font-medium">Arcade Flow (Sat May 10 2025)</div>
    </div>

    <div className="flex items-center gap-2">
      <div className="border-b-2 border-black px-4 py-2 text-black font-medium">Edit</div>
      <div className="px-4 py-2 text-gray-600">Preview</div>
      <div className="px-4 py-2 text-gray-600">Insights</div>
      <button className="bg-black text-white px-3 py-1 rounded-full text-sm flex items-center gap-1">
        <span>Upgrade</span>
      </button>
    </div>

    <div className="flex items-center gap-3">
      <button onClick={handlePublish} className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800">
        Publish
      </button>
      <button className="px-3 py-1 border rounded-md text-gray-600 hover:bg-gray-50">Share</button>
      <button className="p-1 text-gray-600 hover:text-gray-900">
        <MoreHorizontal className="w-5 h-5" />
      </button>
    </div>
  </div>
)

// SlidesSidebar component
const SlidesSidebar = ({ 
  slides, 
  activeSlide, 
  setActiveSlide 
}: { 
  slides: { id: number; title: string; content: string }[]; 
  activeSlide: number; 
  setActiveSlide: (index: number) => void 
}) => (
  <div className="w-[172px] border-r overflow-y-auto p-2 bg-gray-50">
    {slides.map((slide, index) => (
      <Slide
        key={slide.id}
        slide={slide}
        index={index}
        isActive={activeSlide === index}
        onClick={() => setActiveSlide(index)}
      />
    ))}
  </div>
)

// SlideEditor component
const SlideEditor = () => (
  <div className="flex-1 bg-gradient-to-b from-purple-600 to-purple-200 flex items-center justify-center p-4 overflow-auto">
    <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl aspect-video flex items-center justify-center">
      <div className="text-center p-8">
        <h2 className="text-xl text-gray-400 mb-4">Add from...</h2>
        <div className="grid grid-cols-1 gap-4 max-w-xs mx-auto">
          <button className="flex items-center gap-2 p-3 border rounded-md hover:bg-gray-50 text-left">
            <Upload className="w-5 h-5 text-gray-500" />
            <span>My computer</span>
          </button>
          <button className="flex items-center gap-2 p-3 border rounded-md hover:bg-gray-50 text-left">
            <FileText className="w-5 h-5 text-gray-500" />
            <span>Library</span>
          </button>
          <button className="flex items-center gap-2 p-3 border rounded-md hover:bg-gray-50 text-left">
            <PlusCircle className="w-5 h-5 text-gray-500" />
            <span>Another Arcade</span>
          </button>

          <div className="mt-4 text-sm text-gray-400">Capture with...</div>

          <button className="flex items-center gap-2 p-3 border rounded-md hover:bg-gray-50 text-left">
            <Code className="w-5 h-5 text-gray-500" />
            <span>Chrome extension</span>
          </button>
          <button className="flex items-center gap-2 p-3 border rounded-md hover:bg-gray-50 text-left">
            <Monitor className="w-5 h-5 text-gray-500" />
            <span>Desktop App</span>
          </button>
          <button className="flex items-center gap-2 p-3 border rounded-md hover:bg-gray-50 text-left">
            <Figma className="w-5 h-5 text-gray-500" />
            <span>Figma Plugin</span>
          </button>
        </div>
      </div>
    </div>
  </div>
)

// EditorSidebar component
const EditorSidebar = () => (
  <div className="w-64 border-l overflow-y-auto">
    <div className="p-4 border-b">
      <div className="flex items-center justify-between mb-4">
        <span className="font-medium">Design</span>
        <ChevronDown className="w-4 h-4" />
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span>Theme</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-black"></div>
            <span className="text-sm">Glimpse</span>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span>Wrapper</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border rounded"></div>
            <div className="w-6 h-6 border rounded bg-black"></div>
            <div className="w-6 h-6 border rounded bg-white"></div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span>Background</span>
          <div className="flex items-center gap-1 flex-wrap">
            <div className="w-5 h-5 rounded-full bg-gray-200"></div>
            <div className="w-5 h-5 rounded-full bg-blue-200"></div>
            <div className="w-5 h-5 rounded-full bg-green-200"></div>
            <div className="w-5 h-5 rounded-full bg-black"></div>
            <div className="w-5 h-5 rounded-full bg-orange-200"></div>
            <div className="w-5 h-5 rounded-full bg-purple-200"></div>
            <div className="w-5 h-5 rounded-full bg-pink-200"></div>
            <div className="w-5 h-5 rounded-full border flex items-center justify-center text-xs">+</div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span>Cursor</span>
          <div className="flex items-center gap-2">
            <div className="border rounded px-1 text-xs">K</div>
            <div className="border rounded px-1 text-xs">→</div>
            <div className="border rounded px-1 text-xs">••</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span>Preview</span>
        <ChevronRight className="w-4 h-4" />
      </div>

      <div className="flex items-center justify-between mb-2">
        <span>Watermark</span>
        <div className="w-4 h-4 rounded-full border"></div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span>Font</span>
        <div className="flex items-center gap-1">
          <span className="text-sm">Inter</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span>Metadata</span>
        <ChevronRight className="w-4 h-4" />
      </div>

      <div className="flex items-center justify-between mb-2">
        <span>Audio</span>
        <ChevronRight className="w-4 h-4" />
      </div>

      <div className="flex items-center justify-between mb-2">
        <span>Other</span>
        <ChevronRight className="w-4 h-4" />
      </div>
    </div>
  </div>
)

// EditorView component
const EditorView = ({ 
  handlePublish, 
  slides, 
  activeSlide, 
  setActiveSlide 
}: { 
  handlePublish: () => void; 
  slides: { id: number; title: string; content: string }[]; 
  activeSlide: number; 
  setActiveSlide: (index: number) => void 
}) => (
  <div className="h-screen flex flex-col bg-white">
    <EditorNavBar handlePublish={handlePublish} />
    <div className="flex flex-1 overflow-hidden">
      <SlidesSidebar slides={slides} activeSlide={activeSlide} setActiveSlide={setActiveSlide} />
      <SlideEditor />
      <EditorSidebar />
    </div>
  </div>
)

// InputForm component
const InputForm = ({ 
  inputText, 
  setInputText, 
  handleSubmit 
}: { 
  inputText: string; 
  setInputText: (text: string) => void; 
  handleSubmit: (e: React.FormEvent) => void 
}) => (
  <form onSubmit={handleSubmit} className="w-full max-w-3xl mb-8">
    <div className="border rounded-2xl shadow-sm">
      <div className="p-6">
        <textarea
          placeholder="Ask Glimpse to build"
          className="w-full outline-none text-gray-700 text-lg resize-none min-h-[100px]"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={3}
        />
      </div>
      <div className="border-t p-3 flex justify-end items-center">
        <div className="flex items-center gap-2">
          <button type="button" className="p-2 text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>
          <button
            type="submit"
            className={`p-2 rounded-md ${inputText.trim() ? "bg-black text-white" : "text-gray-500"}`}
            disabled={!inputText.trim()}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </form>
)

// SuggestedActions component
const SuggestedActions = () => (
  <div className="flex flex-wrap justify-center gap-3 mb-16">
    <ActionButton icon={<FileText className="w-4 h-4" />} label="A demo of my new Docs" />
    <ActionButton icon={<Users className="w-4 h-4" />} label="Onboarding flow walkthrough" />
    <ActionButton icon={<Settings className="w-4 h-4" />} label="Admin panel in action" />
    <ActionButton icon={<ShoppingCart className="w-4 h-4" />} label="Self-serve checkout flow" />
  </div>
)

// PreviousDemosSection component
const PreviousDemosSection = ({ previousDemos }: { previousDemos: any[] }) => (
  <div className="w-full max-w-6xl">
    <div className="flex justify-between items-center mb-4">
      <div>
        <h2 className="text-xl font-semibold">Previous Demos</h2>
        <p className="text-gray-500">View your recent demo projects</p>
      </div>
      <button className="flex items-center text-gray-600 hover:text-gray-900">
        <span>View All</span>
        <ChevronRight className="w-4 h-4 ml-1" />
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {previousDemos.map((demo, index) => (
        <PreviousDemoCard key={index} title={demo.title} description={demo.description} image={demo.image} />
      ))}
    </div>
  </div>
)

// HomePage component
const HomePage = ({ 
  inputText, 
  setInputText, 
  handleSubmit, 
  previousDemos 
}: { 
  inputText: string; 
  setInputText: (text: string) => void; 
  handleSubmit: (e: React.FormEvent) => void; 
  previousDemos: any[] 
}) => (
  <div className="container mx-auto px-4 py-16 flex flex-col items-center">
    <h1 className="text-4xl font-bold text-center mb-8">What are we demoing today?</h1>
    <InputForm inputText={inputText} setInputText={setInputText} handleSubmit={handleSubmit} />
    <SuggestedActions />
    <PreviousDemosSection previousDemos={previousDemos} />
  </div>
)

// LoadingView component
const LoadingView = ({ 
  submittedText, 
  loadingText, 
  loadingDots 
}: { 
  submittedText: string; 
  loadingText: string; 
  loadingDots: string 
}) => (
  <div className="container mx-auto px-4 py-16">
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex-shrink-0"></div>
          <div>
            <p className="text-gray-800">{submittedText}</p>
          </div>
        </div>
      </div>
      <LoadingIndicator loadingText={loadingText} loadingDots={loadingDots} />
    </div>
  </div>
)

enum PageState {
  Home,
  Loading,
  Editor,
  Published,
}

export default function V0Interface() {
  const [inputText, setInputText] = useState("")
  const [submittedText, setSubmittedText] = useState("")
  const [currentPage, setCurrentPage] = useState<PageState>(PageState.Home)
  const [loadingText, setLoadingText] = useState("Glimpse agent is now loading")
  const [loadingDots, setLoadingDots] = useState("")
  const [activeSlide, setActiveSlide] = useState(0)
  const [publishedUrl, setPublishedUrl] = useState("")

  // Generate 10 slides
  const slides = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    title: `Slide ${i + 1}`,
    content: i === 0 ? "Title Slide" : `Content for slide ${i + 1}`,
  }))

  // Previous demos data
  const previousDemos = [
    {
      title: "E-commerce Dashboard",
      description: "Interactive sales analytics with real-time data",
      image: "/placeholder.svg?height=200&width=300",
    },
    {
      title: "AI Content Generator",
      description: "Smart content creation tool for marketing teams",
      image: "/placeholder.svg?height=200&width=300",
    },
    {
      title: "Customer Portal",
      description: "Self-service portal with account management",
      image: "/placeholder.svg?height=200&width=300",
    },
  ]

  // Dynamic loading text effect
  useEffect(() => {
    if (currentPage !== PageState.Loading) {
      setLoadingText("Glimpse agent is now loading") // Reset when not loading
      setLoadingDots("")
      return
    }

    // Simulate thinking steps
    const thinkingSteps = [
      "Glimpse agent is now loading",
      "Analyzing request",
      "Generating content",
      "Preparing preview",
    ]

    let currentStep = 0
    const stepInterval = setInterval(() => {
      setLoadingText(thinkingSteps[currentStep % thinkingSteps.length])
      currentStep++
    }, 800)

    // Animate the dots
    const dotsInterval = setInterval(() => {
      setLoadingDots((prev) => {
        if (prev === "...") return ""
        return prev + "."
      })
    }, 300)

    return () => {
      clearInterval(stepInterval)
      clearInterval(dotsInterval)
    }
  }, [currentPage])

  // Simulate loading time, then go directly to editor
  useEffect(() => {
    if (currentPage === PageState.Loading) {
      const timer = setTimeout(() => {
        setCurrentPage(PageState.Editor)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [currentPage])

  // Generate a random URL for the published deck
  useEffect(() => {
    if (currentPage === PageState.Published) {
      const randomString = Math.random().toString(36).substring(2, 8)
      setPublishedUrl(`https://glimpse.io/${randomString}`)
    }
  }, [currentPage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inputText.trim()) {
      setSubmittedText(inputText)
      setCurrentPage(PageState.Loading)

      // Backend API call
      try {
        const response = await fetch("http://127.0.0.1:8000/generate-demo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nl_task: inputText,
            root_url: "google.com", // As per your example
          }),
        });

        const responseBody = await response.text(); // Get raw text response like `| cat`

        if (!response.ok) {
          console.error("API Error:", response.status, responseBody);
          // Optionally, handle error state in UI
        } else {
          console.log("API Success:", responseBody);
          // Process responseData if needed for future steps
        }
      } catch (error) {
        console.error("Network or other error during API call:", error);
        // Optionally, handle error state in UI
      }
    }
  }

  const handleStartNewTask = () => {
    setInputText("")
    setSubmittedText("")
    setCurrentPage(PageState.Home)
    setActiveSlide(0)
    setPublishedUrl("") // Reset so it's regenerated if needed
  }

  const handlePublish = () => {
    setCurrentPage(PageState.Published)
  }

  // Conditional rendering for different views
  if (currentPage === PageState.Published) {
    return <PublishedView 
              submittedText={submittedText} 
              publishedUrl={publishedUrl} 
              handleStartNewTask={handleStartNewTask} 
           />
  }

  if (currentPage === PageState.Editor) {
    return <EditorView 
              handlePublish={handlePublish} 
              slides={slides} 
              activeSlide={activeSlide} 
              setActiveSlide={setActiveSlide} 
           />
  }

  // Covers PageState.Home and PageState.Loading
  return (
    <div className="min-h-screen bg-white flex">
      <div className={`transition-all duration-300 w-full`}>
        {currentPage === PageState.Home ? (
          <HomePage 
            inputText={inputText} 
            setInputText={setInputText} 
            handleSubmit={handleSubmit} 
            previousDemos={previousDemos} 
          />
        ) : ( // This implies currentPage === PageState.Loading
          <LoadingView 
            submittedText={submittedText} 
            loadingText={loadingText} 
            loadingDots={loadingDots} 
          />
        )}
      </div>
    </div>
  )
}
