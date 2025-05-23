import React from "react";
import { Sidepanel } from "./Sidepanel";
import { InputForm } from "./InputForm";
import { Team, Demo } from "./types";

interface HomePageProps {
  inputText: string;
  setInputText: (text: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  previousDemos: Demo[];
  selectedTeam: Team;
  setSelectedTeam: (team: Team) => void;
  teams: Team[];
  demoType: "video" | "screenshot";
  setDemoType: (type: "video" | "screenshot") => void;
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

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-200 via-blue-300 to-blue-400 relative">
      <Sidepanel selectedTeam={selectedTeam} setSelectedTeam={setSelectedTeam} teams={teams} />
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-4xl mx-auto text-center">
          {/* File icon and title */}
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-gray-800 mb-4">Glimpse</h1>
          </div>

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
            <div className="mt-6">
              <button
                type="button"
                onClick={handleSkipAgent}
                className="text-gray-600 hover:text-gray-800 underline transition-colors"
              >
                Skip agent and go directly to editor with pre-recorded content
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 