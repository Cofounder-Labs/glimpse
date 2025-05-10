from langchain_openai import ChatOpenAI, AzureChatOpenAI
from browser_use import Agent
import asyncio
from dotenv import load_dotenv
import os
import logging

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
        if os.getenv("AZURE_OPENAI_ENDPOINT") and os.getenv("AZURE_OPENAI_API_KEY"):
            logger.debug("Using Azure OpenAI")
            llm = AzureChatOpenAI(
                api_version="2024-02-15-preview",
                model="gpt-4o",
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
        
        # Create a more specific task description
        specific_task = f"""
        Go to {root_url} and {nl_task}
        
        Important: Always perform actions in a new tab, never modify the current tab.
        Please complete this task step by step and stop when you see the search results.
        """
        
        # Initialize the agent
        agent = Agent(
            task=specific_task,
            llm=llm,
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