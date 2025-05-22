import React from "react";
import Image from "next/image";
import { Slide } from "./types";

interface SlideEditorProps {
  slide: Slide | null;
  bgColor: string;
}

export const SlideEditor: React.FC<SlideEditorProps> = ({ slide, bgColor }) => (
  <div className={`flex-1 ${bgColor} flex items-center justify-center p-4 overflow-auto`}>
    <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl max-h-[85vh] aspect-video flex items-center justify-center relative p-4">
      {slide ? (
        <Image
          src={slide.content}
          alt={slide.title}
          layout="fill"
          objectFit="contain"
        />
      ) : (
        <div className="text-center p-8">
          <h2 className="text-xl text-gray-400 mb-6">Select a slide</h2>
        </div>
      )}
    </div>
  </div>
); 