import React from "react";

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ icon, label }) => (
  <button className="flex items-center gap-2 px-4 py-2 rounded-full border hover:bg-gray-50">
    {icon}
    <span>{label}</span>
  </button>
); 