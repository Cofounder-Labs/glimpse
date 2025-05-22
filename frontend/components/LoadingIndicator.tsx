import React from "react";

interface LoadingIndicatorProps {
  loadingText: string;
  loadingDots: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ loadingText, loadingDots }) => (
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
); 