import React from "react";
import { Sidepanel } from "./Sidepanel";
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

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-200 via-blue-300 to-blue-400 relative">
      <Sidepanel selectedTeam={selectedTeam} setSelectedTeam={setSelectedTeam} teams={teams} />
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-4xl mx-auto text-center">
          {/* File icon and title */}
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-gray-800 mb-4">Glimpse</h1>
          </div>

          {/* Free Run Mode Toggle */}
          {isFreeRun && (
            <div className="mb-6 flex justify-center">
              <div className="bg-white bg-opacity-80 rounded-lg p-1 flex backdrop-blur-sm border border-white border-opacity-20">
                <button
                  type="button"
                  onClick={() => setWorkflowMode("demo")}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                    workflowMode === "demo"
                      ? "bg-blue-500 text-white shadow-md"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  Create Demo
                </button>
                <button
                  type="button"
                  onClick={() => setWorkflowMode("workflow")}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                    workflowMode === "workflow"
                      ? "bg-blue-500 text-white shadow-md"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  Record Workflow
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}; 