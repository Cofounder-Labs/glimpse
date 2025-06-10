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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <button 
            onClick={handleGoBackToEditor} 
            className="px-6 py-3 bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl text-gray-700 hover:bg-white hover:border-gray-300 flex items-center gap-3 transition-all duration-200 shadow-xl shadow-black/5"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium tracking-tight">Back to Editor</span>
          </button>
          <button
            onClick={handleStartNewTask}
            className="px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-2xl flex items-center gap-3 transition-all duration-200 font-medium shadow-xl shadow-black/10 tracking-tight"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Create new</span>
          </button>
        </div>

        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 text-gray-900 tracking-tight">Your Glimpse has been published!</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto font-medium leading-relaxed">
            Your interactive demo is now available. Share the link below with your audience.
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl p-10 mb-12 shadow-2xl shadow-black/5">
          {intendedEditorType === 'video' && recordingUrl ? (
            <div className="relative w-full aspect-video bg-black rounded-2xl shadow-2xl shadow-black/20 overflow-hidden flex items-center justify-center mb-8">
              <video src={recordingUrl} controls autoPlay={autoPlayVideo} className="absolute inset-0 w-full h-full rounded-2xl" />
            </div>
          ) : (
            <>
              <div className="relative w-full aspect-video bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/10 overflow-hidden flex items-center justify-center mb-8 border border-gray-200/30">
                {currentSlide && (
                  <Image
                    src={currentSlide.content}
                    alt={currentSlide.title}
                    layout="fill"
                    objectFit="contain"
                    className="absolute inset-0 w-full h-full rounded-2xl"
                    priority={true}
                  />
                )}
              </div>

              <div className="flex items-center justify-between w-full">
                <button
                  onClick={goToPrevious}
                  disabled={currentSlideIndex === 0}
                  className="px-6 py-3 bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl text-gray-700 hover:bg-white hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-200 shadow-xl shadow-black/5 font-medium"
                >
                  Previous
                </button>
                <span className="text-gray-700 bg-white/80 backdrop-blur-xl px-6 py-3 rounded-2xl border border-gray-200/50 shadow-xl shadow-black/5 font-medium">
                  Slide {currentSlideIndex + 1} of {slides.length}
                </span>
                <button
                  onClick={goToNext}
                  disabled={currentSlideIndex === slides.length - 1}
                  className="px-6 py-3 bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl text-gray-700 hover:bg-white hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-200 shadow-xl shadow-black/5 font-medium"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col items-center mb-12">
          <p className="text-gray-700 mb-4 text-lg font-medium">Share this link with your audience:</p>
          <div className="flex items-center gap-0 w-full max-w-2xl">
            <div className="flex-1 bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-l-2xl p-4 text-gray-700 overflow-hidden overflow-ellipsis shadow-xl shadow-black/5 font-medium">
              {publishedUrlDisplay}
            </div>
            <button className="bg-white/80 backdrop-blur-xl border border-gray-200/50 border-l-0 rounded-r-2xl p-4 text-gray-700 hover:bg-white hover:border-gray-300 transition-all duration-200 shadow-xl shadow-black/5">
              <Copy className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex justify-center gap-6">
          <button className="px-8 py-4 bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl text-gray-700 hover:bg-white hover:border-gray-300 flex items-center gap-3 transition-all duration-200 shadow-xl shadow-black/5 font-medium tracking-tight">
            <Share2 className="w-5 h-5" />
            <span>Share</span>
          </button>
          <button
            onClick={handleStartNewTask}
            className="px-8 py-4 bg-black hover:bg-gray-800 text-white rounded-2xl flex items-center gap-3 transition-all duration-200 font-medium shadow-xl shadow-black/10 tracking-tight"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Create new</span>
          </button>
        </div>
      </div>
    </div>
  );
}; 