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
  <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center px-6">
    <div className="max-w-4xl mx-auto">
      <div className="mb-12">
        <div className="flex items-start gap-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex-shrink-0 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl shadow-black/5 border border-gray-200/50">
            <p className="text-gray-900 text-xl font-medium leading-relaxed tracking-tight">{submittedText}</p>
          </div>
        </div>
      </div>
      <LoadingIndicator loadingText={loadingText} loadingDots={loadingDots} />
    </div>
  </div>
); 