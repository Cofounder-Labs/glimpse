from langchain_openai import ChatOpenAI, AzureChatOpenAI
from browser_use import Agent
from browser_use.browser.browser import Browser, BrowserConfig
import asyncio
from dotenv import load_dotenv
import os
import logging
from screeninfo import get_monitors

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

load_dotenv()

async def execute_agent(nl_task: str, root_url: str, browser_details: dict | None = None) -> dict:
    """
    Execute the browser agent with the given task and URL.
    Returns a dictionary with job status and steps.
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
        result = await agent.run()
        
        # Return the results
        return {
            "steps": result  # You may need to transform this based on browser-use's output format
        }
        
    except Exception as e:
        logger.error(f"Error running browser agent: {str(e)}")
        raise