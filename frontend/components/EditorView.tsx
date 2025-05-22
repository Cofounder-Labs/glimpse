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
    <div className="h-screen flex flex-col bg-white">
      <div className="border-b flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <button onClick={() => { console.log('EditorView: Back button clicked'); handleGoToHome(); }} className="p-1 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="font-medium">browser-use.com</div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handlePublish} className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800">
            Publish
          </button>
          <button className="p-1 text-gray-600 hover:text-gray-900">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[172px] border-r overflow-y-auto p-3 bg-white">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`mb-3 p-1 rounded-lg cursor-pointer border ${
                activeSlide === index ? "border-black" : "border-gray-200"
              } hover:border-gray-400 transition-colors`}
              onClick={() => setActiveSlide(index)}
            >
              <div className="aspect-video bg-white rounded-md flex items-center justify-center relative overflow-hidden">
                <span className="absolute bottom-1 left-1 text-xs bg-white rounded-full w-5 h-5 flex items-center justify-center border z-10">
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

        <div className="w-80 flex flex-col border-l bg-white">
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div className="mb-6">
                <h3 className="font-medium text-lg mb-4">Design</h3>

                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Theme</span>
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-md">
                      <div className="w-4 h-4 rounded-full bg-black"></div>
                      <span className="text-sm">Glimpse</span>
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Background</span>
                    <div className="flex items-center gap-2">
                      {backgroundColors.map((color) => (
                        <div
                          key={color.name}
                          onClick={() => setSelectedBgColor(color.class)}
                          className={`w-6 h-6 rounded-full cursor-pointer ${color.displayClass} ${
                            selectedBgColor === color.class ? 'ring-2 ring-offset-1 ring-blue-500' : ''
                          }`}
                        ></div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Font</span>
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-md">
                      <span className="text-sm">Inter</span>
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Cursor</span>
                    <div className="flex items-center gap-2">
                      <div className="border rounded-md px-2 py-1 text-xs cursor-pointer hover:bg-gray-50">K</div>
                      <div className="border rounded-md px-2 py-1 text-xs cursor-pointer hover:bg-gray-50">→</div>
                      <div className="border rounded-md px-2 py-1 text-xs cursor-pointer hover:bg-gray-50">••</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Audio</span>
                    <div className="flex items-center gap-2 text-gray-500 cursor-pointer hover:text-gray-700">
                      <span className="text-sm">None</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-medium text-lg mb-4">Content</h3>

                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Slide title</span>
                    <div className="flex items-center gap-2 text-gray-500 cursor-pointer hover:text-gray-700">
                      <span className="text-sm">Edit</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Transitions</span>
                    <div className="flex items-center gap-2 text-gray-500 cursor-pointer hover:text-gray-700">
                      <span className="text-sm">Fade</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t">
            <textarea
              placeholder="Ask Glimpse to edit this slide..."
              className="w-full p-3 border rounded-lg outline-none text-sm resize-none focus:ring-1 focus:ring-black"
              rows={2}
            />
            <div className="flex justify-end mt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors"
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