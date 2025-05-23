import React from "react";
import { LoadingIndicator } from "./LoadingIndicator";

interface LoadingViewProps {
  submittedText: string;
  loadingText: string;
  loadingDots: string;
}

export const LoadingView: React.FC<LoadingViewProps> = ({
  submittedText,
  loadingText,
  loadingDots,
}) => (
  <div className="h-screen bg-gradient-to-br from-blue-200 via-blue-300 to-blue-400 flex items-center justify-center">
    <div className="max-w-3xl mx-auto p-8">
      <div className="mb-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex-shrink-0 flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
          </div>
          <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <p className="text-gray-800 text-lg">{submittedText}</p>
          </div>
        </div>
      </div>
      <LoadingIndicator loadingText={loadingText} loadingDots={loadingDots} />
    </div>
  </div>
); 