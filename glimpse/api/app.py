from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Set
import json
import os
from pathlib import Path
from .agent import execute_agent
import asyncio
from datetime import datetime
import subprocess
import time
import requests # Added for launch_chrome_with_debugging

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

# In-memory job store and WebSocket connections
job_store: Dict[str, Dict] = {}
active_connections: Dict[str, Set[WebSocket]] = {}

# Global variable to store the browser instance or connection details
browser_details = {"remote_debugging_port": 9222} # Store port for now

# Define different mock tasks
MOCK_TASK_1 = """
Go to https://browser-use.com
Click on docs link https://docs.browser-use.com/
Click on the Cloud API tab
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
Go to https://wikipedia.org
Search for 'FastAPI' using the search input
Click the search button
Click the first result link for 'FastAPI'
Stop
"""
MOCK_TASK_4 = """
Go to https://google.com
Type 'python async library' into the search bar
Click the 'Google Search' button
Stop
"""

def launch_chrome_with_debugging():
    """Launch Chrome with remote debugging enabled"""
    chrome_path = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' # This might need to be configurable
    browser_details["chrome_instance_path"] = None # Initialize
    browser_details["remote_debugging_port"] = browser_details.get("remote_debugging_port", 9222) # Ensure port is set

    if not os.path.exists(chrome_path):
        print(f"Chrome not found at {chrome_path}. Please install Chrome or update the path.")
        browser_details["remote_debugging_port"] = None 
        return

    browser_details["chrome_instance_path"] = chrome_path # Store the path

    port = browser_details["remote_debugging_port"]
    # Check if Chrome is already running with remote debugging
    try:
        response = requests.get(f'http://localhost:{port}/json/version')
        if response.status_code == 200:
            print(f"Chrome is already running with remote debugging on port {port}")
            return
    except requests.exceptions.ConnectionError:
        # Chrome is not running with remote debugging on this port, proceed with launch
        pass

    # Kill any existing Chrome processes with the target remote debugging port
    # Be cautious with pkill, ensure it's specific enough
    try:
        subprocess.run(['pkill', '-f', f'remote-debugging-port={port}'], check=False)
        time.sleep(1)  # Wait for processes to be killed
    except FileNotFoundError:
        print("pkill command not found. Skipping process killing. This might lead to issues if Chrome is already running.")


    user_data_dir = f'/tmp/chrome-debug-profile-{port}'
    if not os.path.exists(user_data_dir):
        os.makedirs(user_data_dir)

    # Launch Chrome with remote debugging
    try:
        subprocess.Popen([
            chrome_path,
            f'--remote-debugging-port={port}',
            f'--user-data-dir={user_data_dir}',
            # Add any other flags you were using, like window size/position, if they apply here
            # f"--window-size={initial_width},{initial_height}",
            # f"--window-position={initial_x},{initial_y}",
        ])
        time.sleep(3)  # Wait for Chrome to start
        # Verify connection after launch
        response = requests.get(f'http://localhost:{port}/json/version')
        if response.status_code == 200:
            print(f"Launched new Chrome instance with remote debugging on port {port}")
        else:
            print(f"Failed to connect to Chrome on port {port} after launching. Status: {response.status_code}")
            browser_details["remote_debugging_port"] = None
            # Keep chrome_instance_path as it might be a valid path even if launch/connect failed here
    except FileNotFoundError:
        print(f"Failed to launch Chrome. Ensure '{chrome_path}' is correct.")
        browser_details["remote_debugging_port"] = None
        browser_details["chrome_instance_path"] = None # Path is invalid if Chrome executable not found
    except Exception as e:
        print(f"An error occurred while launching Chrome: {e}")
        browser_details["remote_debugging_port"] = None
        # Keep chrome_instance_path


@app.on_event("startup")
async def startup_event():
    launch_chrome_with_debugging()

# Models
class DemoRequest(BaseModel):
    nl_task: str
    root_url: str

class DemoStatus(BaseModel):
    job_id: str
    status: str
    progress: float
    steps: Optional[List[Dict]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    error: Optional[str] = None

class ClickPosition(BaseModel):
    x: int
    y: int
    page_width: int
    page_height: int

class DemoStep(BaseModel):
    click_position: ClickPosition
    click_label: str
    element_selector: str
    url: str

# Mock mode configuration
MOCK_MODE = os.getenv("MOCK_MODE", "false").lower() == "true"

async def notify_job_completion(job_id: str, status: str):
    """Notify connected WebSocket clients about job completion."""
    if job_id in active_connections:
        message = {"job_id": job_id, "status": status}
        # Use a list comprehension to avoid issues with modifying the set while iterating
        connections_to_notify = list(active_connections[job_id])
        for connection in connections_to_notify:
            try:
                await connection.send_json(message)
            except RuntimeError: # Connection might be closed
                active_connections[job_id].remove(connection)
        if not active_connections[job_id]: # Clean up if no connections left
            del active_connections[job_id]

async def process_demo_task(job_id: str, nl_task: str, root_url: str):
    """Background task to process the demo generation"""
    final_status = "failed" # Default to failed
    try:
        job_store[job_id]["status"] = "processing"
        job_store[job_id]["progress"] = 0.1 # Initial progress

        # Check for specific MOCK_MODEn=true environment variables
        task_to_execute = nl_task # Default to the user's task
        original_root_url = root_url # Keep original for non-mock case

        mock_mode_active = None
        if os.getenv("MOCK_MODE1", "false").lower() == "true":
            mock_mode_active = 1
            print("--- Running in MOCK MODE 1 ---")
            task_to_execute = MOCK_TASK_1
            root_url = "https://browser-use.com" 
        elif os.getenv("MOCK_MODE2", "false").lower() == "true":
            mock_mode_active = 2
            print("--- Running in MOCK MODE 2 ---")
            task_to_execute = MOCK_TASK_2
            root_url = "https://browser-use.com" # Assuming same root for MOCK_TASK_2
        elif os.getenv("MOCK_MODE3", "false").lower() == "true":
            mock_mode_active = 3
            print("--- Running in MOCK MODE 3 ---")
            task_to_execute = MOCK_TASK_3
            root_url = "https://wikipedia.org"
        elif os.getenv("MOCK_MODE4", "false").lower() == "true":
            mock_mode_active = 4
            print("--- Running in MOCK MODE 4 ---")
            task_to_execute = MOCK_TASK_4
            root_url = "https://google.com"
        
        if mock_mode_active:
            # Execute the selected mock task
            await execute_agent(task_to_execute, root_url, browser_details=browser_details)
        else:
            # No specific MOCK_MODEn=true found, execute original task
            print("--- Running in standard mode (no MOCK_MODEn=true detected) ---")
            await execute_agent(nl_task, original_root_url, browser_details=browser_details)

        final_status = "completed"
        job_store[job_id].update({
            "status": final_status,
            "progress": 1.0,
            "completed_at": datetime.now()
        })

    except Exception as e:
        job_store[job_id].update({
            "status": "failed", # Explicitly set failed on exception
            "progress": 0.0,
            "error": str(e),
            "completed_at": datetime.now()
        })
    finally:
        await notify_job_completion(job_id, final_status)

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
    
    background_tasks.add_task(process_demo_task, job_id, request.nl_task, request.root_url)
    
    return DemoStatus(**job_store[job_id])

@app.get("/demo-status/{job_id}", response_model=DemoStatus)
async def get_demo_status(job_id: str):
    if job_id not in job_store:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return DemoStatus(**job_store[job_id])

@app.websocket("/ws/job-status/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    await websocket.accept()
    if job_id not in active_connections:
        active_connections[job_id] = set()
    active_connections[job_id].add(websocket)
    try:
        while True:
            # Keep the connection alive, or receive messages if needed
            await websocket.receive_text() 
    except WebSocketDisconnect:
        active_connections[job_id].remove(websocket)
        if not active_connections[job_id]:
            del active_connections[job_id]
    except RuntimeError: # Handle cases where connection is already closed
        if job_id in active_connections and websocket in active_connections[job_id]:
             active_connections[job_id].remove(websocket)
        if job_id in active_connections and not active_connections[job_id]:
            del active_connections[job_id] 