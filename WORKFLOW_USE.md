# Workflow-Use Integration

This project now includes [Workflow Use](https://github.com/browser-use/workflow-use) integration for creating and executing deterministic browser workflows.

## Setup

The workflow-use components have been integrated into the main poetry project. Run the setup script to install all dependencies:

```bash
python setup_workflow_use.py
```

This will:
- Install Python dependencies via poetry
- Build the browser extension
- Set up the React UI
- Install Playwright browsers
- Create convenience scripts

## Environment Configuration

Add your OpenAI API key to the workflow environment:

```bash
# Edit the .env file
vim workflow-use-main/workflows/.env
```

Add your API key:
```
OPENAI_API_KEY=your_api_key_here
```

## Usage

### Command Line Interface

Use the convenience script to run workflow commands:

```bash
# Create a new workflow
python workflow.py create-workflow

# Run workflow as tool with AI prompt
python workflow.py run-as-tool examples/example.workflow.json --prompt "fill the form with example data"

# Run predefined workflow
python workflow.py run-workflow examples/example.workflow.json

# Launch the GUI
python workflow.py launch-gui

# See all available commands
python workflow.py --help
```

### Python Integration

Use workflows from your Python code:

```python
from glimpse.workflow_bridge import workflow_bridge
import asyncio

async def use_workflow():
    # List available workflows
    workflows = workflow_bridge.list_workflows()
    print("Available workflows:", workflows)
    
    # Run a workflow as tool
    result = await workflow_bridge.run_workflow_as_tool(
        "example.workflow.json",
        "Fill the form with sample data"
    )
    
    if result["success"]:
        print("Workflow completed:", result["result"])
    else:
        print("Workflow failed:", result["error"])

# Run it
asyncio.run(use_workflow())
```

### Browser Extension

1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the folder: `workflow-use-main/extension/.wxt/chrome-mv3`

The extension allows you to record browser interactions that can be converted into workflows.

### Web UI

Start the development server:

```bash
cd workflow-use-main/ui
npm run dev
```

Or use the integrated launch command:

```bash
python workflow.py launch-gui
```

Access the UI at: http://localhost:5173

## Features

- **Record & Replay**: Record browser interactions once, replay indefinitely
- **AI-Enhanced**: Use natural language to modify and execute workflows
- **Self-Healing**: Workflows can fall back to AI agents when steps fail
- **Variable Extraction**: Automatically extract and parameterize form data
- **Integration Ready**: Works seamlessly with existing glimpse functionality

## Project Structure

```
workflow-use-main/
├── extension/          # Browser extension for recording workflows
├── ui/                # React web interface
├── workflows/         # Python backend and workflow engine
│   ├── examples/      # Example workflow files
│   ├── backend/       # FastAPI backend
│   └── workflow_use/  # Core workflow library
└── static/           # Static assets
```

## Development

### Extension Development

```bash
cd workflow-use-main/extension
npm run dev  # Development mode
npm run build  # Production build
```

### UI Development

```bash
cd workflow-use-main/ui
npm run dev  # Start dev server
npm run build  # Production build
```

### Python Development

The workflow engine is integrated into the main poetry environment:

```bash
poetry shell  # Activate environment
cd workflow-use-main/workflows
python cli.py --help  # Direct CLI access
```

## Troubleshooting

### Missing Dependencies

If you get import errors, ensure the setup script was run successfully:

```bash
python setup_workflow_use.py
```

### Browser Extension Not Loading

1. Ensure the extension was built: `npm run build` in the extension directory
2. Load the correct folder: `workflow-use-main/extension/.wxt/chrome-mv3`
3. Check for browser console errors

### API Key Issues

Ensure your OpenAI API key is properly set:

```bash
cat workflow-use-main/workflows/.env
```

## Integration with Glimpse

The workflow bridge (`glimpse/workflow_bridge.py`) provides seamless integration:

- Access workflows from glimpse agents
- Combine screen recording with workflow automation
- Use workflows as tools in larger automation pipelines
- Leverage both technologies for comprehensive demo creation

Example combining both:

```python
from glimpse.workflow_bridge import workflow_bridge
# ... your existing glimpse code ...

# Record with glimpse, automate with workflows
async def enhanced_demo():
    # Use glimpse for complex interactions
    await glimpse_agent.perform_task("navigate to website")
    
    # Use workflow for repetitive tasks
    await workflow_bridge.run_workflow_as_tool(
        "form_filler.workflow.json",
        "Fill customer information form"
    )
``` 