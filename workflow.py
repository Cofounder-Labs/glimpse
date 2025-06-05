#!/usr/bin/env python3
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
        print("\n❌ Interrupted by user")
        sys.exit(1)

if __name__ == "__main__":
    main()
