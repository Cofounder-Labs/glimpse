import React, { useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronRight, Clock, Grid, Star } from "lucide-react";
import { Team } from "./types";

interface SidepanelProps {
  selectedTeam: Team;
  setSelectedTeam: (team: Team) => void;
  teams: Team[];
}

export const Sidepanel: React.FC<SidepanelProps> = ({
  selectedTeam,
  setSelectedTeam,
  teams,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const recentItems = [
    "API request feature",
    "New Documentation",
    "New dashboard"
  ];

  const handleTeamSelect = async (team: Team) => {
    setSelectedTeam(team);
    setIsDropdownOpen(false);

    if (team.id === "databricks") {
      console.log(`${team.name} team selected. Skipping mock mode API call.`);
      return;
    }

    const teamIndex = teams.findIndex(t => t.id === team.id);
    let mockModeToSet: number | null = null;

    if (teamIndex !== -1) {
      mockModeToSet = teamIndex;
    } else {
      console.error("Selected team not found in the teams list. Cannot set mock mode via API.");
      return;
    }

    if (mockModeToSet === null) {
      console.warn("Could not determine a valid mock_mode to set. API call will be skipped.");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/set-active-mock-mode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mock_mode: mockModeToSet }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(
          `API Error setting mock mode to ${mockModeToSet}:`,
          response.status,
          errorBody
        );
      } else {
        const responseData = await response.json();
        console.log(`Mock mode set to ${mockModeToSet} successfully:`, responseData);
      }
    } catch (error) {
      console.error(`Network or other error setting mock mode to ${mockModeToSet}:`, error);
    }
  };

  return (
    <div className="w-72 bg-gray-50 border-r border-gray-200 h-screen flex flex-col p-4 space-y-3 text-sm relative">
      <div className="mb-4 relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-200 w-full text-left transition-colors"
        >
          <Image
            src={selectedTeam.logo}
            alt={`${selectedTeam.name} logo`}
            width={24}
            height={24}
            className="rounded-full flex-shrink-0 object-contain"
          />
          <span className="font-semibold text-lg flex-grow truncate">{selectedTeam.name}</span>
          <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 py-1">
            {teams.map((team) => (
              <button
                key={team.name}
                onClick={() => handleTeamSelect(team)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 w-full text-left text-sm"
              >
                <Image
                  src={team.logo}
                  alt={`${team.name} logo`}
                  width={20}
                  height={20}
                  className="rounded-full flex-shrink-0 object-contain"
                />
                <span className="flex-grow truncate">{team.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="w-full bg-white border border-gray-300 rounded-lg py-2.5 text-gray-700 hover:bg-gray-100 transition-colors">
        New Chat
      </button>

      <nav className="space-y-1.5">
        <a href="#" className="flex items-center gap-3 px-2 py-1.5 text-gray-600 hover:bg-gray-200 rounded-md">
          <Clock size={18} />
          <span>Recents</span>
        </a>
        <a href="#" className="flex items-center gap-3 px-2 py-1.5 text-gray-600 hover:bg-gray-200 rounded-md">
          <Grid size={18} />
          <span>Projects</span>
        </a>
      </nav>

      <div className="pt-2">
        <a href="#" className="flex items-center justify-between px-2 py-1.5 text-gray-600 hover:bg-gray-200 rounded-md">
          <div className="flex items-center gap-3">
            <Star size={18} />
            <span>Favorite Projects</span>
          </div>
          <ChevronRight size={16} />
        </a>
        <a href="#" className="flex items-center justify-between px-2 py-1.5 text-gray-600 hover:bg-gray-200 rounded-md">
          <div className="flex items-center gap-3">
            <Star size={18} />
            <span>Favorite Chats</span>
          </div>
          <ChevronRight size={16} />
        </a>
      </div>

      <div className="pt-2 flex-grow overflow-y-auto space-y-1 pr-1">
        <div className="flex items-center justify-between px-2 py-1.5 text-gray-600">
          <span className="font-medium">Recent</span>
          <ChevronDown size={16} />
        </div>
        {recentItems.map((item, index) => (
          <a key={index} href="#" className="block px-2 py-1.5 text-gray-500 hover:bg-gray-200 rounded-md truncate">
            {item}
          </a>
        ))}
      </div>
    </div>
  );
}; 