#!/usr/bin/env python3
"""
Setup script for workflow-use integration with glimpse project.
This script sets up the browser extension, UI, and workflow environment.
"""

import os
import subprocess
import sys
from pathlib import Path
import shutil

def run_command(cmd, cwd=None, shell=False):
    """Run a command and return the result."""
    print(f"Running: {cmd}")
    try:
        if isinstance(cmd, str) and not shell:
            cmd = cmd.split()
        result = subprocess.run(cmd, cwd=cwd, shell=shell, check=True, capture_output=True, text=True)
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {e}")
        if e.stderr:
            print(f"Error output: {e.stderr}")
        return False

def check_node_npm():
    """Check if Node.js and npm are installed."""
    try:
        subprocess.run(['node', '--version'], check=True, capture_output=True)
        subprocess.run(['npm', '--version'], check=True, capture_output=True)
        print("✓ Node.js and npm are installed")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Node.js and/or npm not found. Please install Node.js first.")
        print("Visit: https://nodejs.org/")
        return False

def setup_environment():
    """Set up the .env file for workflow-use."""
    env_example = Path("workflow-use-main/workflows/.env.example")
    env_file = Path("workflow-use-main/workflows/.env")
    
    if env_example.exists():
        if not env_file.exists():
            shutil.copy(env_example, env_file)
            print("✓ Created .env file from .env.example")
            print("⚠️  Please add your OPENAI_API_KEY to workflow-use-main/workflows/.env")
        else:
            print("✓ .env file already exists")
    else:
        print("❌ .env.example not found")

def setup_extension():
    """Set up the browser extension."""
    extension_dir = Path("workflow-use-main/extension")
    
    if not extension_dir.exists():
        print("❌ Extension directory not found")
        return False
    
    print("📦 Setting up browser extension...")
    
    # Install dependencies
    if not run_command("npm install", cwd=extension_dir):
        return False
    
    # Build extension
    if not run_command("npm run build", cwd=extension_dir):
        return False
    
    print("✓ Browser extension built successfully")
    return True

def setup_ui():
    """Set up the React UI."""
    ui_dir = Path("workflow-use-main/ui")
    
    if not ui_dir.exists():
        print("❌ UI directory not found")
        return False
    
    print("🎨 Setting up React UI...")
    
    # Install dependencies
    if not run_command("npm install", cwd=ui_dir):
        return False
    
    print("✓ React UI dependencies installed")
    return True

def setup_python_dependencies():
    """Install Python dependencies using poetry."""
    print("🐍 Installing Python dependencies with poetry...")
    
    if not run_command("poetry install"):
        print("❌ Failed to install Python dependencies")
        return False
    
    print("✓ Python dependencies installed")
    return True

def setup_playwright():
    """Install Playwright browsers."""
    print("🎭 Installing Playwright browsers...")
    
    if not run_command("poetry run playwright install chromium"):
        print("❌ Failed to install Playwright browsers")
        return False
    
    print("✓ Playwright browsers installed")
    return True

def create_workflow_runner():
    """Create a convenience script to run workflow-use commands."""
    runner_content = '''#!/usr/bin/env python3
"""
Convenience script to run workflow-use commands.
"""

import sys
import subprocess
from pathlib import Path

def main():
    workflow_dir = Path(__file__).parent / "workflow-use-main" / "workflows"
    
    if not workflow_dir.exists():
        print("❌ workflow-use-main/workflows directory not found")
        sys.exit(1)
    
    # Pass all arguments to the workflow CLI
    cmd = ["poetry", "run", "python", "cli.py"] + sys.argv[1:]
    
    try:
        subprocess.run(cmd, cwd=workflow_dir, check=True)
    except subprocess.CalledProcessError as e:
        sys.exit(e.returncode)
    except KeyboardInterrupt:
        print("\\n❌ Interrupted by user")
        sys.exit(1)

if __name__ == "__main__":
    main()
'''
    
    runner_path = Path("workflow.py")
    with open(runner_path, "w") as f:
        f.write(runner_content)
    
    # Make it executable
    runner_path.chmod(0o755)
    print("✓ Created workflow.py runner script")

def print_usage_instructions():
    """Print usage instructions."""
    print("""
🎉 Setup complete! Here's how to use workflow-use:

📝 Environment Setup:
1. Add your OPENAI_API_KEY to workflow-use-main/workflows/.env

🔧 Running Commands:
• Create a workflow:     python workflow.py create-workflow
• Run workflow as tool:  python workflow.py run-as-tool examples/example.workflow.json --prompt "your prompt"
• Run predefined workflow: python workflow.py run-workflow examples/example.workflow.json
• Launch GUI:           python workflow.py launch-gui
• See all commands:     python workflow.py --help

🌐 Browser Extension:
• Extension built in: workflow-use-main/extension/.wxt/
• Load in Chrome: Go to chrome://extensions/, enable Developer mode, click "Load unpacked", select the .wxt/chrome-mv3 folder

📱 UI Development:
• Start UI dev server: cd workflow-use-main/ui && npm run dev
• Access at: http://localhost:5173

🚀 Quick Start:
1. Set your OPENAI_API_KEY in workflow-use-main/workflows/.env
2. Run: python workflow.py launch-gui
3. Open http://localhost:5173 in your browser
""")

def main():
    """Main setup function."""
    print("🚀 Setting up workflow-use integration with glimpse...")
    
    # Check prerequisites
    if not check_node_npm():
        sys.exit(1)
    
    # Setup steps
    setup_environment()
    
    if not setup_python_dependencies():
        sys.exit(1)
    
    if not setup_playwright():
        sys.exit(1)
    
    if not setup_extension():
        sys.exit(1)
    
    if not setup_ui():
        sys.exit(1)
    
    create_workflow_runner()
    print_usage_instructions()

if __name__ == "__main__":
    main() 