import React from "react";

interface LoadingIndicatorProps {
  loadingText: string;
  loadingDots: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ loadingText, loadingDots }) => (
  <div className="mb-8">
    <div className="flex items-start gap-6">
      <div className="w-12 h-12 rounded-2xl bg-white/90 backdrop-blur-xl flex-shrink-0 flex items-center justify-center shadow-lg shadow-black/5 border border-gray-200/50">
        <div className="animate-spin">
          <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl shadow-black/5 border border-gray-200/50 min-w-[400px]">
        <div className="flex items-center mb-4">
          <p className="text-gray-900 font-medium text-lg tracking-tight">{loadingText}</p>
          <span className="text-blue-600 w-8 inline-block font-medium ml-1">{loadingDots}</span>
        </div>
        <div className="w-full bg-gray-100/70 rounded-full h-1.5 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full animate-progress shadow-sm"></div>
        </div>
      </div>
    </div>
  </div>
); 