from langchain_openai import ChatOpenAI, AzureChatOpenAI
from browser_use import Agent, AgentHistoryList
from browser_use.browser.browser import Browser, BrowserConfig
from browser_use.browser.context import BrowserContext, BrowserContextConfig
import asyncio
from dotenv import load_dotenv
import os
import logging
from screeninfo import get_monitors
import base64
from pathlib import Path
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

load_dotenv()

async def execute_agent(nl_task: str, root_url: str, job_id: str, browser_details: dict | None = None) -> dict:  
    """  
    Execute the browser agent with the given task and URL.  
    Saves screenshots and extracts bounding box information from interacted elements.  
    Saves a recording of the session if configured.
    """  
    try:  
        logger.debug(f"Starting task: {nl_task} at {root_url} for job_id: {job_id}")  
          
        # Initialize LLM - simplified with a helper function  
        llm = _get_llm()  
          
        # Get browser configuration  
        port, chrome_path = _validate_browser_details(browser_details)  
          
        # Prepare recording directory
        recording_base_dir = Path("recordings")
        recording_save_dir = recording_base_dir / job_id
        recording_save_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Recording will be saved to: {recording_save_dir.resolve()}")

        # Configure browser context for recording and other settings
        context_config = BrowserContextConfig(
            highlight_elements=False,
            save_recording_path=str(recording_save_dir),
            force_new_context=True
        )
          
        # Configure and initialize browser (without new_context_config as context is explicit)
        browser_config = BrowserConfig(  
            chrome_instance_path=chrome_path,  
            headless=False,  
            disable_security=True,  
            cdp_url=f"http://localhost:{port}"
        )  
          
        browser_instance = Browser(config=browser_config)
          
        # Create a browser context with the recording configuration
        recording_context = BrowserContext(browser=browser_instance, config=context_config)
          
        # Initialize and run agent with the explicit browser_context
        agent = Agent(  
            task=nl_task,  
            llm=llm,  
            browser_context=recording_context,
            browser=browser_instance,
            use_vision=False,  
            max_failures=2,  
        )  
          
        history_result = await agent.run()  
          
        # Process history to extract screenshots and interaction data  
        return _process_history(history_result, str(recording_save_dir))  
          
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
  
def _process_history(history_result: AgentHistoryList, recording_path: str) -> dict:  
    """Process agent history to extract screenshots and interaction data"""  
    screenshots_saved = []  
    interactions_data = []  
    run_artifact_folder_name = ""  
    base_artifacts_path = Path("frontend/public/run_artifacts")  
      
    if not hasattr(history_result, 'history') or not isinstance(history_result.history, list) or not history_result.history:  
        logger.info("No history items found in history_result to process for artifacts.")  
        return {  
            "steps": history_result,  
            "artifact_path": "",  
            "screenshots": [],  
            "interactions": [],  
            "recording_path": recording_path  
        }  
      
    # Create artifact folder  
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
        "recording_path": recording_path  
    }  
  
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