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
}) => (
  <div className="flex h-screen bg-white">
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
  </div>
); 