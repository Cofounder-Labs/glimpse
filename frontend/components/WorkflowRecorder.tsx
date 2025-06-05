import React, { useState, useEffect } from "react";

interface WorkflowRecordingStatus {
  status: string;
  workflow_name?: string;
  workflow_path?: string;
  error?: string;
}

interface WorkflowInputField {
  name: string;
  type: string;
  required: boolean;
}

interface SavedWorkflow {
  name: string;
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

  // Fetch saved workflows on component mount
  useEffect(() => {
    fetchSavedWorkflows();
  }, []);

  // Poll recording status when recording
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recordingStatus.status === "recording") {
      interval = setInterval(async () => {
        try {
          const response = await fetch("http://127.0.0.1:8000/workflow-recording-status");
          if (response.ok) {
            const status = await response.json();
            setRecordingStatus(status);
            
            // If recording completed, refresh saved workflows
            if (status.status === "completed") {
              fetchSavedWorkflows();
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

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Recording Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-white border-opacity-20 backdrop-blur-sm mb-8">
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Record New Workflow</h2>
          
          {recordingStatus.status === "idle" && (
            <>
              <div className="mb-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Workflow Description (Optional)
                </label>
                <input
                  type="text"
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Login to admin panel and create user"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              
              <button
                onClick={startRecording}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold px-8 py-4 rounded-2xl text-lg transition-colors shadow-lg flex items-center justify-center gap-3"
              >
                <div className="w-4 h-4 bg-white rounded-full"></div>
                Start Recording Workflow
              </button>
            </>
          )}
          
          {recordingStatus.status === "recording" && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-lg font-medium text-gray-800">Recording in progress...</span>
              </div>
              <p className="text-gray-600">
                Perform the actions you want to record in the browser. Close the browser window when done.
              </p>
            </div>
          )}
          
          {recordingStatus.status === "completed" && recordingStatus.workflow_name && (
            <div className="text-center">
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                <strong>Recording completed!</strong> Workflow saved as: {recordingStatus.workflow_name}
              </div>
              <button
                onClick={() => {
                  setRecordingStatus({ status: "idle" });
                  setDescription("");
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
              >
                Record Another Workflow
              </button>
            </div>
          )}
          
          {recordingStatus.status === "failed" && (
            <div className="text-center">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <strong>Recording failed:</strong> {recordingStatus.error}
              </div>
              <button
                onClick={() => setRecordingStatus({ status: "idle" })}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Saved Workflows Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-white border-opacity-20 backdrop-blur-sm">
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Run Saved Workflow</h2>
          
          {savedWorkflows.length === 0 ? (
            <p className="text-center text-gray-600">No saved workflows found. Record your first workflow above!</p>
          ) : (
            <>
              <div className="mb-6">
                <label htmlFor="workflow-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Workflow
                </label>
                <select
                  id="workflow-select"
                  value={selectedWorkflow}
                  onChange={(e) => {
                    setSelectedWorkflow(e.target.value);
                    setWorkflowInputs({}); // Clear inputs when workflow changes
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Choose a workflow...</option>
                  {savedWorkflows.map((workflow) => (
                    <option key={workflow.name} value={workflow.name}>
                      {workflow.name} - {workflow.description} ({workflow.steps} steps)
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Dynamic Input Fields */}
              {selectedWorkflow && (() => {
                const selectedWorkflowData = savedWorkflows.find(w => w.name === selectedWorkflow);
                if (!selectedWorkflowData || selectedWorkflowData.input_schema.length === 0) {
                  return (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-600">This workflow doesn't require any inputs.</p>
                    </div>
                  );
                }
                
                return (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Workflow Inputs</h3>
                    {selectedWorkflowData.input_schema.map((field) => (
                      <div key={field.name} className="mb-4">
                        <label htmlFor={`input-${field.name}`} className="block text-sm font-medium text-gray-700 mb-2">
                          {field.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <input
                          type={field.type === 'string' ? 'text' : field.type}
                          id={`input-${field.name}`}
                          value={workflowInputs[field.name] || ''}
                          onChange={(e) => setWorkflowInputs(prev => ({
                            ...prev,
                            [field.name]: e.target.value
                          }))}
                          placeholder={`Enter ${field.name.replace(/_/g, ' ')}`}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          required={field.required}
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}
              
              <button
                onClick={runWorkflow}
                disabled={!selectedWorkflow}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold px-8 py-4 rounded-2xl text-lg transition-colors shadow-lg flex items-center justify-center gap-3"
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-10V7a3 3 0 11-6 0V4h6zM7 7V4a3 3 0 015.196-2.121L16 7h1a3 3 0 110 6h-1l-3.804 4.121A3 3 0 017 14V7z" />
                </svg>
                Run Workflow
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}; 