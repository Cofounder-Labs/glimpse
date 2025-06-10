import React from "react";
import Image from "next/image";
import { ArrowLeft, MoreHorizontal, ChevronDown, ChevronRight } from "lucide-react";
import { SlideEditor } from "./SlideEditor";
import { Slide } from "./types";

interface EditorViewProps {
  handlePublish: () => void;
  slides: Slide[];
  activeSlide: number;
  setActiveSlide: (index: number) => void;
  selectedBgColor: string;
  setSelectedBgColor: (color: string) => void;
  handleGoToHome: () => void;
}

export const EditorView: React.FC<EditorViewProps> = ({
  handlePublish,
  slides,
  activeSlide,
  setActiveSlide,
  selectedBgColor,
  setSelectedBgColor,
  handleGoToHome,
}) => {
  const backgroundColors = [
    { name: 'purple', class: 'bg-gradient-to-b from-purple-600 to-purple-200', displayClass: 'bg-purple-200' },
    { name: 'green', class: 'bg-gradient-to-b from-green-500 to-green-200', displayClass: 'bg-green-200' },
    { name: 'orange', class: 'bg-gradient-to-b from-orange-500 to-orange-200', displayClass: 'bg-orange-200' },
    { name: 'black', class: 'bg-black', displayClass: 'bg-black' },
    { name: 'white', class: 'bg-white', displayClass: 'bg-white border' },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="border-b border-gray-200/80 flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <button onClick={() => { console.log('EditorView: Back button clicked'); handleGoToHome(); }} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="font-medium text-gray-900 tracking-tight">Back</div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={handlePublish} className="bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-all duration-200 font-medium tracking-tight shadow-lg shadow-black/10">
            Publish
          </button>
          <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[200px] border-r border-gray-200/80 overflow-y-auto p-4 bg-white/60 backdrop-blur-xl">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`mb-4 p-2 rounded-2xl cursor-pointer border-2 transition-all duration-200 ${
                activeSlide === index ? "border-black shadow-lg shadow-black/10" : "border-gray-200/70 hover:border-gray-300"
              }`}
              onClick={() => setActiveSlide(index)}
            >
              <div className="aspect-video bg-white rounded-xl flex items-center justify-center relative overflow-hidden shadow-sm">
                <span className="absolute bottom-2 left-2 text-xs bg-white rounded-full w-6 h-6 flex items-center justify-center border border-gray-200 z-10 font-medium">
                  {index + 1}
                </span>
                <Image
                  src={slide.content}
                  alt={slide.title}
                  layout="fill"
                  objectFit="contain"
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
          ))}
        </div>

        <SlideEditor slide={slides[activeSlide]} bgColor={selectedBgColor} />

        <div className="w-80 border-l border-gray-200/80 bg-white/60 backdrop-blur-xl flex flex-col">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 tracking-tight">Customize</h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="font-medium text-gray-900 mb-4 tracking-tight">Background</h3>
                <div className="grid grid-cols-3 gap-3">
                  {backgroundColors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedBgColor(color.class)}
                      className={`w-full aspect-square rounded-xl border-2 transition-all duration-200 ${color.displayClass} ${
                        selectedBgColor === color.class ? 'border-black shadow-lg shadow-black/10' : 'border-gray-200 hover:border-gray-400'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200/80">
                <h3 className="font-medium text-gray-900 mb-6 tracking-tight">Content</h3>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">Slide title</span>
                    <div className="flex items-center gap-2 text-gray-500 cursor-pointer hover:text-gray-700 transition-colors">
                      <span className="text-sm font-medium">Edit</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">Transitions</span>
                    <div className="flex items-center gap-2 text-gray-500 cursor-pointer hover:text-gray-700 transition-colors">
                      <span className="text-sm font-medium">Fade</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200/80 mt-auto">
            <textarea
              placeholder="Ask Glimpse to edit this slide..."
              className="w-full p-4 border border-gray-200 rounded-2xl outline-none text-sm resize-none focus:ring-2 focus:ring-black focus:border-black transition-all duration-200 bg-white/80 backdrop-blur-sm"
              rows={3}
            />
            <div className="flex justify-end mt-3">
              <button
                type="button"
                className="px-6 py-2.5 rounded-xl bg-black text-white hover:bg-gray-800 transition-all duration-200 font-medium tracking-tight shadow-lg shadow-black/10"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 