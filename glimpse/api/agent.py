import sys
import os

# Add the local browser-use directory to the Python path
# Assuming 'browser-use' is a folder in the current workspace root
local_browser_use_path = os.path.join(os.path.dirname(__file__), 'browser-use')
if local_browser_use_path not in sys.path:
    sys.path.insert(0, local_browser_use_path)

# Add the parent directory of 'browser-use' to the Python path
# This is often needed if 'browser-use' itself contains a package structure
# that expects its parent to be in the path.
parent_dir = os.path.dirname(local_browser_use_path)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Note for IDE type checking (this comment helps IDEs recognize the import)
# browser_use can be found in glimpse/api/browser-use/browser_use/


from langchain_openai import ChatOpenAI, AzureChatOpenAI
from browser_use.agent.service import Agent, AgentHistoryList 
from browser_use.controller.service import Controller  
from browser_use.browser.profile import BrowserProfile 
from browser_use.browser.session import BrowserSession 

import asyncio
from dotenv import load_dotenv
import os
import logging
from screeninfo import get_monitors
import base64
from pathlib import Path
from datetime import datetime
import subprocess

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

load_dotenv()

def _get_persistent_user_data_dir() -> Path:
    """Get the persistent user data directory path relative to the repo."""
    # Get the repo root directory
    # agent.py is in glimpse/api/agent.py
    # So go up two levels to get to repo root
    repo_root = Path(__file__).resolve().parent.parent.parent
    user_data_dir = repo_root / "chromium_user_data"
    
    # Create directory if it doesn't exist
    user_data_dir.mkdir(parents=True, exist_ok=True)
    
    logger.info(f"Using persistent user data directory: {user_data_dir}")
    return user_data_dir

async def execute_agent(nl_task: str, root_url: str, job_id: str, browser_details: dict | None = None, demo_type: str = "video") -> dict:  
    """  
    Execute the browser agent with the given task and URL.  
    Saves screenshots and extracts bounding box information from interacted elements.  
    Saves a recording of the session if configured.
    """  
    try:  
        logger.debug(f"Starting task: {nl_task} at {root_url} for job_id: {job_id}")  
          
        # Initialize LLM - simplified with a helper function  
        llm = _get_llm()  
          
        # Conditionally prepare recording directory based on demo_type
        recording_save_dir = None
        if demo_type == "video":
            # Assumes agent.py is in glimpse/api/agent.py
            # Path(__file__).resolve() -> .../glimpse/glimpse/api/agent.py
            # .parent -> .../glimpse/glimpse/api
            # .parent.parent -> .../glimpse/glimpse
            # .parent.parent.parent -> .../glimpse (project root)
            project_root_dir = Path(__file__).resolve().parent.parent.parent
            recording_base_dir = project_root_dir / "recordings"
            recording_save_dir = recording_base_dir / job_id
            recording_save_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Video mode: Recording will be saved to: {recording_save_dir.resolve()}")
        else:
            logger.info(f"Screenshot mode: No recording will be created")

        # Get persistent user data directory
        user_data_dir = _get_persistent_user_data_dir()

        # Configure browser profile based on demo_type
        profile_kwargs = {
            "use_human_like_mouse": True,
            "mouse_movement_pattern": "human",
            "min_mouse_movement_time": 0.3,
            "max_mouse_movement_time": 1.0,
            "mouse_speed_variation": 0.4,
            "show_visual_cursor": True,  # Enable visual cursor
            "highlight_elements": False,  # Add the context configuration here
            "user_data_dir": str(user_data_dir),  # Use persistent user data directory  # Add extra browser arguments
            "args": ["--autoplay-policy=no-user-gesture-required", "--no-sandbox"],  # Add extra browser arguments
        }
        
        # Only add recording directory if in video mode
        if demo_type == "video" and recording_save_dir:
            profile_kwargs["record_video_dir"] = str(recording_save_dir)
        
        human_profile = BrowserProfile(**profile_kwargs)

        human_session = BrowserSession(
            # chrome_instance_path=chrome_path,  
            # headless=False,  
            disable_security=True,  
            # cdp_url=f"http://localhost:{port}",
            browser_profile=human_profile,
        )
          
        # Initialize and run agent with the explicit browser_context
        agent = Agent(  
            task=nl_task,  
            llm=llm,  
            use_vision=False,
            browser_session=human_session,  # Pass the profile with all settings
            max_failures=2,  
            enable_memory=False, # Explicitly disable memory
        )  
        
        # Start click recording for video mode
        if demo_type == "video" and recording_save_dir:
            human_session.start_click_recording(str(recording_save_dir))
          
        history_result = await agent.run()  
        
        # Stop click recording and get click data
        click_data = []
        if demo_type == "video":
            click_data = human_session.stop_click_recording()
          
        # Process history to extract screenshots and interaction data  
        recording_path = str(recording_save_dir.resolve()) if recording_save_dir else ""
        return _process_history(history_result, recording_path, demo_type, click_data)  
          
    except Exception as e:  
        logger.error(f"Error running browser agent: {str(e)}")  
        raise  
  
def _get_llm():  
    """Helper function to initialize the appropriate LLM"""  
    if os.getenv("AZURE_OPENAI_ENDPOINT") and os.getenv("AZURE_OPENAI_KEY"):  
        logger.debug("Using Azure OpenAI")  
        return AzureChatOpenAI(  
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),  
            api_key=os.getenv("AZURE_OPENAI_KEY"),  
            api_version="2024-02-15-preview",  
            deployment_name=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o"),  
            temperature=0  
        )  
    elif os.getenv("OPENAI_API_KEY"):  
        logger.debug("Using OpenAI")  
        return ChatOpenAI(  
            model="gpt-4o",  
            temperature=0,  
            openai_api_key=os.getenv("OPENAI_API_KEY")  
        )  
    else:  
        raise ValueError("Either OPENAI_API_KEY or (AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY) environment variables are required")  
  
def _validate_browser_details(browser_details: dict | None) -> tuple[int, str]:  
    """Validate and extract browser configuration details"""  
    port = browser_details.get("remote_debugging_port") if browser_details else None  
    chrome_path = browser_details.get("chrome_instance_path") if browser_details else None  
      
    if not port:  
        error_message = "Configuration error: execute_agent requires 'remote_debugging_port' in browser_details."  
        logger.error(error_message)  
        raise ValueError(error_message)  
      
    if not chrome_path:  
        default_chrome_path = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'  
        logger.warning(f"'chrome_instance_path' not found in browser_details. Falling back to default: {default_chrome_path}")  
        chrome_path = default_chrome_path  
      
    return port, chrome_path  
  
def _process_history(history_result: AgentHistoryList, recording_path: str, demo_type: str = "video", click_data: list = []) -> dict:  
    """Process agent history to extract screenshots and interaction data"""  
    screenshots_saved = []  
    interactions_data = []  
    run_artifact_folder_name = ""  
    base_artifacts_path = Path("frontend/public/run_artifacts")  
      
    # Discover the actual video file (.webm or .mp4) FIRST, but only in video mode
    actual_video_filename = None # Initialize
    
    if demo_type == "video" and recording_path:
        recording_dir_pathobj = Path(recording_path) # recording_path is absolute dir path
        logger.info(f"Video mode: Looking for video files in directory: {recording_dir_pathobj.resolve()}")
        logger.info(f"Absolute recording path provided to _process_history: {recording_path}")

        video_files_webm = list(recording_dir_pathobj.glob("*.webm"))
        logger.info(f"Found .webm files: {video_files_webm} using glob pattern '*.webm'")
        
        video_files_mp4 = list(recording_dir_pathobj.glob("*.mp4"))
        logger.info(f"Found .mp4 files: {video_files_mp4} using glob pattern '*.mp4'")
        
        converted_to_mp4 = False

        if video_files_webm:
            webm_file_path = video_files_webm[0]
            mp4_file_path = webm_file_path.with_suffix(".mp4")
            logger.info(f"Found webm video file: {webm_file_path.name}. Attempting conversion to {mp4_file_path.name}.")
            if _convert_to_mp4(str(webm_file_path), str(mp4_file_path)):
                actual_video_filename = mp4_file_path.name
                converted_to_mp4 = True
                logger.info(f"Successfully converted {webm_file_path.name} to {actual_video_filename}. It will be used.")
                # Optionally, remove the original .webm file if conversion is successful
                # try:
                #     webm_file_path.unlink()
                #     logger.info(f"Removed original webm file: {webm_file_path.name}")
                # except OSError as e:
                #     logger.error(f"Error removing webm file {webm_file_path.name}: {e}")
            else:
                logger.warning(f"Conversion of {webm_file_path.name} to mp4 failed. Using original .webm file: {webm_file_path.name}")
                actual_video_filename = webm_file_path.name
        elif video_files_mp4:
            actual_video_filename = video_files_mp4[0].name
            logger.info(f"No .webm files found. Found and using .mp4 video file: {actual_video_filename} in {recording_path}")
        else:
            logger.warning(f"No .webm or .mp4 video file found in {recording_path}. 'actual_video_filename' will be None.")
    else:
        logger.info(f"Screenshot mode: Skipping video file discovery")

    # Now, process history items if they exist
    if not hasattr(history_result, 'history') or not isinstance(history_result.history, list) or not history_result.history:  
        logger.info("No history items found in history_result to process for artifacts (this might be due to agent failure).")  
        # Still return what we found about the video
        return {  
            "steps": history_result,  # or an empty list/default value if history_result is problematic
            "artifact_path": "",  
            "screenshots": [],  
            "interactions": [],  
            "recording_dir_absolute_path": recording_path if demo_type == "video" else "", 
            "actual_video_filename": actual_video_filename # This will now have a value if a video was found
        }  
      
    # Create artifact folder (only if history items exist to be processed)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")  
    run_artifact_folder_name = f"run_{timestamp}"  
    specific_run_path = base_artifacts_path / run_artifact_folder_name  
    specific_run_path.mkdir(parents=True, exist_ok=True)  
    logger.info(f"Created artifact directory: {specific_run_path}")  
      
    # Process each history item  
    for i, history_item in enumerate(history_result.history):  
        # Save screenshot  
        screenshot_filename = _save_screenshot(history_item, i, specific_run_path)  
        if screenshot_filename:  
            screenshots_saved.append(screenshot_filename)  
          
        # Extract interaction data  
        item_interactions = _extract_interactions(history_item, i)  
        interactions_data.extend(item_interactions)  
      
    return {  
        "steps": history_result,  
        "artifact_path": f"run_artifacts/{run_artifact_folder_name}" if run_artifact_folder_name else "",  
        "screenshots": screenshots_saved,  
        "interactions": interactions_data,  
        "recording_dir_absolute_path": recording_path if demo_type == "video" else "",  # Full absolute path to the recording directory only in video mode
        "actual_video_filename": actual_video_filename, # Name of the video file, e.g., "xxxx.webm" or "video.mp4"
        "click_data": click_data
    }  
  
def _convert_to_mp4(input_path: str, output_path: str) -> bool:
    """Converts a video file to MP4 format using ffmpeg."""
    try:
        # Basic ffmpeg command for conversion.
        # -i: input file
        # -vf: video filter
        # -c:v libx264: video codec
        # -preset medium: encoding speed/quality trade-off
        # -crf 23: constant rate factor (quality, lower is better, 18-28 is typical)
        # -c:a aac: audio codec
        # -b:a 128k: audio bitrate
        # -y: overwrite output file if it exists
        command = [
            'ffmpeg', '-i', input_path,
            '-vf', 'crop=iw:ih*0.88:0:0',
            '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
            '-c:a', 'aac', '-b:a', '128k',
            '-y', output_path
        ]
        logger.info(f"Executing ffmpeg command: {' '.join(command)}")
        process = subprocess.run(command, capture_output=True, text=True, check=False)
        
        if process.returncode == 0:
            logger.info(f"Successfully converted {Path(input_path).name} to {Path(output_path).name}")
            return True
        else:
            logger.error(f"ffmpeg conversion failed for {Path(input_path).name}. Return code: {process.returncode}")
            logger.error(f"ffmpeg stdout: {process.stdout}")
            logger.error(f"ffmpeg stderr: {process.stderr}")
            return False
    except FileNotFoundError:
        logger.error("ffmpeg not found. Please ensure ffmpeg is installed and in your system's PATH.")
        return False
    except Exception as e:
        logger.error(f"An error occurred during ffmpeg conversion: {e}")
        return False
  
def _save_screenshot(history_item, step_index: int, output_path: Path) -> str | None:  
    """Save screenshot from history item and return filename if successful"""  
    if not hasattr(history_item, 'state') or not hasattr(history_item.state, 'screenshot') or not history_item.state.screenshot:  
        logger.debug(f"No screenshot found for history item {step_index+1}.")  
        return None  
      
    try:  
        screenshot_data = history_item.state.screenshot  
        if not isinstance(screenshot_data, str):  
            logger.warning(f"Screenshot for step {step_index+1} is not a string, skipping. Type: {type(screenshot_data)}")  
            return None  
          
        # Remove data URL prefix if present (e.g., "data:image/png;base64,")
        if ',' in screenshot_data:
            screenshot_data = screenshot_data.split(',', 1)[1]
            
        # Ensure correct base64 padding  
        missing_padding = len(screenshot_data) % 4  
        if missing_padding:  
            screenshot_data += '=' * (4 - missing_padding)  
          
        image_data = base64.b64decode(screenshot_data)  
        screenshot_filename = f"{step_index+1:02d}.png"  
        screenshot_file_path = output_path / screenshot_filename  
          
        with open(screenshot_file_path, "wb") as f:  
            f.write(image_data)  
          
        logger.debug(f"Saved screenshot for step {step_index+1}: {screenshot_file_path}")  
        return screenshot_filename  
      
    except base64.binascii.Error as b64_error:  
        logger.error(f"Base64 decoding error for step {step_index+1} screenshot: {b64_error}. Data snippet: {str(screenshot_data)[:100]}...")  
    except Exception as e:  
        logger.error(f"Error saving screenshot for step {step_index+1}: {e}")  
      
    return None  
  
def _extract_interactions(history_item, step_index: int) -> list[dict]:  
    """Extract interaction data from a history item"""  
    interactions = []  
      
    if (not hasattr(history_item, 'model_output') or 
        not history_item.model_output or
        not hasattr(history_item.model_output, 'action') or 
        not history_item.model_output.action):
        return interactions
      
    # Get actions and interacted elements  
    actions = history_item.model_output.action  
    if not isinstance(actions, list):  
        actions = [actions]  # Convert single action to list  
      
    # Get interacted elements  
    interacted_elements = []  
    if hasattr(history_item, 'state') and hasattr(history_item.state, 'interacted_element'):  
        interacted_elements = history_item.state.interacted_element or []  
      
    # Ensure lists are the same length for safe zipping  
    if len(interacted_elements) < len(actions):  
        interacted_elements.extend([None] * (len(actions) - len(interacted_elements)))  
    elif len(interacted_elements) > len(actions):  
        interacted_elements = interacted_elements[:len(actions)]  
      
    # Process each action and its corresponding element  
    for action_index, (action, element) in enumerate(zip(actions, interacted_elements)):  
        if not action:  
            continue  
          
        interaction_info = {  
            'step': step_index + 1,  
            'action_index': action_index + 1,  
            'action_name': action.__class__.__name__,  
        }  
          
        # Add action parameters  
        if hasattr(action, 'model_dump'):  
            interaction_info['action_parameters'] = action.model_dump(exclude_none=True)  
        elif hasattr(action, '__dict__'):  
            interaction_info['action_parameters'] = {k: v for k, v in vars(action).items() if not k.startswith('_')}  
          
        # Add element information if available  
        if element:  
            # Add basic element info  
            if hasattr(element, 'tag'):  
                interaction_info['element_tag'] = element.tag  
            if hasattr(element, 'xpath'):  
                interaction_info['element_xpath'] = element.xpath  
              
            # Extract bounding box information  
            bbox_data = _extract_bounding_box(element)  
            if bbox_data:  
                interaction_info['bounding_box'] = bbox_data  
          
        interactions.append(interaction_info)  
      
    return interactions  
  
def _extract_bounding_box(element) -> dict | None:  
    """Extract bounding box information from an element"""  
    if not element or not hasattr(element, 'viewport_coordinates') or not element.viewport_coordinates:  
        # Try alternative property names  
        if hasattr(element, 'boundingBox') and element.boundingBox:  
            return _extract_bounding_box_from_dict(element.boundingBox)  
        return None  
      
    # Extract from viewport_coordinates (CoordinateSet)  
    coords = element.viewport_coordinates  
    return {  
        'x': coords.top_left.x,  
        'y': coords.top_left.y,  
        'width': coords.width,  
        'height': coords.height  
    }  
  
def _extract_bounding_box_from_dict(bbox) -> dict | None:  
    """Extract bounding box information from a dictionary or object"""  
    if not bbox:  
        return None  
      
    # Try to access as attributes first  
    bbox_data = {}  
    if hasattr(bbox, 'x'): bbox_data['x'] = bbox.x  
    if hasattr(bbox, 'y'): bbox_data['y'] = bbox.y  
    if hasattr(bbox, 'width'): bbox_data['width'] = bbox.width  
    if hasattr(bbox, 'height'): bbox_data['height'] = bbox.height  
      
    # If attributes aren't found, and it's a dict, try dict access  
    if not bbox_data and isinstance(bbox, dict):  
        if 'x' in bbox: bbox_data['x'] = bbox['x']  
        if 'y' in bbox: bbox_data['y'] = bbox['y']  
        if 'width' in bbox: bbox_data['width'] = bbox['width']  
        if 'height' in bbox: bbox_data['height'] = bbox['height']  
      
    return bbox_data if bbox_data else None