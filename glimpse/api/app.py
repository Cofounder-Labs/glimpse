from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Set
import json
import os
import sys
from pathlib import Path
from .agent import execute_agent
import asyncio
from datetime import datetime
import subprocess
import time
import requests # Added for launch_chrome_with_debugging
import logging
from fastapi.staticfiles import StaticFiles # Added for serving static files
from .auth_manager import auth_manager

# Add workflow-use integration
workflow_use_path = Path(__file__).parent.parent.parent / "workflow-use-main" / "workflows"
if workflow_use_path.exists():
    sys.path.insert(0, str(workflow_use_path))

try:
    from workflow_use.recorder.service import RecordingService
    from workflow_use.builder.service import BuilderService
    from workflow_use import Workflow
    from langchain_openai import ChatOpenAI
    WORKFLOW_USE_AVAILABLE = True
    
    # Initialize workflow services
    try:
        llm_instance = ChatOpenAI(model='gpt-4o')
        workflow_builder_service = BuilderService(llm=llm_instance)
        workflow_recording_service = RecordingService()
    except Exception as e:
        logging.warning(f"Failed to initialize workflow services: {e}")
        workflow_builder_service = None
        workflow_recording_service = None
except ImportError:
    logging.warning("workflow-use not found. Workflow recording functionality will be disabled.")
    WORKFLOW_USE_AVAILABLE = False
    workflow_builder_service = None
    workflow_recording_service = None

# Set up logging if not already configured at a higher level
logger = logging.getLogger(__name__)
if not logger.hasHandlers(): # Avoid adding multiple handlers if already configured
    logging.basicConfig(level=logging.INFO) # Or logging.DEBUG for more verbosity

def _generate_workflow_name(description: Optional[str], timestamp: str) -> str:
    """Generate a meaningful workflow name from description."""
    if not description or not description.strip():
        return f"recorded_workflow_{timestamp}"
    
    # Clean the description: remove special characters, limit length
    import re
    clean_name = re.sub(r'[^a-zA-Z0-9\s\-_]', '', description.strip())
    clean_name = re.sub(r'\s+', '_', clean_name)  # Replace spaces with underscores
    clean_name = clean_name[:50]  # Limit length to 50 characters
    
    # Remove leading/trailing underscores
    clean_name = clean_name.strip('_')
    
    # If cleaning resulted in empty string, fall back to default
    if not clean_name:
        return f"recorded_workflow_{timestamp}"
    
    return f"{clean_name}_{timestamp}"

def _generate_display_name(workflow_name: str, description: str) -> str:
    """Generate a user-friendly display name for the workflow."""
    # If we have a meaningful description, use it as the display name
    if description and description.strip():
        return description.strip()
    
    # If no description, convert the workflow name back to a readable format
    # Remove timestamp suffix if present (format: name_YYYYMMDD_HHMMSS)
    import re
    clean_name = re.sub(r'_\d{8}_\d{6}$', '', workflow_name)
    
    # Replace underscores with spaces and title case
    if clean_name and clean_name != "recorded_workflow":
        return clean_name.replace('_', ' ').title()
    
    # Fallback to original name if all else fails
    return workflow_name.replace('_', ' ').title()

app = FastAPI(title="Glimpse API", description="API for generating and managing interactive demos")

# CORS Middleware Configuration
origins = [
    "*",  # Allows all origins
    # You can be more specific in production, e.g.:
    # "http://localhost:3000", # If your frontend runs on port 3000
    # "https://your-frontend-domain.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, # Allows cookies to be included in requests
    allow_methods=["*"],  # Allows all methods (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Mount static files directory for recordings
# This assumes 'recordings' directory is at the same level as the 'glimpse' directory (project root)
# If glimpse/api/app.py is run from project_root, then Path("recordings").resolve() works.
# If run from glimpse/api, then Path("../recordings").resolve() might be needed or an absolute path.
# For simplicity, assuming project_root/recordings structure and app is run from project_root.
recordings_dir = Path(__file__).resolve().parent.parent.parent / "recordings"
if not recordings_dir.exists():
    recordings_dir.mkdir(parents=True, exist_ok=True)
app.mount("/recordings", StaticFiles(directory=recordings_dir), name="recordings")

# Mount frontend/public directory for pre-recorded demo videos
public_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "public"
if public_dir.exists():
    app.mount("/public", StaticFiles(directory=public_dir), name="public")
    logger.info(f"Mounted public directory: {public_dir}")
else:
    logger.warning(f"Public directory not found: {public_dir}")

# In-memory job store and WebSocket connections
job_store: Dict[str, Dict] = {}
active_connections: Dict[str, Set[WebSocket]] = {}

# Global variable to store the browser instance or connection details (legacy)
# Note: browser configuration is now handled by AuthManager
browser_details = {}

# Variable to store the active mock mode, settable by an endpoint
ACTIVE_MOCK_MODE: Optional[int] = None

# Workflow recording state
workflow_recording_status = {"status": "idle"}
workflow_recording_task: Optional[asyncio.Task] = None
workflow_recordings_dir = Path(__file__).resolve().parent.parent.parent / "saved_workflows"
if not workflow_recordings_dir.exists():
    workflow_recordings_dir.mkdir(parents=True, exist_ok=True)

# Define different mock tasks
MOCK_TASK_1 = """
Go to https://browser-use.com
Click on docs link https://docs.browser-use.com/
Click on the Cloud API button
Under API v1.0, click on the 'Get Task Status' button
Click on the "Try it" button
Stop
"""
MOCK_TASK_2 = """
Go to https://github.com/
Click on the glimpse repository on the left hand panel
Click on Issues tab
Click on the New issue button
Stop
"""
MOCK_TASK_3 = """
Go to https://app.storylane.io
Click on the Create demo button on the top right
Then click on the upload screens manually button
Then click on the upload/Drag and drop
Stop
"""
MOCK_TASK_4 = """
Go to http://localhost:3000/
On the top left corner in the left hand panel, click the drop down menu that says "free run" and select databricks, now the selection will read databricks, that's it
Type in the following prompt in the text box that says "What would you like to demo today?": 'Generate a demo to show users how they can create a new workflow on databricks by ingesting data from salesforce'
Click on the create demo button
Once the page loads, click on the publish button on the top right
Scroll down and click on the share button
Stop
"""
MOCK_TASK_5 = """
Stop
"""

@app.on_event("startup")
async def startup_event():
    """Initialize the application on startup"""
    # Authentication is handled by AuthManager when browser sessions are created
    # No need to launch Chrome manually - browser-use handles this internally
    print("✅ Glimpse API server started successfully")
    print("🔧 Authentication configured via AuthManager")
    print("🎯 Browser sessions will use saved login data automatically")

class DemoRequest(BaseModel):
    nl_task: str
    root_url: str
    demo_type: str = "video"  # "video" or "screenshot"

class SetMockModeRequest(BaseModel):
    mock_mode: Optional[int] # e.g., 1 for MOCK_TASK_1, 2 for MOCK_TASK_2, etc. None to disable.

class DemoStatus(BaseModel):
    job_id: str
    status: str
    progress: float
    steps: Optional[List[Dict]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    artifact_path: Optional[str] = None  # Add new field for artifact path
    screenshots: Optional[List[str]] = None # Add new field for screenshots list
    interactions: Optional[List[Dict]] = None # Add new field for interactions data
    recording_path: Optional[str] = None # New field for recording path
    click_data: Optional[List[Dict]] = None # New field for click tracking data

class BoundingBox(BaseModel):
    x: float      # x-coordinate as percentage of page width (0.0 to 1.0)
    y: float      # y-coordinate as percentage of page height (0.0 to 1.0)
    width: float  # width as percentage of page width (0.0 to 1.0)
    height: float # height as percentage of page height (0.0 to 1.0)

    @validator('x', 'width')
    def validate_x_and_width(cls, v):
        if not 0.0 <= v <= 1.0:
            raise ValueError('x and width must be between 0.0 and 1.0')
        return v

    @validator('y', 'height')
    def validate_y_and_height(cls, v):
        if not 0.0 <= v <= 1.0:
            raise ValueError('y and height must be between 0.0 and 1.0')
        return v

    def to_absolute_coordinates(self, page_width: int, page_height: int) -> dict:
        """Convert relative coordinates to absolute pixel values for a given page size."""
        return {
            'x': int(self.x * page_width),
            'y': int(self.y * page_height),
            'width': int(self.width * page_width),
            'height': int(self.height * page_height)
        }

class ClickPosition(BaseModel):
    bounding_box: BoundingBox
    page_width: int  # Store original page dimensions for reference
    page_height: int

class DemoStep(BaseModel):
    click_position: ClickPosition
    click_label: str
    element_selector: str
    url: str

# Workflow recording models
class WorkflowRecordingRequest(BaseModel):
    description: Optional[str] = None  # Optional description for the workflow

class WorkflowRecordingStatus(BaseModel):
    status: str  # "recording", "completed", "failed", "idle"
    workflow_name: Optional[str] = None
    workflow_path: Optional[str] = None
    error: Optional[str] = None

class RunWorkflowRequest(BaseModel):
    workflow_name: str
    prompt: Optional[str] = None  # For running workflow as tool
    variables: Optional[dict] = None  # For running with predefined variables

# Mock mode configuration
MOCK_MODE = os.getenv("MOCK_MODE", "false").lower() == "true"

@app.post("/set-active-mock-mode")
async def set_active_mock_mode(request: SetMockModeRequest):
    global ACTIVE_MOCK_MODE
    if request.mock_mode is not None and not (0 <= request.mock_mode <= 5):
        raise HTTPException(status_code=400, detail="Invalid mock_mode. Must be between 0 and 5, or null.")
    ACTIVE_MOCK_MODE = request.mock_mode
    return {"message": f"Active mock mode set to: {ACTIVE_MOCK_MODE if ACTIVE_MOCK_MODE is not None else 'None (disabled)'}"}

@app.post("/start-workflow-recording", response_model=WorkflowRecordingStatus)
async def start_workflow_recording(request: WorkflowRecordingRequest):
    """Start recording a new workflow"""
    global workflow_recording_status, workflow_recording_task
    
    if not WORKFLOW_USE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Workflow recording functionality is not available")
    
    if workflow_recording_status["status"] == "recording":
        raise HTTPException(status_code=400, detail="A workflow recording is already in progress")
    
    # Reset status
    workflow_recording_status = {"status": "recording", "workflow_name": None, "workflow_path": None, "error": None}
    
    # Start recording task
    workflow_recording_task = asyncio.create_task(
        _perform_workflow_recording(request.description)
    )
    
    return WorkflowRecordingStatus(**workflow_recording_status)

@app.get("/workflow-recording-status", response_model=WorkflowRecordingStatus)
async def get_workflow_recording_status():
    """Get the current status of workflow recording"""
    return WorkflowRecordingStatus(**workflow_recording_status)

@app.post("/run-saved-workflow", response_model=DemoStatus)
async def run_saved_workflow(request: RunWorkflowRequest, background_tasks: BackgroundTasks):
    """Run a saved workflow as a demo generation task"""
    if not WORKFLOW_USE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Workflow functionality is not available")
    
    workflow_path = workflow_recordings_dir / f"{request.workflow_name}.workflow.json"
    if not workflow_path.exists():
        raise HTTPException(status_code=404, detail=f"Workflow '{request.workflow_name}' not found")
    
    job_id = f"workflow_job_{datetime.now().timestamp()}"
    
    job_store[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "progress": 0.0,
        "created_at": datetime.now(),
        "completed_at": None,
        "error": None
    }
    
    # Run workflow as a background task
    background_tasks.add_task(
        process_workflow_execution_task, 
        job_id, 
        str(workflow_path),
        request.prompt,
        request.variables
    )
    
    return DemoStatus(**job_store[job_id])

@app.get("/list-saved-workflows")
async def list_saved_workflows():
    """List all saved workflows"""
    if not WORKFLOW_USE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Workflow functionality is not available")
    
    workflows = []
    for workflow_file in workflow_recordings_dir.glob("*.workflow.json"):
        try:
            with open(workflow_file, 'r') as f:
                workflow_data = json.load(f)
            
            # Extract the workflow name by removing both .workflow and .json extensions
            workflow_name = workflow_file.name.replace('.workflow.json', '')
            
            # Generate a user-friendly display name
            display_name = _generate_display_name(workflow_name, workflow_data.get("description", ""))
            
            workflows.append({
                "name": workflow_name,
                "display_name": display_name,
                "description": workflow_data.get("description", ""),
                "steps": len(workflow_data.get("steps", [])),
                "created_at": workflow_data.get("created_at", ""),
                "file_path": str(workflow_file),
                "input_schema": workflow_data.get("input_schema", [])
            })
        except Exception as e:
            logger.error(f"Error reading workflow file {workflow_file}: {e}")
    
    return {"workflows": workflows}

async def notify_job_completion(job_id: str, status: str):
    """Notify connected WebSocket clients about job completion."""
    if job_id in active_connections:
        # Include full job data in the message, not just status
        job_data = job_store.get(job_id, {})
        message = {
            "job_id": job_id, 
            "status": status,
            "recording_path": job_data.get("recording_path"),
            "artifact_path": job_data.get("artifact_path"),
            "screenshots": job_data.get("screenshots"),
            "interactions": job_data.get("interactions"),
            "progress": job_data.get("progress"),
            "error": job_data.get("error"),
            "click_data": job_data.get("click_data")
        }
        # Use a list comprehension to avoid issues with modifying the set while iterating
        connections_to_notify = list(active_connections[job_id])
        for connection in connections_to_notify:
            try:
                await connection.send_json(message)
            except RuntimeError: # Connection might be closed
                active_connections[job_id].remove(connection)
        if not active_connections[job_id]: # Clean up if no connections left
            del active_connections[job_id]

async def process_demo_task(job_id: str, nl_task: str, root_url: str, demo_type: str = "video"):
    """Background task to process the demo generation"""
    global ACTIVE_MOCK_MODE # Ensure we are using the global variable
    final_status = "failed" # Default to failed
    agent_result = {} # Initialize agent_result
    try:
        job_store[job_id]["status"] = "processing"
        job_store[job_id]["progress"] = 0.1 # Initial progress

        task_to_execute = nl_task
        current_root_url = root_url
        mode_message = "--- Running in standard mode (user-provided task) ---"

        # 1. Check API-set active mock mode first
        if ACTIVE_MOCK_MODE is not None:
            if ACTIVE_MOCK_MODE == 0:  # Free Run mode
                mode_message = "--- Running in FREE RUN mode ---"
                task_to_execute = nl_task  # Use the provided task directly
                current_root_url = ""  # Empty root URL for free run
            elif ACTIVE_MOCK_MODE == 1:
                mode_message = "--- Running in MOCK MODE 1 (API triggered) ---"
                task_to_execute = MOCK_TASK_1
                current_root_url = "https://browser-use.com"
            elif ACTIVE_MOCK_MODE == 2:
                mode_message = "--- Running in MOCK MODE 2 (API triggered) ---"
                task_to_execute = MOCK_TASK_2
                current_root_url = "https://browser-use.com" # Assuming same root for MOCK_TASK_2
            elif ACTIVE_MOCK_MODE == 3:
                mode_message = "--- Running in MOCK MODE 3 (API triggered) ---"
                task_to_execute = MOCK_TASK_3
                current_root_url = "https://wikipedia.org"
            elif ACTIVE_MOCK_MODE == 4:
                mode_message = "--- Running in MOCK MODE 4 (API triggered) ---"
                task_to_execute = MOCK_TASK_4
                current_root_url = "http://localhost:3000/" # Corrected based on MOCK_TASK_4 content
            elif ACTIVE_MOCK_MODE == 5:
                mode_message = "--- Running in MOCK MODE 5 (API triggered) ---" # Corrected message
                task_to_execute = MOCK_TASK_5 # Corrected task
                current_root_url = "http://localhost:3000/" # Set root URL for MOCK_TASK_5
        else:
            # 2. Fallback to environment variable mock modes if API mode is not set
            if os.getenv("MOCK_MODE0", "false").lower() == "true":  # Free Run mode
                mode_message = "--- Running in FREE RUN mode (ENV var) ---"
                task_to_execute = nl_task  # Use the provided task directly
                current_root_url = ""  # Empty root URL for free run
            elif os.getenv("MOCK_MODE1", "false").lower() == "true":
                mode_message = "--- Running in MOCK MODE 1 (ENV var) ---"
                task_to_execute = MOCK_TASK_1
                current_root_url = "https://browser-use.com"
            elif os.getenv("MOCK_MODE2", "false").lower() == "true":
                mode_message = "--- Running in MOCK MODE 2 (ENV var) ---"
                task_to_execute = MOCK_TASK_2
                current_root_url = "https://browser-use.com" # Assuming same root
            elif os.getenv("MOCK_MODE3", "false").lower() == "true":
                mode_message = "--- Running in MOCK MODE 3 (ENV var) ---"
                task_to_execute = MOCK_TASK_3
                current_root_url = "https://wikipedia.org"
            elif os.getenv("MOCK_MODE4", "false").lower() == "true":
                mode_message = "--- Running in MOCK MODE 4 (ENV var) ---"
                task_to_execute = MOCK_TASK_4
                current_root_url = "http://localhost:3000/" # Corrected based on MOCK_TASK_4 content
            elif os.getenv("MOCK_MODE5", "false").lower() == "true":
                mode_message = "--- Running in MOCK MODE 5 (ENV var) ---"
                task_to_execute = MOCK_TASK_5
                current_root_url = "http://localhost:3000/"

        print(mode_message)
        
        # Determine current mock mode for later use
        current_mock_mode = None
        if ACTIVE_MOCK_MODE is not None and ACTIVE_MOCK_MODE != 0:
            current_mock_mode = ACTIVE_MOCK_MODE
        else:
            # Check environment variables for mock modes
            for mode_num in range(1, 6):
                if os.getenv(f"MOCK_MODE{mode_num}", "false").lower() == "true":
                    current_mock_mode = mode_num
                    break
        
        # Always execute the agent to get screenshots, interactions, etc.
        # Pass job_id and demo_type to execute_agent
        agent_result = await execute_agent(task_to_execute, current_root_url, job_id, browser_details=browser_details, demo_type=demo_type)

        final_status = "completed"
        job_update_payload = {
            "status": final_status,
            "progress": 1.0,
            "completed_at": datetime.now()
        }

        # Consolidate agent result processing
        if isinstance(agent_result, dict):
            if agent_result.get("artifact_path"):
                job_update_payload["artifact_path"] = agent_result["artifact_path"]
            if agent_result.get("screenshots"):
                job_update_payload["screenshots"] = agent_result["screenshots"]
            if agent_result.get("interactions"):
                job_update_payload["interactions"] = agent_result["interactions"]
            if agent_result.get("click_data"):
                job_update_payload["click_data"] = agent_result["click_data"]
            
            # Handle recording path - first check for pre-recorded videos, then use agent result
            agent_video_url = None
            recording_dir_abs_path = agent_result.get("recording_dir_absolute_path")
            actual_video_filename = agent_result.get("actual_video_filename")

            if recording_dir_abs_path and actual_video_filename:
                # The job_specific_part for the URL is the name of the job's recording directory
                job_specific_folder_name = Path(recording_dir_abs_path).name 
                agent_video_url = f"/recordings/{job_specific_folder_name}/{actual_video_filename}"
                logger.info(f"Agent generated recording for job {job_id} available at URL: {agent_video_url}")
            elif recording_dir_abs_path:
                # If we have the dir but no specific file, log it. Frontend might not get a video.
                logger.warning(f"Recording directory for job {job_id} exists at {recording_dir_abs_path}, but no video filename was found by agent.")
            
            # Check for pre-recorded videos for non-free-run modes and video demo type
            prerecorded_video_url = None
            if current_mock_mode and demo_type == "video":
                folder_name = get_mock_mode_folder(current_mock_mode)
                prerecorded_video_url = find_prerecorded_video(folder_name)
            
            # Prioritize pre-recorded video over agent-generated video
            if prerecorded_video_url:
                job_update_payload["recording_path"] = prerecorded_video_url
                logger.info(f"Using pre-recorded video for mock mode {current_mock_mode}: {prerecorded_video_url}")
            elif agent_video_url:
                job_update_payload["recording_path"] = agent_video_url
                logger.info(f"Using agent-generated video for job {job_id}: {agent_video_url}")
            # else: No recording path available

        # Specific logging for Free Run mode artifacts, if still desired
        if ACTIVE_MOCK_MODE == 0: 
            if agent_result.get("artifact_path") and agent_result.get("screenshots"):
                logger.info(f"Free Run artifacts for job {job_id}: {agent_result['artifact_path']}, {len(agent_result['screenshots'])} screenshots")
            # else:
            #     logger.warning(f"Free Run mode for job {job_id} completed but no artifact path or screenshots found in agent result.")
            if agent_result.get("interactions"):
                logger.info(f"Free Run interactions for job {job_id}: {len(agent_result['interactions'])} interactions recorded.")

        job_store[job_id].update(job_update_payload)

    except Exception as e:
        logger.error(f"Error processing job {job_id}: {e}", exc_info=True)
        job_store[job_id].update({
            "status": "failed", # Explicitly set failed on exception
            "progress": 0.0,
            "error": str(e),
            "completed_at": datetime.now()
        })
    finally:
        await notify_job_completion(job_id, job_store.get(job_id, {}).get("status", final_status))

@app.post("/generate-demo", response_model=DemoStatus)
async def generate_demo(request: DemoRequest, background_tasks: BackgroundTasks):
    job_id = f"job_{datetime.now().timestamp()}"
    
    job_store[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "progress": 0.0,
        "created_at": datetime.now(),
        "completed_at": None,
        "error": None
    }
    
    background_tasks.add_task(process_demo_task, job_id, request.nl_task, request.root_url, request.demo_type)
    
    return DemoStatus(**job_store[job_id])

@app.get("/demo-status/{job_id}", response_model=DemoStatus)
async def get_demo_status(job_id: str):
    if job_id not in job_store:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return DemoStatus(**job_store[job_id])

@app.websocket("/ws/job-status/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    await websocket.accept()
    logger.info(f"WebSocket connection accepted for job {job_id}")
    
    if job_id not in active_connections:
        active_connections[job_id] = set()
    active_connections[job_id].add(websocket)
    
    try:
        # Send current job status immediately upon connection
        if job_id in job_store:
            current_status = job_store[job_id]
            message = {
                "job_id": job_id,
                "status": current_status.get("status", "unknown"),
                "progress": current_status.get("progress", 0),
                "recording_path": current_status.get("recording_path"),
                "artifact_path": current_status.get("artifact_path"),
                "screenshots": current_status.get("screenshots"),
                "interactions": current_status.get("interactions"),
                "error": current_status.get("error"),
                "click_data": current_status.get("click_data")
            }
            await websocket.send_json(message)
            logger.info(f"Sent initial status to WebSocket for job {job_id}: {current_status.get('status', 'unknown')}")
        
        # Keep connection alive by waiting for close
        while True:
            try:
                # Wait for a message or ping from client, but don't require it
                await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
            except asyncio.TimeoutError:
                # Send a ping to keep connection alive
                await websocket.ping()
            except WebSocketDisconnect:
                break
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for job {job_id}")
    except RuntimeError as e:
        logger.warning(f"WebSocket runtime error for job {job_id}: {e}")
    finally:
        # Clean up connection
        if job_id in active_connections and websocket in active_connections[job_id]:
            active_connections[job_id].remove(websocket)
        if job_id in active_connections and not active_connections[job_id]:
            del active_connections[job_id]
        logger.info(f"WebSocket connection cleaned up for job {job_id}") 

def get_mock_mode_folder(mock_mode: int) -> str:
    """Map mock mode numbers to their corresponding folder names in public directory"""
    mode_folder_map = {
        1: "browser-use",  # MOCK_TASK_1: browser-use.com
        2: "github",       # MOCK_TASK_2: github.com
        3: "storylane",    # MOCK_TASK_3: storylane.io
        4: "glimpse",      # MOCK_TASK_4: localhost:3000 (glimpse app)
        5: "databricks"    # MOCK_TASK_5: localhost:3000 (databricks demo)
    }
    return mode_folder_map.get(mock_mode, "")

def find_prerecorded_video(folder_name: str) -> Optional[str]:
    """
    Look for pre-recorded video files in the specified public folder.
    Returns the complete URL path if found, None otherwise.
    """
    if not folder_name:
        return None
    
    public_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "public"
    folder_path = public_dir / folder_name
    
    if not folder_path.exists():
        logger.info(f"No pre-recorded folder found: {folder_path}")
        return None
    
    # Look for common video file extensions
    video_extensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv']
    
    for ext in video_extensions:
        # Look for video files, prioritizing demo.mp4 if it exists
        demo_video = folder_path / f"demo{ext}"
        if demo_video.exists():
            video_url = f"http://127.0.0.1:8000/public/{folder_name}/demo{ext}"
            logger.info(f"Found pre-recorded demo video: {video_url}")
            return video_url
        
        # Also check for any video file in the folder
        video_files = list(folder_path.glob(f"*{ext}"))
        if video_files:
            # Use the first video file found
            video_file = video_files[0]
            video_url = f"http://127.0.0.1:8000/public/{folder_name}/{video_file.name}"
            logger.info(f"Found pre-recorded video: {video_url}")
            return video_url
    
    logger.info(f"No video files found in folder: {folder_path}")
    return None 

async def _perform_workflow_recording(description: Optional[str] = None):
    """Perform the actual workflow recording process"""
    global workflow_recording_status
    
    try:
        if not workflow_recording_service:
            raise RuntimeError("Workflow recording service not available")
        
        logger.info("Starting workflow recording session...")
        workflow_recording_status["status"] = "recording"
        
        # Capture the workflow
        captured_recording_model = await workflow_recording_service.capture_workflow()
        
        if not captured_recording_model:
            raise RuntimeError("Recording session ended, but no workflow data was captured")
        
        logger.info("Workflow recording captured successfully!")
        
        # Generate meaningful workflow name based on description
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        workflow_name = _generate_workflow_name(description, timestamp)
        
        # Save the raw recording temporarily
        import tempfile
        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix='.json',
            prefix='temp_recording_',
            delete=False,
            dir=workflow_recordings_dir,
            encoding='utf-8',
        ) as tmp_file:
            try:
                tmp_file.write(captured_recording_model.model_dump_json(indent=2))
            except AttributeError:
                json.dump(captured_recording_model, tmp_file, indent=2)
            temp_recording_path = Path(tmp_file.name)
        
        # Build the workflow from the recording
        if not workflow_builder_service:
            raise RuntimeError("Workflow builder service not available")
        
        workflow_description = description or f"Recorded workflow from {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        
        logger.info(f"Building workflow from recording: {workflow_description}")
        workflow_definition = await workflow_builder_service.build_workflow_from_path(
            temp_recording_path,
            workflow_description
        )
        
        if not workflow_definition:
            raise RuntimeError("Failed to build workflow definition from recording")
        
        # Save the final workflow
        final_workflow_path = workflow_recordings_dir / f"{workflow_name}.workflow.json"
        await workflow_builder_service.save_workflow_to_path(workflow_definition, final_workflow_path)
        
        # Clean up temporary file
        temp_recording_path.unlink(missing_ok=True)
        
        # Update status
        workflow_recording_status.update({
            "status": "completed",
            "workflow_name": workflow_name,
            "workflow_path": str(final_workflow_path),
            "error": None
        })
        
        logger.info(f"Workflow saved successfully: {final_workflow_path}")
        
    except Exception as e:
        logger.error(f"Error in workflow recording: {e}", exc_info=True)
        workflow_recording_status.update({
            "status": "failed",
            "workflow_name": None,
            "workflow_path": None,
            "error": str(e)
        })

async def process_workflow_execution_task(job_id: str, workflow_path: str, prompt: Optional[str] = None, variables: Optional[dict] = None):
    """Execute a saved workflow as a demo generation task"""
    try:
        job_store[job_id]["status"] = "processing"
        job_store[job_id]["progress"] = 0.1
        
        logger.info(f"Executing workflow: {workflow_path}")
        
        # Set up recording directory for workflow (similar to agent.py)
        project_root_dir = Path(__file__).resolve().parent.parent.parent
        recording_base_dir = project_root_dir / "recordings"
        recording_save_dir = recording_base_dir / job_id
        recording_save_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Workflow recording will be saved to: {recording_save_dir.resolve()}")

        # Load and run the workflow with proper dependencies (similar to agent.py setup)
        try:
            from browser_use import Browser
            from browser_use.browser.profile import BrowserProfile
            from browser_use.browser.session import BrowserSession
            from workflow_use.controller.service import WorkflowController
            
            # Set up browser profile with recording and separate user data directory
            # This avoids Chrome's behavior of opening tabs in existing instances
            profile_kwargs = auth_manager.get_browser_profile_kwargs()
            
            # Add recording configuration
            profile_kwargs["record_video_dir"] = str(recording_save_dir)
            profile_kwargs["record_video_size"] = {"width": 1920, "height": 1080}
            
            logger.info(f"Workflow will use saved authentication data")
            
            browser_profile = BrowserProfile(**profile_kwargs)
            browser_session = BrowserSession(
                disable_security=True,
                browser_profile=browser_profile
            )
            
            controller = WorkflowController()
            
            # Load workflow with proper dependencies for agent fallback
            workflow = Workflow.load_from_file(
                workflow_path,
                llm=llm_instance,  # This enables agent fallback
                browser=browser_session,
                controller=controller
            )
        except ImportError as e:
            logger.error(f"Missing dependencies for workflow execution: {e}")
            raise RuntimeError(f"Workflow dependencies not available: {e}")
        except Exception as e:
            logger.error(f"Error loading workflow: {e}")
            raise RuntimeError(f"Failed to load workflow: {e}")
        
        job_store[job_id]["progress"] = 0.3
        
        # Always run the workflow directly (not as a tool)
        # Prepare inputs for the workflow
        workflow_inputs = {}
        
        # If variables are provided, use them
        if variables:
            logger.info(f"Running workflow with variables: {variables}")
            workflow_inputs.update(variables)
        
        # Handle legacy prompt parameter for backwards compatibility
        if prompt and not variables:
            logger.info(f"Running workflow with legacy prompt parameter: {prompt}")
            # For backwards compatibility, use prompt as search_term if needed
            if "search_term" not in workflow_inputs:
                workflow_inputs["search_term"] = prompt
        elif not workflow_inputs:
            logger.info("Running workflow without inputs - using defaults where possible")
            # Only provide defaults if no inputs were specified at all
            workflow_inputs["search_term"] = "cats"
        
        # Start click recording for video editor (similar to agent.py)
        browser_session.start_click_recording(str(recording_save_dir))
        
        try:
            logger.info(f"Running workflow with inputs: {workflow_inputs}")
            result = await workflow.run(workflow_inputs)
            
            # Stop click recording and get click data
            click_data = browser_session.stop_click_recording()
        finally:
            # Ensure browser is properly closed after workflow execution
            try:
                logger.info(f"Closing browser session for workflow job {job_id}")
                browser_session.browser_profile.keep_alive = False  # Disable keep_alive
                await browser_session.close()
                logger.info(f"Browser session closed successfully for job {job_id}")
            except Exception as e:
                logger.warning(f"Error closing browser session for job {job_id}: {e}")
            
            # Also close the browser context and playwright connection
            try:
                if hasattr(browser_session, 'browser_context') and browser_session.browser_context:
                    await browser_session.browser_context.close()
                if hasattr(browser_session, 'playwright') and browser_session.playwright:
                    await browser_session.playwright.stop()
                logger.info(f"Browser context and playwright closed for job {job_id}")
            except Exception as e:
                logger.warning(f"Error closing browser context/playwright for job {job_id}: {e}")
        
        job_store[job_id]["progress"] = 0.8
        
        # Process recording similar to agent.py
        workflow_name = Path(workflow_path).stem
        
        # Discover and process video file (similar to agent.py)
        recording_dir_pathobj = Path(recording_save_dir)
        actual_video_filename = None
        recording_url = None
        
        # Look for video files and convert if needed
        video_files_webm = list(recording_dir_pathobj.glob("*.webm"))
        video_files_mp4 = list(recording_dir_pathobj.glob("*.mp4"))
        
        if video_files_webm:
            webm_file_path = video_files_webm[0]
            mp4_file_path = webm_file_path.with_suffix(".mp4")
            logger.info(f"Found webm video file: {webm_file_path.name}. Attempting conversion to {mp4_file_path.name}.")
            
            # Convert to MP4 using the same function as agent.py
            from .agent import _convert_to_mp4
            if _convert_to_mp4(str(webm_file_path), str(mp4_file_path)):
                actual_video_filename = mp4_file_path.name
                logger.info(f"Successfully converted {webm_file_path.name} to {actual_video_filename}")
            else:
                actual_video_filename = webm_file_path.name
                logger.warning(f"Conversion failed, using original .webm file: {webm_file_path.name}")
        elif video_files_mp4:
            actual_video_filename = video_files_mp4[0].name
            logger.info(f"Found and using .mp4 video file: {actual_video_filename}")
        
        # Create recording URL if video exists
        if actual_video_filename:
            job_specific_folder_name = Path(recording_save_dir).name
            recording_url = f"/recordings/{job_specific_folder_name}/{actual_video_filename}"
            logger.info(f"Workflow recording available at URL: {recording_url}")
        
        # Create basic artifact structure for compatibility
        run_artifact_folder_name = f"workflow_{job_id.split('_')[-1]}"
        base_artifacts_path = Path("frontend/public/run_artifacts")
        artifact_dir = base_artifacts_path / run_artifact_folder_name
        
        if not artifact_dir.exists():
            artifact_dir.mkdir(parents=True, exist_ok=True)
        
        # Create completion indicator with video info
        completion_file = artifact_dir / "workflow_completed.json"
        completion_data = {
            "workflow_name": workflow_name,
            "execution_time": datetime.now().isoformat(),
            "prompt": prompt,
            "variables": variables,
            "job_id": job_id,
            "recording_url": recording_url,
            "click_data": click_data
        }
        
        with open(completion_file, 'w') as f:
            json.dump(completion_data, f, indent=2)
        
        job_store[job_id].update({
            "status": "completed",
            "progress": 1.0,
            "completed_at": datetime.now(),
            "artifact_path": f"run_artifacts/{run_artifact_folder_name}",
            "screenshots": [],  # Workflows use video instead
            "interactions": [{"type": "workflow_execution", "workflow": workflow_name, "variables": variables}],
            "recording_path": recording_url,  # Video recording for video editor
            "click_data": click_data  # Click data for zoom effects
        })
        
        logger.info(f"Workflow execution completed for job {job_id}")
        
    except Exception as e:
        logger.error(f"Error executing workflow for job {job_id}: {e}", exc_info=True)
        job_store[job_id].update({
            "status": "failed",
            "progress": 0.0,
            "error": str(e),
            "completed_at": datetime.now()
        })
    finally:
        await notify_job_completion(job_id, job_store.get(job_id, {}).get("status", "failed")) 