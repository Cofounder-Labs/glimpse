"""
Bridge module to integrate workflow-use functionality with glimpse.
"""

import asyncio
import sys
from pathlib import Path
from typing import Optional, Dict, Any
import json

# Add workflow-use to path
workflow_use_path = Path(__file__).parent.parent / "workflow-use-main" / "workflows"
if workflow_use_path.exists():
    sys.path.insert(0, str(workflow_use_path))

try:
    from workflow_use import Workflow
except ImportError:
    print("⚠️ workflow-use not found. Run python setup_workflow_use.py first.")
    Workflow = None


class WorkflowBridge:
    """Bridge class to interface with workflow-use from glimpse."""
    
    def __init__(self):
        self.workflow_dir = Path(__file__).parent.parent / "workflow-use-main" / "workflows"
        self.examples_dir = self.workflow_dir / "examples"
    
    def is_available(self) -> bool:
        """Check if workflow-use is properly set up."""
        return Workflow is not None and self.workflow_dir.exists()
    
    def list_workflows(self) -> list[str]:
        """List available workflow files."""
        if not self.examples_dir.exists():
            return []
        
        workflow_files = list(self.examples_dir.glob("*.workflow.json"))
        return [f.name for f in workflow_files]
    
    async def run_workflow_as_tool(self, workflow_file: str, prompt: str) -> Dict[str, Any]:
        """Run a workflow as a tool with a given prompt."""
        if not self.is_available():
            raise RuntimeError("workflow-use is not available")
        
        workflow_path = self.examples_dir / workflow_file
        if not workflow_path.exists():
            raise FileNotFoundError(f"Workflow file not found: {workflow_file}")
        
        try:
            workflow = Workflow.load_from_file(str(workflow_path))
            result = await workflow.run_as_tool(prompt)
            return {
                "success": True,
                "result": result,
                "workflow_file": workflow_file,
                "prompt": prompt
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "workflow_file": workflow_file,
                "prompt": prompt
            }
    
    async def run_workflow(self, workflow_file: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Run a workflow with predefined variables."""
        if not self.is_available():
            raise RuntimeError("workflow-use is not available")
        
        workflow_path = self.examples_dir / workflow_file
        if not workflow_path.exists():
            raise FileNotFoundError(f"Workflow file not found: {workflow_file}")
        
        try:
            workflow = Workflow.load_from_file(str(workflow_path))
            if variables:
                # Set variables on workflow if supported
                for key, value in variables.items():
                    setattr(workflow, key, value)
            
            result = await workflow.run()
            return {
                "success": True,
                "result": result,
                "workflow_file": workflow_file,
                "variables": variables
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "workflow_file": workflow_file,
                "variables": variables
            }
    
    def get_workflow_info(self, workflow_file: str) -> Dict[str, Any]:
        """Get information about a workflow file."""
        workflow_path = self.examples_dir / workflow_file
        if not workflow_path.exists():
            raise FileNotFoundError(f"Workflow file not found: {workflow_file}")
        
        try:
            with open(workflow_path, 'r') as f:
                workflow_data = json.load(f)
            
            return {
                "name": workflow_data.get("name", workflow_file),
                "description": workflow_data.get("description", ""),
                "steps": len(workflow_data.get("steps", [])),
                "variables": workflow_data.get("variables", {}),
                "file": workflow_file
            }
        except Exception as e:
            return {
                "error": str(e),
                "file": workflow_file
            }


# Global instance
workflow_bridge = WorkflowBridge()


async def demo_workflow_integration():
    """Demo function showing how to use workflow-use integration."""
    if not workflow_bridge.is_available():
        print("❌ workflow-use is not available. Please run setup first.")
        return
    
    print("🔧 Available workflows:")
    workflows = workflow_bridge.list_workflows()
    for workflow in workflows:
        info = workflow_bridge.get_workflow_info(workflow)
        print(f"  • {workflow}: {info.get('description', 'No description')}")
    
    if workflows:
        # Try running the first workflow as a tool
        first_workflow = workflows[0]
        print(f"\n🚀 Testing workflow: {first_workflow}")
        
        result = await workflow_bridge.run_workflow_as_tool(
            first_workflow, 
            "Fill the form with example data for testing"
        )
        
        if result["success"]:
            print("✅ Workflow executed successfully!")
            print(f"Result: {result['result']}")
        else:
            print("❌ Workflow execution failed:")
            print(f"Error: {result['error']}")


if __name__ == "__main__":
    asyncio.run(demo_workflow_integration()) 