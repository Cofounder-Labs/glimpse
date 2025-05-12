"use client"

import type React from "react"

import Image from "next/image"
import {
  ChevronRight,
  FileText,
  Users,
  Settings,
  ShoppingCart,
  PlusCircle,
  MoreHorizontal,
  Upload,
  ChevronDown,
  Code,
  Monitor,
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
          <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
  title: string
  description: string
  image: string
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
        <button className="text-xs text-gray-600 hover:text-gray-900 border px-2 py-1 rounded">View</button>
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
const Slide = ({
  slide,
  index,
  isActive,
  onClick,
}: {
  slide: { id: number; title: string; content: string }
  index: number
  isActive: boolean
  onClick: () => void
}) => (
  <div
    className={`mb-2 p-1 rounded cursor-pointer border ${isActive ? "border-black" : "border-gray-200"}`}
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
  slides,
  bgColor,
  handleStartNewTask,
}: {
  submittedText: string
  slides: { id: number; title: string; content: string }[]
  bgColor: string
  handleStartNewTask: () => void
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  const goToPrevious = () => {
    setCurrentSlideIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : prevIndex))
  }

  const goToNext = () => {
    setCurrentSlideIndex((prevIndex) => (prevIndex < slides.length - 1 ? prevIndex + 1 : prevIndex))
  }

  const currentSlide = slides[currentSlideIndex]
  const publishedUrlDisplay = `https://glimpse.show/demo/${Math.random().toString(36).substring(2, 8)}` // Generate a dummy URL for display

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <div className="mb-8">
          <button onClick={handleStartNewTask} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to home</span>
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Your Glimpse has been published!</h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Your interactive demo is now available. Share the link below.
          </p>
        </div>

        {/* Slideshow Section */}
        <div className={`border rounded-lg p-8 mb-8 ${bgColor}`}> {/* Apply background color here */}
          {/* Slideshow Display Area */}
          <div className="relative w-full aspect-video bg-white/80 backdrop-blur-md rounded-lg shadow-xl overflow-hidden flex items-center justify-center mb-6">
            {currentSlide && (
              <Image
                src={currentSlide.content}
                alt={currentSlide.title}
                layout="fill"
                objectFit="contain" // Use contain for slideshow view
                className="absolute inset-0 w-full h-full"
                priority={true} // Prioritize loading the visible slide image
              />
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between w-full">
            <button
              onClick={goToPrevious}
              disabled={currentSlideIndex === 0}
              className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white/70 backdrop-blur-sm flex items-center gap-2 text-sm"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700 bg-white/70 backdrop-blur-sm px-3 py-1 rounded-full">
              Slide {currentSlideIndex + 1} of {slides.length}
            </span>
            <button
              onClick={goToNext}
              disabled={currentSlideIndex === slides.length - 1}
              className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white/70 backdrop-blur-sm flex items-center gap-2 text-sm"
            >
              Next
            </button>
          </div>
        </div>

         {/* Share Link Section (Optional - kept original structure) */}
         <div className="flex flex-col items-center mb-8">
           <p className="text-gray-500 mb-3">Share this link with your audience:</p>
           <div className="flex items-center gap-2 w-full max-w-xl">
             <div className="flex-1 bg-white border rounded-l-lg p-3 text-gray-700 overflow-hidden overflow-ellipsis">
               {publishedUrlDisplay} {/* Show the generated dummy URL */}
             </div>
             <button className="bg-gray-100 border border-l-0 rounded-r-lg p-3 text-gray-700 hover:bg-gray-200">
               <Copy className="w-5 h-5" />
             </button>
           </div>
         </div>

        {/* Action Buttons */}
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
}

// EditorNavBar component
const EditorNavBar = ({ handlePublish }: { handlePublish: () => void }) => (
  <div className="border-b flex items-center justify-between px-6 py-3">
    <div className="flex items-center gap-4">
      <button className="p-1 text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="font-medium">browser-use.com</div>
    </div>

    <div className="flex items-center gap-2">
      <div className="border-b-2 border-black px-4 py-2 text-black font-medium">Edit</div>
      <div className="px-4 py-2 text-gray-600 hover:text-gray-900 cursor-pointer">Preview</div>
    </div>

    <div className="flex items-center gap-3">
      <button onClick={handlePublish} className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800">
        Publish
      </button>
      <button className="px-3 py-1 border rounded-lg text-gray-600 hover:bg-gray-50">Share</button>
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
  setActiveSlide,
}: {
  slides: { id: number; title: string; content: string }[]
  activeSlide: number
  setActiveSlide: (index: number) => void
}) => (
  <div className="w-[172px] border-r overflow-y-auto p-3 bg-white">
    {slides.map((slide, index) => (
      <div
        key={slide.id}
        className={`mb-3 p-1 rounded-lg cursor-pointer border ${
          activeSlide === index ? "border-black" : "border-gray-200"
        } hover:border-gray-400 transition-colors`}
        onClick={() => setActiveSlide(index)}
      >
        <div className="aspect-video bg-white rounded-md flex items-center justify-center relative overflow-hidden">
          <span className="absolute bottom-1 left-1 text-xs bg-white rounded-full w-5 h-5 flex items-center justify-center border z-10">
            {index + 1}
          </span>
          <Image
            src={slide.content}
            alt={slide.title}
            layout="fill"
            objectFit="contain"
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>
    ))}
  </div>
)

// SlideEditor component
const SlideEditor = ({ slide, bgColor }: { slide: { id: number; title: string; content: string } | null; bgColor: string }) => (
  <div className={`flex-1 ${bgColor} flex items-center justify-center p-4 overflow-auto`}>
    <div className="bg-white rounded-lg shadow-lg h-[85vh] aspect-[16/16] flex items-center justify-center relative overflow-hidden pt-16">
      {slide ? (
        <Image
          src={slide.content}
          alt={slide.title}
          layout="fill"
          objectFit="cover"
          className="object-cover w-full h-full p-4"
        />
      ) : (
        <div className="text-center p-8">
          <h2 className="text-xl text-gray-400 mb-6">Select a slide</h2>
        </div>
      )}
    </div>
  </div>
)

// ChatInterface component
const ChatInterface = () => (
  <div className="p-4 border-t">
    <textarea
      placeholder="Ask Glimpse to edit this slide..."
      className="w-full p-3 border rounded-lg outline-none text-sm resize-none focus:ring-1 focus:ring-black"
      rows={2}
    />
    <div className="flex justify-end mt-2">
      <button type="button" className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors">
        Generate
      </button>
    </div>
  </div>
)

// EditorView component
const EditorView = ({
  handlePublish,
  slides,
  activeSlide,
  setActiveSlide,
  selectedBgColor,
  setSelectedBgColor,
}: {
  handlePublish: () => void
  slides: { id: number; title: string; content: string }[]
  activeSlide: number
  setActiveSlide: (index: number) => void
  selectedBgColor: string
  setSelectedBgColor: (color: string) => void
}) => {
  // Define background color options
  const backgroundColors = [
    { name: 'purple', class: 'bg-gradient-to-b from-purple-600 to-purple-200', displayClass: 'bg-purple-200' },
    { name: 'green', class: 'bg-gradient-to-b from-green-500 to-green-200', displayClass: 'bg-green-200' },
    { name: 'orange', class: 'bg-gradient-to-b from-orange-500 to-orange-200', displayClass: 'bg-orange-200' },
    { name: 'black', class: 'bg-black', displayClass: 'bg-black' },
    { name: 'white', class: 'bg-white', displayClass: 'bg-white border' }, // Added border for visibility
  ];

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="border-b flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <button className="p-1 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="font-medium">browser-use.com</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="border-b-2 border-black px-4 py-2 text-black font-medium">Edit</div>
          <div className="px-4 py-2 text-gray-600 hover:text-gray-900 cursor-pointer">Preview</div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handlePublish} className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800">
            Publish
          </button>
          <button className="px-3 py-1 border rounded-lg text-gray-600 hover:bg-gray-50">Share</button>
          <button className="p-1 text-gray-600 hover:text-gray-900">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[172px] border-r overflow-y-auto p-3 bg-white">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`mb-3 p-1 rounded-lg cursor-pointer border ${
                activeSlide === index ? "border-black" : "border-gray-200"
              } hover:border-gray-400 transition-colors`}
              onClick={() => setActiveSlide(index)}
            >
              <div className="aspect-video bg-white rounded-md flex items-center justify-center relative overflow-hidden">
                <span className="absolute bottom-1 left-1 text-xs bg-white rounded-full w-5 h-5 flex items-center justify-center border z-10">
                  {index + 1}
                </span>
                <Image
                  src={slide.content}
                  alt={slide.title}
                  layout="fill"
                  objectFit="contain"
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
          ))}
        </div>
        <SlideEditor slide={slides[activeSlide]} bgColor={selectedBgColor} />
        <div className="w-80 flex flex-col border-l bg-white">
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div className="mb-6">
                <h3 className="font-medium text-lg mb-4">Design</h3>

                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Theme</span>
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-md">
                      <div className="w-4 h-4 rounded-full bg-black"></div>
                      <span className="text-sm">Glimpse</span>
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Background</span>
                    <div className="flex items-center gap-2">
                      {backgroundColors.map((color) => (
                        <div
                          key={color.name}
                          onClick={() => setSelectedBgColor(color.class)}
                          className={`w-6 h-6 rounded-full cursor-pointer ${color.displayClass} ${
                            selectedBgColor === color.class ? 'ring-2 ring-offset-1 ring-blue-500' : '' // Highlight selected
                          }`}
                        ></div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Font</span>
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-md">
                      <span className="text-sm">Inter</span>
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Cursor</span>
                    <div className="flex items-center gap-2">
                      <div className="border rounded-md px-2 py-1 text-xs cursor-pointer hover:bg-gray-50">K</div>
                      <div className="border rounded-md px-2 py-1 text-xs cursor-pointer hover:bg-gray-50">→</div>
                      <div className="border rounded-md px-2 py-1 text-xs cursor-pointer hover:bg-gray-50">••</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Audio</span>
                    <div className="flex items-center gap-2 text-gray-500 cursor-pointer hover:text-gray-700">
                      <span className="text-sm">None</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-medium text-lg mb-4">Content</h3>

                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Slide title</span>
                    <div className="flex items-center gap-2 text-gray-500 cursor-pointer hover:text-gray-700">
                      <span className="text-sm">Edit</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Transitions</span>
                    <div className="flex items-center gap-2 text-gray-500 cursor-pointer hover:text-gray-700">
                      <span className="text-sm">Fade</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 border-t">
            <textarea
              placeholder="Ask Glimpse to edit this slide..."
              className="w-full p-3 border rounded-lg outline-none text-sm resize-none focus:ring-1 focus:ring-black"
              rows={2}
            />
            <div className="flex justify-end mt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// InputForm component
const InputForm = ({
  inputText,
  setInputText,
  handleSubmit,
}: {
  inputText: string
  setInputText: (text: string) => void
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
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
  previousDemos,
}: {
  inputText: string
  setInputText: (text: string) => void
  handleSubmit: (e: React.FormEvent) => void
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
  loadingDots,
}: {
  submittedText: string
  loadingText: string
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
  Home = 0,
  Loading = 1,
  Editor = 2,
  Published = 3,
}

export default function V0Interface() {
  const [inputText, setInputText] = useState("")
  const [submittedText, setSubmittedText] = useState("")
  const [currentPage, setCurrentPage] = useState<PageState>(PageState.Home)
  const [loadingText, setLoadingText] = useState("Glimpse agent is now loading")
  const [loadingDots, setLoadingDots] = useState("")
  const [activeSlide, setActiveSlide] = useState(0)
  const [jobId, setJobId] = useState<string | null>(null)
  const [selectedBgColor, setSelectedBgColor] = useState("bg-gradient-to-b from-purple-600 to-purple-200")

  // Generate slides based on images in the public folder
  const imageSlides = [
    { id: 0, title: "Slide 1", content: "/1.png" },
    { id: 1, title: "Slide 2", content: "/2.png" },
    { id: 2, title: "Slide 3", content: "/3.png" },
    { id: 3, title: "Slide 4", content: "/4.png" },
    { id: 4, title: "Slide 5", content: "/5.png" },
  ]

  const slides = imageSlides;

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

  useEffect(() => {
    if (currentPage !== PageState.Loading) {
      setLoadingText("Glimpse agent is now loading")
      setLoadingDots("")
      return
    }

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

  useEffect(() => {
    if (currentPage === PageState.Published) {
       // No action needed here now
    }
  }, [currentPage])

  useEffect(() => {
    if (currentPage === PageState.Loading && jobId) {
      const wsUrl = `ws://127.0.0.1:8000/ws/job-status/${jobId}`
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log(`WebSocket connection established to ${wsUrl}`)
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data as string)
          console.log("WebSocket message received:", message)

          if (message.job_id === jobId) {
            if (message.status === "completed") {
              console.log("Job completed. Transitioning to Editor.")
              setCurrentPage(PageState.Editor)
              ws.close()
            } else if (message.status === "failed") {
              console.error("Job failed:", message.error || "Unknown error from backend")
              setCurrentPage(PageState.Home)
              setJobId(null)
              ws.close()
            } else if (message.status === "processing" || message.status === "queued") {
              console.log(
                `Job status: ${message.status}, Progress: ${message.progress ? (message.progress * 100).toFixed(0) + "%" : "N/A"}`,
              )
            }
          }
        } catch (e) {
          console.error("Error parsing WebSocket message or in onmessage handler:", e)
        }
      }

      ws.onerror = (error) => {
        console.error("WebSocket error:", error)
        setCurrentPage(PageState.Home)
        setJobId(null)
      }

      ws.onclose = (event) => {
        console.log("WebSocket connection closed.", event.code, event.reason)
      }

      return () => {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          console.log("Closing WebSocket connection due to effect cleanup.")
          ws.close()
        }
      }
    }
  }, [currentPage, jobId, setCurrentPage, setJobId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inputText.trim()) {
      setSubmittedText(inputText)
      setCurrentPage(PageState.Loading)
      setJobId(null)

      try {
        const response = await fetch("http://127.0.0.1:8000/generate-demo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nl_task: inputText,
            root_url: "google.com",
          }),
        })

        if (!response.ok) {
          const errorBody = await response.text()
          console.error("API Error creating job:", response.status, errorBody)
          setCurrentPage(PageState.Home)
          return
        }

        const responseData = await response.json()
        console.log("Job created successfully:", responseData)
        if (responseData.job_id) {
          setJobId(responseData.job_id)
        } else {
          console.error("API Error: No job_id received from /generate-demo")
          setCurrentPage(PageState.Home)
        }
      } catch (error) {
        console.error("Network or other error during job creation:", error)
        setCurrentPage(PageState.Home)
      }
    }
  }

  const handleStartNewTask = () => {
    setInputText("")
    setSubmittedText("")
    setCurrentPage(PageState.Home)
    setActiveSlide(0)
    setJobId(null)
  }

  const handlePublish = () => {
    setCurrentPage(PageState.Published)
  }

  // Conditional rendering for different views
  if (currentPage === PageState.Published) {
    return (
      // Render the modified PublishedView with integrated slideshow
      <PublishedView
        submittedText={submittedText}
        slides={slides}
        bgColor={selectedBgColor}
        handleStartNewTask={handleStartNewTask}
      />
    )
  }

  if (currentPage === PageState.Editor) {
    return (
      <EditorView
        handlePublish={handlePublish}
        slides={slides}
        activeSlide={activeSlide}
        setActiveSlide={setActiveSlide}
        selectedBgColor={selectedBgColor}
        setSelectedBgColor={setSelectedBgColor}
      />
    )
  }

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
        ) : (
          <LoadingView submittedText={submittedText} loadingText={loadingText} loadingDots={loadingDots} />
        )}
      </div>
    </div>
  )
}
