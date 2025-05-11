from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional, List, Dict, Set
import json
import os
from pathlib import Path
from .agent import execute_agent
import asyncio
from datetime import datetime

app = FastAPI(title="Glimpse API", description="API for generating and managing interactive demos")

# In-memory job store and WebSocket connections
job_store: Dict[str, Dict] = {}
active_connections: Dict[str, Set[WebSocket]] = {}

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

        # Run the agent (output is ignored as per requirement)
        if MOCK_MODE:
            mock_nl_task = """
            Go to https://browser-use.com
            Click on docs link https://docs.browser-use.com/
            Click on the Cloud API tab
            Under API v1.0, click on the 'Get Task Status' button
            Click on the "Try it" button
            Stop
            """
            await execute_agent(mock_nl_task, root_url)
        else:
            await execute_agent(nl_task, root_url)
        
        final_status = "completed"
        job_store[job_id].update({
            "status": final_status,
            "progress": 1.0,
            "completed_at": datetime.now()
        })
    except Exception as e:
        job_store[job_id].update({
            "status": final_status, # remains "failed"
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