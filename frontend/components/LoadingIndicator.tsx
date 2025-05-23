import React from "react";

interface LoadingIndicatorProps {
  loadingText: string;
  loadingDots: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ loadingText, loadingDots }) => (
  <div className="mb-8">
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-full bg-white bg-opacity-80 flex-shrink-0 flex items-center justify-center shadow-lg backdrop-blur-sm">
        <div className="animate-spin">
          <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
      <div className="bg-white bg-opacity-80 backdrop-blur-sm rounded-2xl p-4 shadow-lg min-w-[300px]">
        <div className="flex items-center">
          <p className="text-gray-700 font-medium">{loadingText}</p>
          <span className="text-blue-600 w-6 inline-block font-semibold">{loadingDots}</span>
        </div>
        <div className="mt-3 w-full bg-blue-100 rounded-full h-2">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full animate-progress shadow-sm"></div>
        </div>
      </div>
    </div>
  </div>
); 