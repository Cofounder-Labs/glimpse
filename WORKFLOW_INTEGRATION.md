# Workflow-Use Integration with Glimpse

This document explains how the workflow-use system is integrated with Glimpse to provide workflow recording and execution capabilities.

## Overview

The integration allows users to:
1. **Record workflows** by demonstrating actions in a browser
2. **Save workflows** automatically with generated names
3. **Execute saved workflows** as AI-powered tasks
4. **Seamlessly integrate** workflow execution with the existing demo generation flow

## Architecture

### Frontend Components

#### HomePage Enhancement
- Added toggle between "Create Demo" and "Record Workflow" modes in Free Run
- Only shows workflow options when `selectedTeam.id === "free-run"`
- Maintains existing functionality for other teams

#### WorkflowRecorder Component
- **Recording Section**: Start/stop workflow recording with optional description
- **Execution Section**: Select and run saved workflows with custom prompts
- Real-time status polling during recording
- Automatic refresh of saved workflows list

### Backend Integration

#### New API Endpoints

1. **POST /start-workflow-recording**
   - Starts a new workflow recording session
   - Launches browser with workflow-use extension
   - Returns recording status

2. **GET /workflow-recording-status**
   - Polls current recording status
   - States: "idle", "recording", "completed", "failed"

3. **POST /run-saved-workflow**
   - Executes a saved workflow as a demo task
   - Integrates with existing job system
   - Returns job ID for tracking

4. **GET /list-saved-workflows**
   - Lists all saved workflows with metadata
   - Shows name, description, step count, creation date

#### Workflow Services Integration

- **RecordingService**: Handles browser-based workflow recording
- **BuilderService**: Converts recordings to structured workflows
- **Workflow Execution**: Runs saved workflows with prompts or variables

## File Structure

```
glimpse/
├── api/
│   └── app.py                 # Enhanced with workflow endpoints
├── workflow_bridge.py         # Bridge to workflow-use functionality
├── saved_workflows/           # Directory for saved workflow files
│
frontend/
├── components/
│   ├── HomePage.tsx          # Enhanced with workflow toggle
│   └── WorkflowRecorder.tsx  # New workflow recording interface
│
workflow-use-main/            # Workflow-use subproject
├── workflows/                # CLI and core workflow functionality
└── extension/                # Browser extension for recording
```

## Usage Flow

### Recording a Workflow

1. Navigate to Free Run mode in Glimpse
2. Switch to "Record Workflow" tab
3. Optionally enter a description
4. Click "Start Recording Workflow"
5. Browser opens with recording extension
6. Perform the actions you want to record
7. Close browser window to stop recording
8. Workflow is automatically processed and saved

### Running a Saved Workflow

1. In the "Run Saved Workflow" section
2. Select a workflow from the dropdown
3. Enter a task prompt describing what you want to accomplish
4. Click "Run Workflow"
5. System creates a demo job and processes the workflow
6. Results integrate with existing demo editor flow

## Technical Details

### Automatic Workflow Naming
- Workflows are automatically named with timestamp: `recorded_workflow_YYYYMMDD_HHMMSS`
- No manual naming required to streamline the process

### Integration with Demo Flow
- Workflow execution creates job entries compatible with existing demo system
- Jobs can be tracked via WebSocket like regular demo generations
- Results provide artifact paths and interaction data

### Error Handling
- Graceful fallback when workflow-use components are unavailable
- Clear error messages for missing dependencies
- Retry mechanisms for failed recordings

## Setup Requirements

### Dependencies
- workflow-use components (automatically handled by setup script)
- OpenAI API key for LLM-powered workflow building
- Chrome browser for recording

### Installation
1. Run the setup script: `python setup_workflow_integration.py`
2. Ensure OPENAI_API_KEY is set in environment
3. Start Glimpse API server: `python -m glimpse.run`
4. Start frontend: `cd frontend && npm run dev`

## Configuration

### Environment Variables
- `OPENAI_API_KEY`: Required for workflow building and execution
- Standard Glimpse environment variables apply

### Directories
- `saved_workflows/`: Automatically created for storing workflow files
- `workflow-use-main/`: Contains the workflow-use subproject
- Extension build output: `workflow-use-main/extension/.output/chrome-mv3/`

## Troubleshooting

### Common Issues

1. **"Workflow recording functionality is not available"**
   - Run setup script: `python setup_workflow_integration.py`
   - Check that workflow-use-main directory exists
   - Verify OpenAI API key is set

2. **Extension not loading**
   - Ensure extension is built: `cd workflow-use-main/extension && npm run build`
   - Check Chrome allows extensions from unpacked sources

3. **Recording fails to process**
   - Verify OpenAI API key has sufficient credits
   - Check logs for specific error messages
   - Ensure recording actually captured user actions

### Logs
- Backend logs show workflow recording and execution details
- Frontend console shows job status and WebSocket messages
- Extension logs available in browser developer tools

## Future Enhancements

### Planned Features
- Video recording during workflow execution
- Screenshot capture for workflow steps
- Workflow editing interface
- Workflow sharing and templates
- Integration with Browser Use fallback system

### Potential Improvements
- Visual workflow builder
- Workflow versioning
- Batch workflow execution
- Workflow marketplace integration

## Security Considerations

- Workflows may contain sensitive information (passwords, personal data)
- Store workflows securely and limit access appropriately
- Be cautious when sharing or exporting workflow files
- Consider environment isolation for production use 