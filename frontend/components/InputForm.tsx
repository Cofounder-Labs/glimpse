import React from "react";
import { Play, Monitor, ArrowRight } from "lucide-react";

interface InputFormProps {
  inputText: string;
  setInputText: (text: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  demoType: "video" | "interactive demo";
  setDemoType: (type: "video" | "interactive demo") => void;
}

export const InputForm: React.FC<InputFormProps> = ({
  inputText,
  setInputText,
  handleSubmit,
  demoType,
  setDemoType,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputText.trim()) {
        handleSubmit(e as any);
      }
    }
  };

  const handleCreateDemo = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      handleSubmit(e);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
        <div className="p-8">
          <textarea
            placeholder="What would you like to demo today?"
            className="w-full outline-none text-gray-900 text-lg resize-none min-h-[80px] placeholder-gray-400 font-light"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
          />
          
          {/* Bottom toolbar with demo type and create button */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
            {/* Left side - Demo type selection */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDemoType("video")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                  demoType === "video"
                    ? "bg-gray-900 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Play className="w-4 h-4" />
                <span className="text-sm font-medium">Video</span>
              </button>
              
              <button
                type="button"
                onClick={() => setDemoType("interactive demo")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                  demoType === "interactive demo"
                    ? "bg-gray-900 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span className="text-sm font-medium">Interactive</span>
              </button>
            </div>
            
            {/* Right side - Create Demo button */}
            <button
              type="button"
              onClick={handleCreateDemo}
              disabled={!inputText.trim()}
              className="bg-black hover:bg-gray-800 text-white font-medium px-6 py-2.5 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md"
            >
              <span>Create Demo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 