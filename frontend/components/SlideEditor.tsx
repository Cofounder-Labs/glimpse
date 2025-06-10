import React from "react";
import Image from "next/image";
import { Slide } from "./types";

interface SlideEditorProps {
  slide: Slide;
  bgColor: string;
}

export const SlideEditor: React.FC<SlideEditorProps> = ({ slide, bgColor }) => (
  <div className={`flex-1 ${bgColor} flex items-center justify-center p-8 overflow-auto`}>
    <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/10 w-full max-w-6xl max-h-[90vh] aspect-video flex items-center justify-center relative p-6 border border-gray-200/50">
      {slide ? (
        <Image
          src={slide.content}
          alt={slide.title}
          layout="fill"
          objectFit="contain"
          className="rounded-2xl"
        />
      ) : (
        <div className="text-center p-12">
          <h2 className="text-2xl text-gray-400 mb-8 font-medium tracking-tight">Select a slide</h2>
        </div>
      )}
    </div>
  </div>
); 