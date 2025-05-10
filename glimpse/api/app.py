from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
import json
import os
from pathlib import Path

app = FastAPI(title="Glimpse API", description="API for generating and managing interactive demos")

# Models
class DemoRequest(BaseModel):
    nl_task: str
    root_url: str

class DemoStatus(BaseModel):
    job_id: str
    status: str
    progress: float
    steps: Optional[List[Dict]] = None

class DemoStep(BaseModel):
    screenshot_url: str
    annotation: Dict
    element_selector: str
    url: str

# Mock mode configuration
MOCK_MODE = os.getenv("MOCK_MODE", "false").lower() == "true"
MOCK_DATA_DIR = Path(__file__).parent.parent / "mocks"

def get_mock_response(endpoint: str, request_data: Optional[dict] = None) -> dict:
    """Get mock response for an endpoint"""
    mock_file = MOCK_DATA_DIR / f"{endpoint}.json"
    if not mock_file.exists():
        raise HTTPException(status_code=500, detail=f"Mock file not found for {endpoint}")
    
    with open(mock_file) as f:
        return json.load(f)

@app.post("/generate-demo", response_model=DemoStatus)
async def generate_demo(request: DemoRequest):
    if MOCK_MODE:
        return get_mock_response("generate_demo", request.dict())
    
    # TODO: Implement actual demo generation logic
    return DemoStatus(
        job_id="mock_job_123",
        status="processing",
        progress=0.0
    )

@app.get("/demo-status/{job_id}", response_model=DemoStatus)
async def get_demo_status(job_id: str):
    if MOCK_MODE:
        return get_mock_response("demo_status", {"job_id": job_id})
    
    # TODO: Implement actual status checking logic
    return DemoStatus(
        job_id=job_id,
        status="completed",
        progress=1.0,
        steps=[
            DemoStep(
                screenshot_url="https://example.com/screenshot1.png",
                annotation={"text": "Click here", "rel_x": 0.5, "rel_y": 0.5},
                element_selector="#button1",
                url="https://example.com"
            )
        ]
    ) 