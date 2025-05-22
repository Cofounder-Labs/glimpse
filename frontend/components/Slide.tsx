import React from "react";
import { Slide as SlideType } from "./types";

interface SlideProps {
  slide: SlideType;
  index: number;
  isActive: boolean;
  onClick: () => void;
}

export const Slide: React.FC<SlideProps> = ({
  slide,
  index,
  isActive,
  onClick,
}) => (
  <div
    className={`mb-2 p-1 rounded cursor-pointer border ${isActive ? "border-black" : "border-gray-200"}`}
    onClick={onClick}
  >
    <div className="aspect-video bg-white rounded flex items-center justify-center relative">
      <span className="absolute bottom-1 left-1 text-xs bg-white rounded-full w-5 h-5 flex items-center justify-center">
        {index + 1}
      </span>
      <div className="text-xs text-gray-400">{slide.content}</div>
    </div>
  </div>
); 