from langchain_openai import ChatOpenAI, AzureChatOpenAI
from browser_use import Agent
from browser_use.browser.browser import Browser, BrowserConfig, BrowserContextConfig
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

async def execute_agent(nl_task: str, root_url: str, browser_details: dict | None = None) -> dict:
    """
    Execute the browser agent with the given task and URL.
    Saves screenshots for 'Free Run' mode and returns their paths.
    """
    try:
        logger.debug(f"Starting task: {nl_task} at {root_url}")
        
        # Initialize the LLM (using OpenAI or Azure OpenAI)
        if os.getenv("AZURE_OPENAI_ENDPOINT") and os.getenv("AZURE_OPENAI_KEY"):
            logger.debug("Using Azure OpenAI")
            llm = AzureChatOpenAI(
                    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
                    api_key=os.getenv("AZURE_OPENAI_KEY"),
                    api_version="2024-02-15-preview",
                    deployment_name=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o"),  # Get deployment name from env or default to gpt-4o
                    temperature=0
                )
        elif os.getenv("OPENAI_API_KEY"):
            logger.debug("Using OpenAI")
            llm = ChatOpenAI(
                model="gpt-4o",
                temperature=0,
                openai_api_key=os.getenv("OPENAI_API_KEY")
            )
        else:
            raise ValueError("Either OPENAI_API_KEY or (AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY) environment variables are required")

        port = browser_details.get("remote_debugging_port") if browser_details else None
        chrome_path = browser_details.get("chrome_instance_path") if browser_details else None

        if not port:
            error_message = "Configuration error: execute_agent requires 'remote_debugging_port' in browser_details."
            logger.error(error_message)
            raise ValueError(error_message)
        
        if not chrome_path:
            # Fallback to a default path if not provided, with a warning, or make it strictly required.
            # For now, matching user snippet, but this should ideally come from browser_details.
            default_chrome_path = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
            logger.warning(f"'chrome_instance_path' not found in browser_details. Falling back to default: {default_chrome_path}")
            chrome_path = default_chrome_path # Or raise ValueError if strictly required
            # If you want to make it strict: 
            # error_message = "Configuration error: execute_agent requires 'chrome_instance_path' in browser_details."
            # logger.error(error_message)
            # raise ValueError(error_message)

        logger.info(f"Attempting to connect to existing Chrome instance via CDP.")
        logger.info(f"Using Chrome path: {chrome_path}, CDP port: {port}")

        # Create the BrowserContextConfig instance as requested
        context_config = BrowserContextConfig(
            highlight_elements=False  # Turn off element highlighting
        )

        browser_config = BrowserConfig(
            chrome_instance_path=chrome_path,
            headless=False,
            disable_security=True, # As per user request
            cdp_url=f"http://localhost:{port}",
            new_context_config=context_config # Pass the context config here (parameter name is an assumption)
        )
        
        logger.debug(f"Initializing Browser with BrowserConfig: {browser_config} and ContextConfig: {context_config}")
        try:
            custom_browser = Browser(config=browser_config)
            custom_browser.page = None # As per user request
            logger.info("Successfully initialized Browser and set page to None.")
        except Exception as e:
            logger.error(f"Failed to initialize Browser or set page: {e}", exc_info=True)
            raise # Re-raise the exception to halt execution

        # Create a more specific task description
        specific_task = f"""
        {nl_task}
        """
        
        # Initialize the agent
        agent = Agent(
            task=specific_task,
            llm=llm,
            browser=custom_browser,
            use_vision=False,  # Disable vision to reduce complexity
            max_failures=2,    # Limit the number of retries
        )
        
        # Run the agent
        history_result = await agent.run() # Capture the full history object

        screenshots_saved = []
        interactions_data = []
        run_artifact_folder_name = ""
        base_artifacts_path = Path("frontend/public/run_artifacts")

        if hasattr(history_result, 'history') and isinstance(history_result.history, list) and history_result.history:
            # Create artifact folder only if there's history
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            run_artifact_folder_name = f"run_{timestamp}"
            specific_run_path = base_artifacts_path / run_artifact_folder_name
            specific_run_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created artifact directory: {specific_run_path}")

            for i, history_item in enumerate(history_result.history):
                # 1. Screenshot saving
                if hasattr(history_item, 'state') and hasattr(history_item.state, 'screenshot') and history_item.state.screenshot:
                    try:
                        screenshot_data = history_item.state.screenshot
                        if isinstance(screenshot_data, str): # Check if it's base64 string
                            # Ensure correct base64 padding
                            missing_padding = len(screenshot_data) % 4
                            if missing_padding:
                                screenshot_data += '=' * (4 - missing_padding)
                            
                            image_data = base64.b64decode(screenshot_data)
                            screenshot_filename = f"{i+1:02d}.png"
                            screenshot_file_path = specific_run_path / screenshot_filename
                            
                            with open(screenshot_file_path, "wb") as f:
                                f.write(image_data)
                            screenshots_saved.append(screenshot_filename)
                            logger.debug(f"Saved screenshot for step {i+1}: {screenshot_file_path}")
                        else:
                            logger.warning(f"Screenshot for step {i+1} (item {i}) is not a string, skipping. Type: {type(screenshot_data)}")
                    except base64.binascii.Error as b64_error:
                        logger.error(f"Base64 decoding error for step {i+1} (item {i}) screenshot: {b64_error}. Data snippet: {str(screenshot_data)[:100]}...")
                    except Exception as e:
                        logger.error(f"Error saving screenshot for step {i+1} (item {i}): {e}")
                else:
                    logger.debug(f"No screenshot found for history item {i+1} (item {i}).")
                
                # 2. Action and interaction processing
                if hasattr(history_item, 'model_output') and history_item.model_output and \
                   hasattr(history_item.model_output, 'action') and history_item.model_output.action:
                    
                    actions_from_output = history_item.model_output.action
                    # Ensure actions_from_output is a list for consistent iteration
                    if not isinstance(actions_from_output, list):
                        actions_from_output = [actions_from_output] # Handles single action case

                    # Get interacted_elements from state: Optional[List[Dict]]
                    interacted_elements_list = []
                    if hasattr(history_item, 'state') and hasattr(history_item.state, 'interacted_element'):
                        interacted_elements_list = history_item.state.interacted_element or [] # Defaults to empty list if None
                    
                    # Pad interacted_elements_list with None to match length of actions_from_output for safe zipping
                    num_actions = len(actions_from_output)
                    if len(interacted_elements_list) < num_actions:
                        interacted_elements_list.extend([None] * (num_actions - len(interacted_elements_list)))
                    elif len(interacted_elements_list) > num_actions: # If more elements than actions, truncate elements
                        interacted_elements_list = interacted_elements_list[:num_actions]

                    for j, (action_obj, element_dict) in enumerate(zip(actions_from_output, interacted_elements_list)):
                        if not action_obj: # Should not happen if actions_from_output is properly populated
                            logger.warning(f"History item {i+1}, action {j+1}: action_obj is None, skipping.")
                            continue

                        current_interaction_info = {}
                        action_name = action_obj.__class__.__name__
                        current_interaction_info['action_name'] = action_name

                        # Store action parameters
                        if hasattr(action_obj, 'model_dump'): # For Pydantic models
                            current_interaction_info['action_parameters'] = action_obj.model_dump(exclude_none=True)
                        elif hasattr(action_obj, '__dict__'): # For simple objects, try to get vars
                            current_interaction_info['action_parameters'] = {k: v for k, v in vars(action_obj).items() if not k.startswith('_')}


                        if element_dict: # element_dict is an object (e.g., DOMHistoryElement) or None
                            # Access attributes directly, checking for existence first
                            if hasattr(element_dict, 'tag'):
                                current_interaction_info['element_tag'] = element_dict.tag
                            if hasattr(element_dict, 'xpath'):
                                current_interaction_info['element_xpath'] = element_dict.xpath
                            
                            if hasattr(element_dict, 'boundingBox') and element_dict.boundingBox:
                                bbox = element_dict.boundingBox
                                # boundingBox might be a dict or an object, try accessing as attributes first
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
                                
                                if bbox_data:
                                    current_interaction_info['bounding_box'] = bbox_data
                        
                        interactions_data.append(current_interaction_info)
                else:
                    logger.debug(f"History item {i+1} (item {i}): No model output or actions found.")
        else:
            logger.info("No history items found in history_result to process for artifacts.")
        
        # Return the results including artifact info
        return {
            "steps": history_result, # Original full result
            "artifact_path": f"run_artifacts/{run_artifact_folder_name}" if run_artifact_folder_name else "",
            "screenshots": screenshots_saved,
            "interactions": interactions_data # Add interactions data to the result
        }
        
    except Exception as e:
        logger.error(f"Error running browser agent: {str(e)}")
        raise