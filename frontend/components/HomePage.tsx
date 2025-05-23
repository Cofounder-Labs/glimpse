import React from "react";
import { Sidepanel } from "./Sidepanel";
import { InputForm } from "./InputForm";
import { SuggestedActions } from "./SuggestedActions";
import { PreviousDemosSection } from "./PreviousDemosSection";
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
    <div className="flex h-screen bg-white relative">
      <Sidepanel selectedTeam={selectedTeam} setSelectedTeam={setSelectedTeam} teams={teams} />
      <div className="flex-1 flex flex-col items-center overflow-y-auto">
        <div className="container mx-auto px-4 py-16 flex flex-col items-center w-full">
          <h1 className="text-4xl font-bold text-center mb-8">What are we demoing today?</h1>
          <InputForm 
            inputText={inputText} 
            setInputText={setInputText} 
            handleSubmit={handleSubmit} 
            demoType={demoType} 
            setDemoType={setDemoType}
          />
          <SuggestedActions />
          <PreviousDemosSection previousDemos={previousDemos} />
        </div>
      </div>
      
      {/* Skip Agent Button - Fixed at bottom */}
      {isNonFreeRoam && handleSkipAgent && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
          <button
            type="button"
            onClick={handleSkipAgent}
            className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors bg-white px-4 py-2 rounded-full shadow-lg border"
          >
            Skip agent and go directly to editor with pre-recorded content
          </button>
        </div>
      )}
    </div>
  );
}; 