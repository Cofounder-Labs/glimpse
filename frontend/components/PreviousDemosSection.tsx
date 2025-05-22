import React from "react";
import { ChevronRight } from "lucide-react";
import { PreviousDemoCard } from "./PreviousDemoCard";
import { Demo } from "./types";

interface PreviousDemosSectionProps {
  previousDemos: Demo[];
}

export const PreviousDemosSection: React.FC<PreviousDemosSectionProps> = ({ previousDemos }) => (
  <div className="w-full max-w-6xl">
    <div className="flex justify-between items-center mb-4">
      <div>
        <h2 className="text-xl font-semibold">Previous Demos</h2>
        <p className="text-gray-500">View your recent demo projects</p>
      </div>
      <button className="flex items-center text-gray-600 hover:text-gray-900">
        <span>View All</span>
        <ChevronRight className="w-4 h-4 ml-1" />
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {previousDemos.map((demo, index) => (
        <PreviousDemoCard key={index} title={demo.title} description={demo.description} image={demo.image} />
      ))}
    </div>
  </div>
); 