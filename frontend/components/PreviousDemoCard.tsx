import React from "react";
import Image from "next/image";

interface PreviousDemoCardProps {
  title: string;
  description: string;
  image: string;
}

export const PreviousDemoCard: React.FC<PreviousDemoCardProps> = ({
  title,
  description,
  image,
}) => (
  <div className="border rounded-lg overflow-hidden bg-gray-50">
    <div className="h-48 bg-gray-100 flex items-center justify-center">
      <Image
        src={image || "/placeholder.svg"}
        alt={title}
        width={300}
        height={200}
        className="object-cover w-full h-full"
      />
    </div>
    <div className="p-4">
      <h3 className="font-medium text-lg">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
      <div className="mt-3 flex justify-between items-center">
        <span className="text-xs text-gray-400">2 days ago</span>
        <button className="text-xs text-gray-600 hover:text-gray-900 border px-2 py-1 rounded">View</button>
      </div>
    </div>
  </div>
); 