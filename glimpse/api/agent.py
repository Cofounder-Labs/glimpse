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

async def execute_agent(nl_task: str, root_url: str) -> dict:
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
            raise ValueError("Either OPENAI_API_KEY or (AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY) environment variables are required")

        # Select the display index (e.g., 0 for primary, 1 for secondary)
        monitor_index = 1  # Change to 0 or 1 depending on target display

        monitor = get_monitors()[monitor_index]

        screen_width = monitor.width
        screen_height = monitor.height
        screen_x = monitor.x
        screen_y = monitor.y

        window_width = screen_width // 2
        window_height = int(screen_height * 2 / 3)

        window_x = screen_x + (screen_width - window_width)  # Right-aligned with equal left/right margins
        window_y = screen_y + (screen_height - window_height) // 2  # Centered vertically

        extra_args = [
            f"--window-size={window_width},{window_height}",
            f"--window-position={window_x},{window_y}",
            "--disable-automation",  # optional, to reduce automation UI
            "--force-device-scale-factor=1"  # ensure correct scaling
        ]

        browser_config = BrowserConfig(
            extra_browser_args=extra_args,
            headless=False,
            viewport=None
        )
        custom_browser = Browser(config=browser_config)

        # Create a more specific task description
        specific_task = f"""
        Go to {root_url} and {nl_task}
        
        Important: Please complete this task step by step and stop when you see the search results.
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