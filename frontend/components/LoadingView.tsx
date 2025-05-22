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
); 