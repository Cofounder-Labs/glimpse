import React, { useState, useEffect } from "react";
import { Play, Monitor, ArrowRight, Command } from "lucide-react";

interface WorkflowRecordingStatus {
  status: string;
  workflow_name?: string;
  workflow_path?: string;
  error?: string;
  display_name?: string;
  description?: string;
}

interface WorkflowInputField {
  name: string;
  type: string;
  required: boolean;
}

interface SavedWorkflow {
  name: string;
  display_name: string;
  description: string;
  steps: number;
  created_at: string;
  file_path: string;
  input_schema: WorkflowInputField[];
}

export const WorkflowRecorder: React.FC = () => {
  const [recordingStatus, setRecordingStatus] = useState<WorkflowRecordingStatus>({ status: "idle" });
  const [savedWorkflows, setSavedWorkflows] = useState<SavedWorkflow[]>([]);
  const [description, setDescription] = useState("");
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>("");
  const [workflowInputs, setWorkflowInputs] = useState<Record<string, string>>({});
  const [demoType, setDemoType] = useState<"video" | "interactive">("video");
  const [showVariableInput, setShowVariableInput] = useState(false);
  const [recentWorkflowData, setRecentWorkflowData] = useState<SavedWorkflow | null>(null);
  const [isMac, setIsMac] = useState(false);

  // Detect OS for keyboard shortcuts
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
    }
  }, []);

  // Fetch saved workflows on component mount
  useEffect(() => {
    fetchSavedWorkflows();
  }, []);

  // Poll for recording status updates
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (recordingStatus.status === "recording" || recordingStatus.status === "processing") {
      interval = setInterval(async () => {
        try {
          const response = await fetch("http://127.0.0.1:8000/workflow-recording-status");
          if (response.ok) {
            const status = await response.json();
            
            // If recording completed, fetch the workflow details to get the display name
            if (status.status === "completed" && status.workflow_name && !status.display_name) {
              try {
                const workflowsResponse = await fetch("http://127.0.0.1:8000/list-saved-workflows");
                if (workflowsResponse.ok) {
                  const workflowsData = await workflowsResponse.json();
                  const completedWorkflow = workflowsData.workflows?.find(
                    (w: SavedWorkflow) => w.name === status.workflow_name
                  );
                  if (completedWorkflow) {
                    status.display_name = completedWorkflow.display_name;
                    status.description = completedWorkflow.description;
                  }
                }
              } catch (error) {
                console.error("Error fetching workflow display name:", error);
              }
            }
            
            setRecordingStatus(status);
            
            if (status.status === "completed" || status.status === "failed") {
              if (interval) clearInterval(interval);
            }
          }
        } catch (error) {
          console.error("Error polling recording status:", error);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [recordingStatus.status]);

  const fetchSavedWorkflows = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/list-saved-workflows");
      if (response.ok) {
        const data = await response.json();
        setSavedWorkflows(data.workflows || []);
      }
    } catch (error) {
      console.error("Error fetching saved workflows:", error);
    }
  };

  const startRecording = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/start-workflow-recording", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: description.trim() || undefined,
        }),
      });

      if (response.ok) {
        const status = await response.json();
        setRecordingStatus(status);
      } else {
        const errorData = await response.text();
        console.error("Failed to start recording:", errorData);
        alert("Failed to start recording. Please try again.");
      }
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Error starting recording. Please check the console for details.");
    }
  };

  const runWorkflow = async () => {
    if (!selectedWorkflow) {
      alert("Please select a workflow.");
      return;
    }

    // Get the selected workflow's input schema
    const selectedWorkflowData = savedWorkflows.find(w => w.name === selectedWorkflow);
    if (!selectedWorkflowData) {
      alert("Selected workflow not found.");
      return;
    }

    // Validate required inputs
    const missingInputs = selectedWorkflowData.input_schema
      .filter(field => field.required && !workflowInputs[field.name]?.trim())
      .map(field => field.name);

    if (missingInputs.length > 0) {
      alert(`Please fill in the required fields: ${missingInputs.join(", ")}`);
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/run-saved-workflow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflow_name: selectedWorkflow,
          variables: workflowInputs,
        }),
      });

      if (response.ok) {
        const jobData = await response.json();
        console.log("Workflow execution started:", jobData);
        
        // Store the job data in localStorage so the main app can pick it up
        localStorage.setItem('workflow_job_data', JSON.stringify({
          job_id: jobData.job_id,
          workflow_name: selectedWorkflow,
          variables: workflowInputs,
          demo_type: "video" // Workflows now generate video recordings
        }));
        
        // Dispatch a custom event to notify the main app
        window.dispatchEvent(new CustomEvent('workflow_job_started', {
          detail: jobData
        }));
        
        alert(`Workflow execution started! The demo will be available once processing completes.`);
        
        // Clear form
        setSelectedWorkflow("");
        setWorkflowInputs({});
      } else {
        const errorData = await response.text();
        console.error("Failed to run workflow:", errorData);
        alert("Failed to run workflow. Please try again.");
      }
    } catch (error) {
      console.error("Error running workflow:", error);
      alert("Error running workflow. Please check the console for details.");
    }
  };

  const handleRecordWorkflow = () => {
    // Handle recording workflow logic
    startRecording();
  };

  const handleCreateDemoFromRecent = async () => {
    // Create demo from the most recently recorded workflow
    if (!recordingStatus.workflow_name) {
      alert("No recent workflow found. Please record a workflow first.");
      return;
    }

    // First, get the workflow details to check for input variables
    const workflowData = savedWorkflows.find(w => w.name === recordingStatus.workflow_name);
    if (!workflowData) {
      // If not in current list, try to fetch it
      await fetchSavedWorkflows();
      const updatedWorkflowData = savedWorkflows.find(w => w.name === recordingStatus.workflow_name);
      if (!updatedWorkflowData) {
        alert("Workflow not found. Please try again.");
        return;
      }
      setRecentWorkflowData(updatedWorkflowData);
    } else {
      setRecentWorkflowData(workflowData);
    }

    // Check if workflow has required variables
    const workflowToRun = workflowData || recentWorkflowData;
    if (workflowToRun && workflowToRun.input_schema && workflowToRun.input_schema.length > 0) {
      // Show variable input form
      setShowVariableInput(true);
      return;
    }

    // No variables needed, run directly
    await runRecentWorkflow({});
  };

  const runRecentWorkflow = async (variables: Record<string, string>) => {
    try {
      const response = await fetch("http://127.0.0.1:8000/run-saved-workflow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflow_name: recordingStatus.workflow_name,
          variables: variables,
        }),
      });

      if (response.ok) {
        const jobData = await response.json();
        console.log("Demo creation started:", jobData);
        
        // Store the job data in localStorage so the main app can pick it up
        localStorage.setItem('workflow_job_data', JSON.stringify({
          job_id: jobData.job_id,
          workflow_name: recordingStatus.workflow_name,
          variables: variables,
          demo_type: "video"
        }));
        
        // Dispatch a custom event to notify the main app
        window.dispatchEvent(new CustomEvent('workflow_job_started', {
          detail: jobData
        }));
        
        alert(`Demo creation started! The demo will be available once processing completes.`);
        
        // Reset the state
        setRecordingStatus({ status: "idle" });
        setShowVariableInput(false);
        setWorkflowInputs({});
      } else {
        const errorData = await response.text();
        console.error("Failed to create demo:", errorData);
        alert("Failed to create demo. Please try again.");
      }
    } catch (error) {
      console.error("Error creating demo:", error);
      alert("Error creating demo. Please check the console for details.");
    }
  };

  const handleVariableSubmit = () => {
    if (!recentWorkflowData) return;

    // Validate required inputs
    const missingInputs = recentWorkflowData.input_schema
      .filter(field => field.required && !workflowInputs[field.name]?.trim())
      .map(field => field.name);

    if (missingInputs.length > 0) {
      alert(`Please fill in the required fields: ${missingInputs.join(", ")}`);
      return;
    }

    // Run workflow with provided variables
    runRecentWorkflow(workflowInputs);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="grid grid-cols-1 gap-6">
        {/* Record Workflow Panel - Always visible */}
        <div 
          className={`bg-white border border-gray-200 rounded-3xl shadow-sm hover:shadow-md transition-all ${
            recordingStatus.status !== "idle" ? "opacity-75" : ""
          }`}
        >
          <div className="p-8">
            <div className="flex items-center justify-center min-h-[80px]">
                <h3 className="text-xl font-medium text-gray-900">Show Glimpse Your Workflow</h3>
            </div>
            
            {/* Bottom toolbar to match InputForm */}
            <div className="flex items-center justify-end mt-6 pt-6 border-t border-gray-100">
              {/* Right side - Start Recording button */}
              <button
                type="button"
                onClick={recordingStatus.status === "idle" ? handleRecordWorkflow : undefined}
                disabled={recordingStatus.status !== "idle"}
                className="bg-black hover:bg-gray-800 text-white font-medium px-6 py-2.5 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                <span>Start Recording</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Unified Status Panel */}
        {recordingStatus.status !== 'idle' && (
          <div className="relative">
            {/* Connecting line from above */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gray-200" />

            <div className="text-center bg-white border border-gray-200 rounded-3xl shadow-sm p-8 min-h-[124px] flex flex-col justify-center">
              {/* Recording Status */}
              {recordingStatus.status === 'recording' && (
                <>
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-lg font-medium text-gray-800">Recording in progress...</span>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Perform actions in the browser. Close the browser window when done.
                  </p>
                  <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 inline-flex items-center gap-2">
                    <span>Press <kbd className="font-sans font-semibold">{isMac ? '⌘+Q' : 'Ctrl+Q'} in Chromium</kbd> to stop recording.</span>
                  </div>
                </>
              )}

              {/* Processing Status */}
              {recordingStatus.status === 'processing' && (
                <>
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-lg font-medium text-gray-800">Processing workflow...</span>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Building your workflow from the recorded actions.
                  </p>
                </>
              )}
              
              {/* Completed Status */}
              {recordingStatus.status === 'completed' && (
                <p className="text-gray-700 text-base max-w-prose mx-auto">
                  <span className="font-semibold text-gray-900">Workflow Saved</span>
                  {recordingStatus.description ? ` - ${recordingStatus.description}` : (recordingStatus.display_name && ` - ${recordingStatus.display_name}`)}
                </p>
              )}

              {/* Failed Status */}
              {recordingStatus.status === 'failed' && (
                <>
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-4">
                    <strong>Recording failed:</strong> {recordingStatus.error}
                  </div>
                  <button
                    onClick={() => setRecordingStatus({ status: "idle" })}
                    className="bg-black hover:bg-gray-800 text-white font-medium px-6 py-2 rounded-full transition-all"
                  >
                    Try Again
                  </button>
                </>
              )}
            </div>

            {/* Connecting line to below (only on success) */}
            {recordingStatus.status === 'completed' && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gray-200" />
            )}
          </div>
        )}

        {/* Create Demo Panel - Only shows after successful recording */}
        {recordingStatus.status === "completed" && recordingStatus.workflow_name && !showVariableInput && (
          <div 
            className="bg-white border border-gray-200 rounded-3xl shadow-sm hover:shadow-md transition-all"
          >
            <div className="p-8">
              <div className="flex items-center justify-center min-h-[80px]">
                <h3 className="text-xl font-medium text-gray-900">Create Demo From Workflow</h3>
              </div>
            
              {/* Bottom toolbar */}
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
                {/* Left side - Demo type selection */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDemoType("video")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                      demoType === "video"
                        ? "bg-gray-900 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <Play className="w-4 h-4" />
                    <span className="text-sm font-medium">Video</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setDemoType("interactive")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                      demoType === "interactive"
                        ? "bg-gray-900 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                    <span className="text-sm font-medium">Interactive</span>
                  </button>
                </div>
                
                {/* Right side - Create Demo button */}
                <button
                  type="button"
                  onClick={handleCreateDemoFromRecent}
                  className="bg-black hover:bg-gray-800 text-white font-medium px-6 py-2.5 rounded-full transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
                >
                  <span>Create Demo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Variable Input Form - Shows when workflow has variables */}
        {showVariableInput && recentWorkflowData && (
          <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-8">
            <div className="mb-6">
              <h3 className="text-xl font-medium text-gray-900 mb-2">Workflow Variables</h3>
              <p className="text-gray-600">Please provide values for the following variables to run your workflow:</p>
            </div>
            
            <div className="space-y-4 mb-6">
              {recentWorkflowData.input_schema.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.name}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    value={workflowInputs[field.name] || ""}
                    onChange={(e) => setWorkflowInputs(prev => ({
                      ...prev,
                      [field.name]: e.target.value
                    }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all"
                    placeholder={`Enter ${field.name}...`}
                  />
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowVariableInput(false);
                  setWorkflowInputs({});
                }}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleVariableSubmit}
                className="bg-black hover:bg-gray-800 text-white font-medium px-6 py-2.5 rounded-full transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                <span>Create Demo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 