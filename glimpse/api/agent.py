from langchain_openai import ChatOpenAI, AzureChatOpenAI
from browser_use import Agent
from browser_use.browser.browser import Browser, BrowserConfig
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

        browser_config = BrowserConfig(
            chrome_instance_path=chrome_path,
            headless=False,
            disable_security=True, # As per user request
            cdp_url=f"http://localhost:{port}"
        )
        
        logger.debug(f"Initializing Browser with BrowserConfig: {browser_config}")
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

        # --- Screenshot Saving Logic for Free Run ---
        # This part is relevant if this agent execution is for a "Free Run" like mode.
        # The decision to save screenshots might be better placed in app.py based on ACTIVE_MOCK_MODE,
        # but for now, let's assume execute_agent prepares these if called in a context that needs them.

        screenshots_saved = []
        run_artifact_folder_name = ""

        # Define the base path for artifacts relative to the frontend's public directory
        # This assumes api and frontend are sibling directories or this path is correctly resolved.
        # A more robust solution might involve passing the frontend_public_dir_path as a config.
        # For now, let's assume a relative path from the `glimpse` workspace root.
        base_artifacts_path = Path("frontend/public/run_artifacts")
        
        if hasattr(history_result, 'history') and isinstance(history_result.history, list):
            if history_result.history: # Only create folder if there's history
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
                run_artifact_folder_name = f"run_{timestamp}"
                specific_run_path = base_artifacts_path / run_artifact_folder_name
                specific_run_path.mkdir(parents=True, exist_ok=True)
                logger.info(f"Created artifact directory: {specific_run_path}")

                for i, item in enumerate(history_result.history):
                    if hasattr(item, 'state') and hasattr(item.state, 'screenshot') and item.state.screenshot:
                        try:
                            screenshot_data = item.state.screenshot
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
                                logger.debug(f"Saved screenshot: {screenshot_file_path}")
                            else:
                                logger.warning(f"Screenshot for item {i} is not a string, skipping.")
                        except base64.binascii.Error as b64_error:
                            logger.error(f"Base64 decoding error for screenshot {i}: {b64_error}. Data: {screenshot_data[:100]}...") # Log snippet of data
                        except Exception as e:
                            logger.error(f"Error saving screenshot {i}: {e}")
        
        # Return the results including artifact info
        return {
            "steps": history_result, # Original full result
            "artifact_path": f"run_artifacts/{run_artifact_folder_name}" if run_artifact_folder_name else "",
            "screenshots": screenshots_saved
        }
        
    except Exception as e:
        logger.error(f"Error running browser agent: {str(e)}")
        raise