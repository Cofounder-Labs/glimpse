import React, { useState } from "react";
import Image from "next/image";
import { ArrowLeft, PlusCircle, Share2, Copy } from "lucide-react";
import { Slide } from "./types";

interface PublishedViewProps {
  submittedText: string;
  slides: Slide[];
  bgColor: string;
  handleStartNewTask: () => void;
  intendedEditorType: "video" | "screenshot";
  recordingUrl: string | null;
  handleGoBackToEditor: () => void;
}

export const PublishedView: React.FC<PublishedViewProps> = ({
  submittedText,
  slides,
  bgColor,
  handleStartNewTask,
  intendedEditorType,
  recordingUrl,
  handleGoBackToEditor,
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
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <button 
            onClick={handleGoBackToEditor} 
            className="px-6 py-3 border rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Editor</span>
          </button>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Your Glimpse has been published!</h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Your interactive demo is now available. Share the link below.
          </p>
        </div>

        <div className={`border rounded-lg p-8 mb-8 ${bgColor}`}>
          {intendedEditorType === 'video' && recordingUrl ? (
            <div className="relative w-full aspect-video bg-black rounded-lg shadow-xl overflow-hidden flex items-center justify-center mb-6">
              <video src={recordingUrl} controls className="absolute inset-0 w-full h-full" />
            </div>
          ) : (
            <>
              <div className="relative w-full aspect-video bg-white/80 backdrop-blur-md rounded-lg shadow-xl overflow-hidden flex items-center justify-center mb-6">
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
            </>
          )}
        </div>

        <div className="flex flex-col items-center mb-8">
          <p className="text-gray-500 mb-3">Share this link with your audience:</p>
          <div className="flex items-center gap-2 w-full max-w-xl">
            <div className="flex-1 bg-white border rounded-l-lg p-3 text-gray-700 overflow-hidden overflow-ellipsis">
              {publishedUrlDisplay}
            </div>
            <button className="bg-gray-100 border border-l-0 rounded-r-lg p-3 text-gray-700 hover:bg-gray-200">
              <Copy className="w-5 h-5" />
            </button>
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
  );
}; 