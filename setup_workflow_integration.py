#!/usr/bin/env python3
"""
Setup script for integrating workflow-use with glimpse.
This script ensures all necessary components are properly configured.
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def run_command(cmd, cwd=None, check=True):
    """Run a command and print its output."""
    print(f"Running: {cmd}")
    try:
        result = subprocess.run(
            cmd, 
            shell=True, 
            cwd=cwd, 
            check=check,
            capture_output=True,
            text=True
        )
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(result.stderr)
        return result
    except subprocess.CalledProcessError as e:
        print(f"Command failed: {e}")
        if e.stdout:
            print(f"STDOUT: {e.stdout}")
        if e.stderr:
            print(f"STDERR: {e.stderr}")
        if check:
            sys.exit(1)
        return e

def main():
    print("🔧 Setting up workflow-use integration with Glimpse...")
    
    # Get project root
    project_root = Path(__file__).parent
    workflow_use_dir = project_root / "workflow-use-main"
    workflows_dir = workflow_use_dir / "workflows"
    extension_dir = workflow_use_dir / "extension"
    
    # Check if workflow-use-main exists
    if not workflow_use_dir.exists():
        print("❌ workflow-use-main directory not found!")
        print("Please ensure the workflow-use-main folder is in the project root.")
        sys.exit(1)
    
    print("✅ Found workflow-use-main directory")
    
    # Setup workflows environment
    if workflows_dir.exists():
        print("📦 Setting up workflows environment...")
        
        # Check if uv is installed
        uv_check = run_command("uv --version", check=False)
        if uv_check.returncode != 0:
            print("❌ uv not found. Please install uv first:")
            print("curl -LsSf https://astral.sh/uv/install.sh | sh")
            sys.exit(1)
        
        print("✅ uv is available")
        
        # Sync dependencies
        print("📦 Syncing workflow dependencies...")
        run_command("uv sync", cwd=workflows_dir)
        
        # Install playwright
        print("🎭 Installing Playwright...")
        run_command("uv run playwright install chromium", cwd=workflows_dir)
        
        print("✅ Workflows environment setup complete")
    else:
        print("⚠️  workflows directory not found, skipping workflows setup")
    
    # Setup extension
    if extension_dir.exists():
        print("🔧 Setting up extension...")
        
        # Check if npm is installed
        npm_check = run_command("npm --version", check=False)
        if npm_check.returncode != 0:
            print("❌ npm not found. Please install Node.js and npm first.")
            sys.exit(1)
        
        print("✅ npm is available")
        
        # Install and build extension
        print("📦 Installing extension dependencies...")
        run_command("npm install", cwd=extension_dir)
        
        print("🔨 Building extension...")
        run_command("npm run build", cwd=extension_dir)
        
        print("✅ Extension setup complete")
    else:
        print("⚠️  extension directory not found, skipping extension setup")
    
    # Create necessary directories
    print("📁 Creating necessary directories...")
    
    saved_workflows_dir = project_root / "saved_workflows"
    saved_workflows_dir.mkdir(exist_ok=True)
    print(f"✅ Created {saved_workflows_dir}")
    
    # Set up environment variables file if it doesn't exist
    env_file = workflows_dir / ".env" if workflows_dir.exists() else None
    env_example = workflows_dir / ".env.example" if workflows_dir.exists() else None
    
    if env_file and env_example and env_example.exists() and not env_file.exists():
        print("📝 Setting up environment file...")
        shutil.copy(env_example, env_file)
        print(f"✅ Created {env_file}")
        print("⚠️  Please add your OPENAI_API_KEY to the .env file:")
        print(f"   {env_file}")
    
    print("\n🎉 Workflow-use integration setup complete!")
    print("\n📋 Next steps:")
    print("1. Make sure your OPENAI_API_KEY is set in the environment")
    if env_file:
        print(f"   - Edit {env_file} and add your API key")
    print("2. Start the Glimpse API server:")
    print("   python -m glimpse.run")
    print("3. Start the frontend:")
    print("   cd frontend && npm run dev")
    print("4. Navigate to the Free Run mode and try recording a workflow!")

if __name__ == "__main__":
    main() 