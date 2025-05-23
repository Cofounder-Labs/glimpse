import React from "react";

interface InputFormProps {
  inputText: string;
  setInputText: (text: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  demoType: "video" | "screenshot";
  setDemoType: (type: "video" | "screenshot") => void;
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

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-white border-opacity-20 backdrop-blur-sm">
        <div className="p-8">
          <textarea
            placeholder="What would you like to demo today?"
            className="w-full outline-none text-gray-700 text-lg resize-none min-h-[200px] placeholder-gray-400"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={8}
          />
        </div>
      </div>
      
      {/* Continue Button */}
      <div className="mt-8 flex justify-center">
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-12 py-4 rounded-2xl text-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
          disabled={!inputText.trim()}
        >
          Create Demo
          <svg 
            className="w-5 h-5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Demo type selector - moved below and simplified */}
      <div className="mt-6 flex justify-center">
        <select
          value={demoType}
          onChange={(e) => setDemoType(e.target.value as "video" | "screenshot")}
          className="bg-white bg-opacity-80 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:bg-opacity-100 transition-all backdrop-blur-sm"
        >
          <option value="video">Video</option>
          <option value="screenshot">Screenshot</option>
        </select>
      </div>
    </form>
  );
}; 