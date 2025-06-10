import React, { useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
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
    <div className="w-72 bg-gray-50 border-r border-gray-200 h-screen flex flex-col p-6 space-y-4 relative">
      {/* Team Selection */}
      <div className="mb-6 relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-start gap-3 p-4 rounded-2xl hover:bg-white hover:shadow-sm w-full text-left transition-all border border-gray-200 min-h-[60px] bg-white"
        >
          <Image
            src={selectedTeam.logo}
            alt={`${selectedTeam.name} logo`}
            width={28}
            height={28}
            className="rounded-full flex-shrink-0 object-contain mt-1"
          />
          <span className="font-medium text-lg flex-grow text-gray-900 leading-tight">{selectedTeam.name}</span>
          <ChevronDown size={18} className={`transition-transform text-gray-500 flex-shrink-0 mt-1 ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg z-10 py-2">
            {teams.map((team) => (
              <button
                key={team.name}
                onClick={() => handleTeamSelect(team)}
                className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 w-full text-left text-sm transition-colors min-h-[48px]"
              >
                <Image
                  src={team.logo}
                  alt={`${team.name} logo`}
                  width={24}
                  height={24}
                  className="rounded-full flex-shrink-0 object-contain mt-0.5"
                />
                <span className="flex-grow text-gray-800 leading-tight">{team.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New Chat Button */}
      <button className="w-full bg-black hover:bg-gray-800 text-white font-medium rounded-full py-3 px-4 transition-all shadow-sm hover:shadow-md">
        New Chat
      </button>
    </div>
  );
}; 