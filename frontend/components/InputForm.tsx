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
  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mb-8">
      <div className="border rounded-2xl shadow-sm bg-white">
        <div className="p-6">
          <textarea
            placeholder="Ask Glimpse to build..."
            className="w-full outline-none text-gray-700 text-lg resize-none min-h-[100px]"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={3}
          />
        </div>
        <div className="border-t p-3 flex justify-between items-center">
          <div>
            <select
              value={demoType}
              onChange={(e) => setDemoType(e.target.value as "video" | "screenshot")}
              className="w-auto bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-black focus:border-black hover:bg-gray-100 transition-colors"
            >
              <option value="video">Video</option>
              <option value="screenshot">Screenshot</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="p-2 text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
            </button>
            <button
              type="submit"
              className={`p-2 rounded-md ${inputText.trim() ? "bg-black text-white" : "text-gray-500"}`}
              disabled={!inputText.trim()}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}; 