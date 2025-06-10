import React, { useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { InputForm } from "./InputForm";
import { WorkflowRecorder } from "./WorkflowRecorder";
import { Team, Demo } from "./types";

interface HomePageProps {
  inputText: string;
  setInputText: (text: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  previousDemos: Demo[];
  selectedTeam: Team;
  setSelectedTeam: (team: Team) => void;
  teams: Team[];
  demoType: "video" | "interactive demo";
  setDemoType: (type: "video" | "interactive demo") => void;
  handleSkipAgent?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  inputText,
  setInputText,
  handleSubmit,
  previousDemos,
  selectedTeam,
  setSelectedTeam,
  teams,
  demoType,
  setDemoType,
  handleSkipAgent,
}) => {
  const isNonFreeRoam = selectedTeam.id !== "free-run";
  const isFreeRun = selectedTeam.id === "free-run";
  
  // State for workflow mode in free-run
  const [workflowMode, setWorkflowMode] = React.useState<"demo" | "workflow">("demo");
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
    <div className="min-h-screen bg-white">
      {/* Top Navigation Bar */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Team Selection */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-all border border-gray-200 min-h-[50px] bg-white"
              >
                <Image
                  src={selectedTeam.logo}
                  alt={`${selectedTeam.name} logo`}
                  width={24}
                  height={24}
                  className="rounded-full flex-shrink-0 object-contain"
                />
                <span className="font-medium text-gray-900">{selectedTeam.name}</span>
                <ChevronDown size={16} className={`transition-transform text-gray-500 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg z-10 py-2 min-w-[200px]">
                  {teams.map((team) => (
                    <button
                      key={team.name}
                      onClick={() => handleTeamSelect(team)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 w-full text-left text-sm transition-colors"
                    >
                      <Image
                        src={team.logo}
                        alt={`${team.name} logo`}
                        width={20}
                        height={20}
                        className="rounded-full flex-shrink-0 object-contain"
                      />
                      <span className="text-gray-800">{team.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>


          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-4xl mx-auto text-center">
          {/* Title and tagline */}
          <div className="mb-12">
            <h1 className="text-6xl font-light text-gray-900 mb-4 tracking-tight">Glimpse</h1>
            <p className="text-xl text-gray-600 font-light tracking-wide">
              Product Walkthroughs. Auto Made. Self Update.
            </p>
          </div>

          {/* Free Run Mode Toggle */}
          {isFreeRun && (
            <div className="mb-8 flex justify-center">
              <div className="bg-gray-100 rounded-full p-1 flex">
                <button
                  type="button"
                  onClick={() => setWorkflowMode("demo")}
                  className={`px-8 py-3 rounded-full text-sm font-medium transition-all ${
                    workflowMode === "demo"
                      ? "bg-black text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Prompt to Demo
                </button>
                <button
                  type="button"
                  onClick={() => setWorkflowMode("workflow")}
                  className={`px-8 py-3 rounded-full text-sm font-medium transition-all ${
                    workflowMode === "workflow"
                      ? "bg-black text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Workflow to Demo
                </button>
              </div>
            </div>
          )}

          {/* Content based on mode */}
          {isFreeRun && workflowMode === "workflow" ? (
            <WorkflowRecorder />
          ) : (
            <>
              {/* Input Form */}
              <InputForm 
                inputText={inputText} 
                setInputText={setInputText} 
                handleSubmit={handleSubmit} 
                demoType={demoType} 
                setDemoType={setDemoType}
              />

              {/* Skip agent button */}
              {isNonFreeRoam && handleSkipAgent && (
                <div className="mt-8">
                  <button
                    type="button"
                    onClick={handleSkipAgent}
                    className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
                  >
                    Skip agent and go directly to editor with pre-recorded content
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}; 