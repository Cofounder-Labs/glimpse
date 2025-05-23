import React, { useState } from "react";
import Image from "next/image";
import { ArrowLeft, PlusCircle, Share2, Copy } from "lucide-react";
import { Slide } from "./types";

interface PublishedViewProps {
  submittedText: string;
  slides: Slide[];
  bgColor: string;
  handleStartNewTask: () => void;
  intendedEditorType: "video" | "interactive demo";
  recordingUrl: string | null;
  handleGoBackToEditor: () => void;
  autoPlayVideo?: boolean;
}

export const PublishedView: React.FC<PublishedViewProps> = ({
  submittedText,
  slides,
  bgColor,
  handleStartNewTask,
  intendedEditorType,
  recordingUrl,
  handleGoBackToEditor,
  autoPlayVideo = false,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const goToPrevious = () => {
    setCurrentSlideIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : prevIndex));
  };

  const goToNext = () => {
    setCurrentSlideIndex((prevIndex) => (prevIndex < slides.length - 1 ? prevIndex + 1 : prevIndex));
  };

  const currentSlide = slides[currentSlideIndex];
  const publishedUrlDisplay = `https://glimpse.show/demo/${Math.random().toString(36).substring(2, 8)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-blue-300 to-blue-400 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <button 
            onClick={handleGoBackToEditor} 
            className="px-6 py-3 bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-xl text-gray-700 hover:bg-opacity-90 flex items-center gap-2 transition-colors shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Editor</span>
          </button>
          <button
            onClick={handleStartNewTask}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center gap-2 transition-colors font-semibold shadow-lg"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Create new</span>
          </button>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-gray-800">Your Glimpse has been published!</h1>
          <p className="text-gray-700 max-w-2xl mx-auto">
            Your interactive demo is now available. Share the link below.
          </p>
        </div>

        <div className="bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-2xl p-8 mb-8 shadow-lg">
          {intendedEditorType === 'video' && recordingUrl ? (
            <div className="relative w-full aspect-video bg-black rounded-xl shadow-xl overflow-hidden flex items-center justify-center mb-6">
              <video src={recordingUrl} controls autoPlay={autoPlayVideo} className="absolute inset-0 w-full h-full" />
            </div>
          ) : (
            <>
              <div className="relative w-full aspect-video bg-white bg-opacity-80 backdrop-blur-md rounded-xl shadow-xl overflow-hidden flex items-center justify-center mb-6">
                {currentSlide && (
                  <Image
                    src={currentSlide.content}
                    alt={currentSlide.title}
                    layout="fill"
                    objectFit="contain"
                    className="absolute inset-0 w-full h-full"
                    priority={true}
                  />
                )}
              </div>

              <div className="flex items-center justify-between w-full">
                <button
                  onClick={goToPrevious}
                  disabled={currentSlideIndex === 0}
                  className="px-4 py-2 bg-white bg-opacity-70 backdrop-blur-sm border border-white border-opacity-40 rounded-xl text-gray-700 hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm transition-colors shadow-lg"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700 bg-white bg-opacity-70 backdrop-blur-sm px-4 py-2 rounded-full border border-white border-opacity-40 shadow-lg">
                  Slide {currentSlideIndex + 1} of {slides.length}
                </span>
                <button
                  onClick={goToNext}
                  disabled={currentSlideIndex === slides.length - 1}
                  className="px-4 py-2 bg-white bg-opacity-70 backdrop-blur-sm border border-white border-opacity-40 rounded-xl text-gray-700 hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm transition-colors shadow-lg"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col items-center mb-8">
          <p className="text-gray-700 mb-3">Share this link with your audience:</p>
          <div className="flex items-center gap-2 w-full max-w-xl">
            <div className="flex-1 bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-l-xl p-3 text-gray-700 overflow-hidden overflow-ellipsis shadow-lg">
              {publishedUrlDisplay}
            </div>
            <button className="bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 border-l-0 rounded-r-xl p-3 text-gray-700 hover:bg-opacity-90 transition-colors shadow-lg">
              <Copy className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button className="px-6 py-3 bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-30 rounded-xl text-gray-700 hover:bg-opacity-90 flex items-center gap-2 transition-colors shadow-lg">
            <Share2 className="w-5 h-5" />
            <span>Share</span>
          </button>
          <button
            onClick={handleStartNewTask}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center gap-2 transition-colors font-semibold shadow-lg"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Create new</span>
          </button>
        </div>
      </div>
    </div>
  );
}; 