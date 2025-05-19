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
  Clock,
  Grid,
  Users2,
  Star,
  SkipBack,
  Play,
  SkipForward,
  ZoomOut,
  ZoomIn,
} from "lucide-react"
import { useState, useEffect, useMemo } from "react"

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

// SlideEditor component - Accept bgColor prop
const SlideEditor = ({ slide, bgColor }: { slide: { id: number; title: string; content: string } | null; bgColor: string }) => (
  // Outer container: provides background, centers content, allows scrolling if needed
  <div className={`flex-1 ${bgColor} flex items-center justify-center p-4 overflow-auto`}>
    {/* Inner container (image stage): Added aspect-video for consistent shape */}
    <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl max-h-[85vh] aspect-video flex items-center justify-center relative p-4">
      {slide ? (
        <Image
          src={slide.content}
          alt={slide.title}
          layout="fill" // Fills the parent (the p-4 padded bg-white div)
          objectFit="contain" // Maintains aspect ratio, fits within bounds, prevents cropping
          // No className needed here as layout="fill" handles positioning and size relative to parent
        />
      ) : (
        // Fallback for when no slide is selected
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
  demoType,
  setDemoType,
}: {
  inputText: string
  setInputText: (text: string) => void
  handleSubmit: (e: React.FormEvent) => void
  demoType: "video" | "screenshot"
  setDemoType: (type: "video" | "screenshot") => void
}) => {
  return (
  <form onSubmit={handleSubmit} className="w-full max-w-3xl mb-8">
    <div className="border rounded-2xl shadow-sm bg-white">
      <div className="p-6">
        <textarea
          placeholder="Ask Glimpse to build..."
          className="w-full outline-none text-gray-700 text-lg resize-none min-h-[100px]"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={3}
        />
      </div>
      {/* MODIFIED: Dropdown is now part of the bottom bar, aligned to the left */}
      <div className="border-t p-3 flex justify-between items-center">
        <div>
          <select
            value={demoType}
            onChange={(e) => setDemoType(e.target.value as "video" | "screenshot")}
            className="w-auto bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-black focus:border-black hover:bg-gray-100 transition-colors"
          >
            <option value="video">Video</option>
            <option value="screenshot">Screenshot</option>
          </select>
        </div>
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
}

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

// Define type for team object outside components if used in multiple places
type Team = {
  id: string; // Added identifier
  name: string;
  logo: string;
  imageCount: number; // Added image count
};

// NEW: Sidepanel component - Now receives state and handler via props
const Sidepanel = ({
  selectedTeam,
  setSelectedTeam, // Use the passed handler
  teams // Use passed teams data
}: {
  selectedTeam: Team;
  setSelectedTeam: (team: Team) => void;
  teams: Team[];
}) => {
  // State for dropdown visibility is kept local
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const recentItems = [
    "API request feature",
    "New Documentation",
    "New dashboard"
  ];

  // Handler for selecting a team - Calls the passed function
  const handleTeamSelect = async (team: Team) => { // Made async
    setSelectedTeam(team); // Call the function passed from parent to update UI state
    setIsDropdownOpen(false); // Close the dropdown

    // If the selected team is Databricks, skip sending the mock mode to the backend.
    if (team.id === "databricks") { // Removed "free-run" from this condition
      console.log(`${team.name} team selected. Skipping mock mode API call.`);
      return;
    }

    // Determine the mock_mode ID based on the team's index in the teams array
    const teamIndex = teams.findIndex(t => t.id === team.id);
    let mockModeToSet: number | null = null;

    if (teamIndex !== -1) {
      mockModeToSet = teamIndex; // teamIndex directly corresponds to mock_mode (0 for Free Run)
    } else {
      console.error("Selected team not found in the teams list. Cannot set mock mode via API.");
      return; // Do not proceed if the team isn't found (should not happen with current setup)
    }

    if (mockModeToSet === null) {
        console.warn("Could not determine a valid mock_mode to set. API call will be skipped.");
        return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/set-active-mock-mode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mock_mode: mockModeToSet }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(
          `API Error setting mock mode to ${mockModeToSet}:`,
          response.status,
          errorBody
        );
        // Optionally, handle UI feedback here
      } else {
        const responseData = await response.json();
        console.log(`Mock mode set to ${mockModeToSet} successfully:`, responseData);
      }
    } catch (error) {
      console.error(`Network or other error setting mock mode to ${mockModeToSet}:`, error);
      // Optionally, handle UI feedback here
    }
  };

  return (
    <div className="w-72 bg-gray-50 border-r border-gray-200 h-screen flex flex-col p-4 space-y-3 text-sm relative"> {/* Added relative positioning for dropdown */}
      {/* Top Logo/Team Dropdown Section */}
      <div className="mb-4 relative"> {/* Container for dropdown */}
        {/* Dropdown Trigger Button */}
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-200 w-full text-left transition-colors"
        >
          <Image
            src={selectedTeam.logo}
            alt={`${selectedTeam.name} logo`}
            width={24} // Specify width
            height={24} // Specify height
            className="rounded-full flex-shrink-0 object-contain"
          />
          <span className="font-semibold text-lg flex-grow truncate">{selectedTeam.name}</span>
          <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>
 
        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 py-1">
            {teams.map((team) => (
              <button
                key={team.name}
                onClick={() => handleTeamSelect(team)} // Use internal handler which calls prop
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 w-full text-left text-sm"
              >
                <Image
                  src={team.logo}
                  alt={`${team.name} logo`}
                  width={20}
                  height={20}
                  className="rounded-full flex-shrink-0 object-contain"
                />
                <span className="flex-grow truncate">{team.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
 
      <button className="w-full bg-white border border-gray-300 rounded-lg py-2.5 text-gray-700 hover:bg-gray-100 transition-colors">
        New Chat
      </button>
 
      {/* Navigation Links */}
      <nav className="space-y-1.5">
        <a href="#" className="flex items-center gap-3 px-2 py-1.5 text-gray-600 hover:bg-gray-200 rounded-md">
          <Clock size={18} />
          <span>Recents</span>
        </a>
        <a href="#" className="flex items-center gap-3 px-2 py-1.5 text-gray-600 hover:bg-gray-200 rounded-md">
          <Grid size={18} />
          <span>Projects</span>
        </a>
  
      </nav>
 
      {/* Divider */}
      <div className="pt-2">
        <a href="#" className="flex items-center justify-between px-2 py-1.5 text-gray-600 hover:bg-gray-200 rounded-md">
          <div className="flex items-center gap-3">
            <Star size={18} />
            <span>Favorite Projects</span>
          </div>
          <ChevronRight size={16} />
        </a>
        <a href="#" className="flex items-center justify-between px-2 py-1.5 text-gray-600 hover:bg-gray-200 rounded-md">
          <div className="flex items-center gap-3">
            <Star size={18} />
            <span>Favorite Chats</span>
          </div>
          <ChevronRight size={16} />
        </a>
      </div>
 
      {/* Recent Items Section */}
      <div className="pt-2 flex-grow overflow-y-auto space-y-1 pr-1">
        <div className="flex items-center justify-between px-2 py-1.5 text-gray-600">
          <span className="font-medium">Recent</span>
          <ChevronDown size={16} />
        </div>
        {recentItems.map((item, index) => (
          <a key={index} href="#" className="block px-2 py-1.5 text-gray-500 hover:bg-gray-200 rounded-md truncate">
            {item}
          </a>
        ))}
      </div>
 

   </div>
  );
};

// HomePage component - Pass state and handler to Sidepanel
const HomePage = ({
  inputText,
  setInputText,
  handleSubmit,
  previousDemos,
  selectedTeam, // Receive state
  setSelectedTeam, // Receive handler
  teams, // Receive team data
  demoType, // Add demoType
  setDemoType, // Add setDemoType
}: {
  inputText: string
  setInputText: (text: string) => void
  handleSubmit: (e: React.FormEvent) => void
  previousDemos: any[]
  selectedTeam: Team;
  setSelectedTeam: (team: Team) => void;
  teams: Team[];
  demoType: "video" | "screenshot"; // Add demoType prop
  setDemoType: (type: "video" | "screenshot") => void; // Add setDemoType prop
}) => (
  <div className="flex h-screen bg-white">
    {/* Pass props to Sidepanel */}
    <Sidepanel selectedTeam={selectedTeam} setSelectedTeam={setSelectedTeam} teams={teams} />
    <div className="flex-1 flex flex-col items-center overflow-y-auto">
      <div className="container mx-auto px-4 py-16 flex flex-col items-center w-full">
        <h1 className="text-4xl font-bold text-center mb-8">What are we demoing today?</h1>
        <InputForm inputText={inputText} setInputText={setInputText} handleSubmit={handleSubmit} demoType={demoType} setDemoType={setDemoType} />
        <SuggestedActions />
        <PreviousDemosSection previousDemos={previousDemos} />
      </div>
    </div>
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
  VideoEditor = 4, // Added new state for Video Editor
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
  const [artifactPath, setArtifactPath] = useState<string | null>(null)
  const [screenshotsList, setScreenshotsList] = useState<string[]>([])
  const [demoType, setDemoType] = useState<"video" | "screenshot">("video")
  const [intendedEditorType, setIntendedEditorType] = useState<"video" | "screenshot">("video")

  // Define teams data here with imageCount
  const teams: Team[] = [
    { id: "free-run", name: "Free Run", logo: "/free-run.png", imageCount: 0 },
    { id: "browser-use", name: "Team Browser Use", logo: "/browser-use.png", imageCount: 5 },
    { id: "github", name: "GitHub for Education", logo: "/github.png", imageCount: 4 },
    { id: "storylane", name: "Storylane", logo: "/storylane.png", imageCount: 3 },
    { id: "glimpse", name: "Team Glimpse", logo: "/glimpse.png", imageCount: 3 },
    { id: "databricks", name: "Databricks", logo: "/databricks.png", imageCount: 4 },
  ];

  // State for selected team - lifted up
  const [selectedTeam, setSelectedTeam] = useState<Team>(teams[0]);

  // Add effect to set mock mode on initial load
  useEffect(() => {
    // Skip if it's Databricks team
    if (selectedTeam.id === "databricks") {
      console.log("Databricks team selected. Skipping initial mock mode API call.");
      return;
    }

    // Determine the mock_mode ID based on the team's index
    const teamIndex = teams.findIndex(t => t.id === selectedTeam.id);
    let mockModeToSet: number | null = null;

    if (teamIndex !== -1) {
      mockModeToSet = teamIndex; // Adjusted: teamIndex directly corresponds to mock_mode (0 for Free Run)
    } else {
      console.error("Selected team not found in the teams list. Cannot set initial mock mode via API.");
      return;
    }

    // Call the API to set the mock mode
    const setInitialMockMode = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/set-active-mock-mode", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mock_mode: mockModeToSet }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(
            `API Error setting initial mock mode to ${mockModeToSet}:`,
            response.status,
            errorBody
          );
        } else {
          const responseData = await response.json();
          console.log(`Initial mock mode set to ${mockModeToSet} successfully:`, responseData);
        }
      } catch (error) {
        console.error(`Network or other error setting initial mock mode to ${mockModeToSet}:`, error);
      }
    };

    setInitialMockMode();
  }, []); // Empty dependency array means this runs once on mount

  // Dynamically generate slides using useMemo for stability
  const slides = useMemo(() => {
    console.log("useMemo recalculating slides. Team:", selectedTeam.id, "ArtifactPath:", artifactPath, "ScreenshotsList Length:", screenshotsList.length);
    if (selectedTeam.id === "free-run" && artifactPath && screenshotsList.length > 0) {
      return screenshotsList.map((screenshotName, i) => ({
        id: i,
        title: `Free Run - Step ${i + 1}`,
        content: `/${artifactPath}/${screenshotName}`,
      }));
    }
    // Fallback for other teams or if artifacts aren't ready for Free Run
    return Array.from({ length: selectedTeam.imageCount }, (_, i) => ({
      id: i,
      title: `${selectedTeam.name} - Slide ${i + 1}`,
      content: `/${selectedTeam.id}/${i + 1}.png`,
    }));
  }, [selectedTeam, artifactPath, screenshotsList]);

  // useEffect to sync activeSlide with slides array boundaries
  useEffect(() => {
    console.log(`useEffect (ActiveSlide Boundary Check) triggered. activeSlide: ${activeSlide}, slides.length: ${slides.length}`);
    if (slides.length > 0) {
      if (activeSlide >= slides.length) {
        console.warn(`Active slide ${activeSlide} is out of bounds (max ${slides.length - 1}). Resetting to slide 0.`);
        setActiveSlide(0);
      }
    } else { // No slides currently available
      if (activeSlide !== 0) {
        console.warn(`No slides available, but activeSlide is ${activeSlide}. Resetting to slide 0.`);
        setActiveSlide(0);
      }
    }
  }, [slides, activeSlide, setActiveSlide]); // Dependencies

  // Previous demos data (remains static for now)
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
              if (selectedTeam.id === "free-run") {
                console.log("Job completed for Free Run. Fetching artifact details...");
                const fetchJobDetails = async () => {
                  try {
                    const res = await fetch(`http://127.0.0.1:8000/demo-status/${jobId}`);
                    if (res.ok) {
                      const jobDetails = await res.json();
                      console.log("Fetched jobDetails for Free Run (raw):", JSON.stringify(jobDetails, null, 2));
                      if (jobDetails.artifact_path && jobDetails.screenshots && jobDetails.screenshots.length > 0) {
                        setArtifactPath(jobDetails.artifact_path);
                        setScreenshotsList(jobDetails.screenshots);
                        console.log("Free Run artifacts loaded via fetchJobDetails:", jobDetails.artifact_path, jobDetails.screenshots);
                        // setCurrentPage(PageState.Editor) will be handled by the new useEffect
                      } else {
                        console.error("Free Run artifacts condition failed. artifact_path:", jobDetails.artifact_path, "screenshots:", jobDetails.screenshots, "screenshots.length:", jobDetails.screenshots ? jobDetails.screenshots.length : 'undefined');
                        setCurrentPage(PageState.Home); // Go home if artifacts are missing
                      }
                    } else {
                      console.error("Failed to fetch job details for Free Run artifacts, status:", res.status);
                      setCurrentPage(PageState.Home); // Go home on fetch error
                    }
                  } catch (fetchError) {
                    console.error("Error fetching final job details for Free Run artifacts:", fetchError);
                    setCurrentPage(PageState.Home); // Go home on network error
                  } finally {
                    ws.close(); // Close WebSocket after processing
                  }
                };
                fetchJobDetails();
              } else {
                // For non-Free Run modes, transition directly
                console.log("Job completed for non-Free Run. Transitioning based on intendedEditorType:", intendedEditorType);
                if (intendedEditorType === "video") {
                  setCurrentPage(PageState.VideoEditor);
                } else {
                  setCurrentPage(PageState.Editor);
                }
                ws.close();
              }
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
  }, [currentPage, jobId, setCurrentPage, setJobId, intendedEditorType])

  // useEffect to transition to Editor for Free Run once artifacts are loaded
  useEffect(() => {
    console.log("useEffect (Free Run Transition Check) triggered. currentPage:", PageState[currentPage], "selectedTeam:", selectedTeam.id, "artifactPath:", artifactPath, "screenshotsList.length:", screenshotsList.length);

    if (currentPage === PageState.Loading &&
        selectedTeam.id === "free-run" &&
        artifactPath && 
        screenshotsList.length > 0
    ) {
      console.log("Free Run artifacts ready, conditions met! Transitioning based on intendedEditorType:", intendedEditorType, artifactPath, screenshotsList);
      if (intendedEditorType === "video") {
        setCurrentPage(PageState.VideoEditor);
      } else {
        setCurrentPage(PageState.Editor);
      }
    }
  }, [currentPage, selectedTeam, artifactPath, screenshotsList, setCurrentPage, intendedEditorType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      setSubmittedText(inputText);
      setCurrentPage(PageState.Loading);
      setJobId(null); 
      setArtifactPath(null); // Reset artifacts
      setScreenshotsList([]); // Reset artifacts
      setIntendedEditorType(demoType); // Store the selected demo type for editor routing

      // Special handling for Databricks team
      if (selectedTeam.id === "databricks") { 
        console.log(`${selectedTeam.name} team selected. Bypassing backend demo generation. Intended editor: ${demoType}`);
        setTimeout(() => {
          console.log(`5-second delay complete. Transitioning for Databricks to ${demoType} editor.`);
          if (demoType === "video") {
            setCurrentPage(PageState.VideoEditor);
          } else {
            setCurrentPage(PageState.Editor);
          }
        }, 5000); // 5-second delay
        return; // Important: return to prevent the normal API call path
      }

      // Regular path for other teams (including Free Run): Call the backend to generate the demo
      try {
        const response = await fetch("http://127.0.0.1:8000/generate-demo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nl_task: inputText,
            root_url: selectedTeam.id === "free-run" ? "" : "google.com", 
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
          // For Free Run, artifacts will be fetched via WebSocket onmessage or after a delay
          // No special timeout here anymore, rely on WebSocket for transition for all.
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
    setArtifactPath(null); // Reset artifacts
    setScreenshotsList([]); // Reset artifacts
    // Reset selected team? Maybe not necessary depending on desired UX
    // setSelectedTeam(teams[0]); 
  }

  const handlePublish = () => {
    setCurrentPage(PageState.Published)
  }

  // NEW: VideoEditorView component (basic structure)
  const VideoEditorView = ({
    handlePublish,
  }: {
    handlePublish: () => void;
  }) => {
    const [activeTab, setActiveTab] = useState<"Wallpaper" | "Gradient" | "Color" | "Image">("Wallpaper");
    const [wallpaperType, setWallpaperType] = useState<"macOS" | "Spring" | "Sunset" | "Radia">("macOS");

    return (
      <div className="h-screen flex flex-col bg-gray-900 text-white">
        {/* Top Bar (Placeholder) */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <button className="p-1 hover:bg-gray-700 rounded">
              <ArrowLeft size={20} />
            </button>
            <span className="text-sm">Video Project Title</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 rounded-md">Export</button>
            <button className="p-1 hover:bg-gray-700 rounded">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar (Placeholder for tools/layers) */}
          <div className="w-16 bg-gray-800 border-r border-gray-700 p-2 flex flex-col items-center space-y-3">
            {[Grid, Copy /* Users2, Star */ /* Using Grid and Copy as placeholders */].map((Icon, idx) => (
              <button key={idx} className="p-2 hover:bg-gray-700 rounded-md">
                <Icon size={22} />
              </button>
            ))}
          </div>

          {/* Video Preview Area */}
          <div className="flex-1 flex flex-col items-center justify-center bg-black relative p-4">
             {/* Simulated Browser Window - Centered */}
            <div className="w-full max-w-4xl aspect-video bg-gray-700 rounded-lg shadow-2xl flex flex-col overflow-hidden">
              {/* Browser Top Bar */}
              <div className="bg-gray-800 h-8 flex items-center px-3 gap-1.5">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              {/* Browser Content Area - Placeholder */}
              <div className="flex-1 bg-black flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Monitor size={64} className="mx-auto mb-4" />
                  <p className="text-lg">Interactive Browser Use</p>
                  <p className="text-sm mb-4">What can I help you with?</p>
                  <input type="text" placeholder="Describe the goal, e.g., Log into my bank..." className="bg-gray-800 text-white placeholder-gray-500 px-3 py-2 rounded-md text-xs w-80 mb-2"/>
                  <button className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-md text-sm">Start Session</button>
                </div>
              </div>
            </div>
              {/* Simulated Camera Feed Overlay */}
              <div className="absolute bottom-8 right-8 w-48 h-32 bg-gray-600 rounded-lg border-2 border-gray-500 overflow-hidden">
                {/* Placeholder for camera feed */}
                <div className="w-full h-full bg-gray-500 flex items-center justify-center text-xs text-gray-300">Camera Feed</div>
              </div>
          </div>


          {/* Right Sidebar (Editing Controls) */}
          <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto p-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Background</h3>
              <div className="flex items-center gap-1 bg-gray-700 p-1 rounded-md mb-3">
                {(["Wallpaper", "Gradient", "Color", "Image"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-xs rounded-md flex-1 ${activeTab === tab ? "bg-gray-600" : "hover:bg-gray-600/50"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === "Wallpaper" && (
                <div className="space-y-3">
                  <h4 className="text-xs text-gray-400 mb-1">Wallpaper</h4>
                   <div className="flex items-center gap-1 bg-gray-700 p-1 rounded-md mb-2">
                    {(["macOS", "Spring", "Sunset", "Radia"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setWallpaperType(type)}
                        className={`px-2 py-1 text-xs rounded flex-1 ${wallpaperType === type ? "bg-gray-500" : "hover:bg-gray-600"}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <button className="w-full flex items-center justify-center gap-2 text-xs py-2 bg-gray-700 hover:bg-gray-600 rounded-md">
                    <Star size={14}/> Pick random wallpaper {/* Using Star as placeholder for wand */}
                  </button>
                  {/* Wallpaper Thumbnails (Placeholder) */}
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="aspect-video bg-gray-600 rounded hover:opacity-80 cursor-pointer"></div>
                    ))}
                  </div>
                </div>
              )}
               {/* Add Gradient, Color, Image sections later */}
            </div>

            <div>
              <label htmlFor="bg-blur" className="text-xs text-gray-400 block mb-1">Background blur</label>
              <input type="range" id="bg-blur" min="0" max="100" defaultValue="30" className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
            </div>
            <div>
              <label htmlFor="padding" className="text-xs text-gray-400 block mb-1">Padding</label>
              <input type="range" id="padding" min="0" max="100" defaultValue="50" className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
            </div>
            <div>
              <label htmlFor="corners" className="text-xs text-gray-400 block mb-1">Rounded corners</label>
              <input type="range" id="corners" min="0" max="100" defaultValue="60" className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
            </div>
             {/* More controls can be added here: Opacity, Fit/Fill, Filters etc. */}
          </div>
        </div>

        {/* Timeline Area (Placeholder) */}
        <div className="h-28 bg-gray-800 border-t border-gray-700 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-1">
            <span>1 visible timeline</span>
            <ChevronDown size={16} />
          </div>
          {/* Timeline controls and track (Simplified) */}
          <div className="flex-1 bg-gray-700 rounded flex items-center justify-center text-xs text-gray-400 relative">
            <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-purple-500 rounded-full"></div> {/* Playhead */}
            Timeline Track
          </div>
           <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-2">
                   {/* Placeholder for timeline controls */}
                  <button className="p-1 hover:bg-gray-700 rounded"><SkipBack size={16}/></button>
                  <button className="p-1 hover:bg-gray-700 rounded"><Play size={16}/></button>
                  <button className="p-1 hover:bg-gray-700 rounded"><SkipForward size={16}/></button>
              </div>
              <div className="text-xs">0:00 / 0:30</div> {/* Placeholder time */}
              <div className="flex items-center gap-2">
                   {/* Placeholder for zoom/other controls */}
                  <button className="p-1 hover:bg-gray-700 rounded"><ZoomOut size={16}/></button>
                  <input type="range" min="0" max="100" defaultValue="50" className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                  <button className="p-1 hover:bg-gray-700 rounded"><ZoomIn size={16}/></button>
              </div>
          </div>
        </div>
      </div>
    );
  };

  // Conditional rendering for different views
  if (currentPage === PageState.Published) {
    return (
      <PublishedView
        submittedText={submittedText} // You might want to pass selectedTeam.name here or adjust
        slides={slides} // Pass dynamically generated slides
        bgColor={selectedBgColor}
        handleStartNewTask={handleStartNewTask}
      />
    )
  }

  if (currentPage === PageState.VideoEditor) { // Added new condition for VideoEditor
    return (
      <VideoEditorView
        handlePublish={handlePublish}
        // Pass other necessary props here
      />
    );
  }

  if (currentPage === PageState.Editor) {
    return (
      <EditorView
        handlePublish={handlePublish}
        slides={slides} // Pass dynamically generated slides
        activeSlide={activeSlide}
        setActiveSlide={setActiveSlide}
        selectedBgColor={selectedBgColor}
        setSelectedBgColor={setSelectedBgColor}
      />
    )
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
            selectedTeam={selectedTeam} // Pass state down
            setSelectedTeam={setSelectedTeam} // Pass handler down
            teams={teams} // Pass team data down
            demoType={demoType} // Pass demoType down
            setDemoType={setDemoType} // Pass setDemoType down
          />
        ) : (
          <LoadingView submittedText={submittedText} loadingText={loadingText} loadingDots={loadingDots} />
        )}
      </div>
    </div>
  )
}
