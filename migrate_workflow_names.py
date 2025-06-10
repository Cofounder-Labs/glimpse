#!/usr/bin/env python3
"""
Migration script to rename existing workflow files with meaningful names.

This script reads existing workflows and renames their files to use
meaningful descriptions instead of generic "recorded_workflow_" prefixes.
"""

import json
import os
import shutil
from pathlib import Path
from datetime import datetime

def clean_workflow_name(raw_name: str) -> str:
    """Clean a workflow name for filesystem safety."""
    # Clean the name: remove special characters, limit length
    clean_name = ''.join(c if c.isalnum() or c in ' -_' else '' for c in raw_name)
    clean_name = clean_name.strip().replace(' ', '_')[:50]  # Limit length and replace spaces
    return clean_name

def migrate_workflow_names(workflows_dir: Path, dry_run: bool = True):
    """Migrate workflow names to use meaningful descriptions."""
    
    print(f"🔄 Migrating Workflow Names")
    print(f"📁 Directory: {workflows_dir}")
    print(f"🎭 Mode: {'DRY RUN' if dry_run else 'ACTUAL MIGRATION'}")
    print("=" * 60)
    
    if not workflows_dir.exists():
        print(f"❌ Directory {workflows_dir} does not exist!")
        return False
    
    workflow_files = list(workflows_dir.glob("*.workflow.json"))
    if not workflow_files:
        print("📭 No workflow files found.")
        return True
    
    print(f"📋 Found {len(workflow_files)} workflow files to process:")
    print()
    
    migration_plan = []
    errors = []
    
    for workflow_file in workflow_files:
        try:
            # Read workflow data
            with open(workflow_file, 'r') as f:
                workflow_data = json.load(f)
            
            # Extract meaningful name
            workflow_description = workflow_data.get("description", "")
            workflow_internal_name = workflow_data.get("name", "")
            current_filename = workflow_file.name.replace('.workflow.json', '')
            
            # Generate new name
            new_name = None
            reason = ""
            
            # Skip if already has meaningful name (not generic recorded_workflow format)
            if not current_filename.startswith("recorded_workflow_"):
                reason = "already has meaningful name"
                new_name = current_filename
            
            # Use internal workflow name if available and meaningful
            elif workflow_internal_name and not workflow_internal_name.startswith("recorded_workflow_"):
                clean_name = clean_workflow_name(workflow_internal_name)
                if clean_name:
                    # Add timestamp for uniqueness
                    timestamp_suffix = datetime.now().strftime("%Y%m%d_%H%M%S")
                    new_name = f"{clean_name}_{timestamp_suffix}"
                    reason = f"using internal name: '{workflow_internal_name}'"
            
            # Use description if available
            elif workflow_description and len(workflow_description.strip()) > 0:
                clean_desc = workflow_description.strip()
                if not clean_desc.startswith("Recorded workflow from"):
                    clean_name = clean_workflow_name(clean_desc)
                    if clean_name:
                        # Add timestamp for uniqueness  
                        timestamp_suffix = datetime.now().strftime("%Y%m%d_%H%M%S")
                        new_name = f"{clean_name}_{timestamp_suffix}"
                        reason = f"using description: '{clean_desc[:40]}...'"
            
            # Fallback to keeping current name
            if not new_name:
                new_name = current_filename
                reason = "no meaningful name found, keeping current"
            
            migration_plan.append({
                'current_file': workflow_file,
                'current_name': current_filename,
                'new_name': new_name,
                'reason': reason,
                'needs_migration': new_name != current_filename
            })
            
        except Exception as e:
            error_msg = f"Error processing {workflow_file.name}: {e}"
            errors.append(error_msg)
            print(f"❌ {error_msg}")
    
    # Display migration plan
    print("📋 Migration Plan:")
    print("-" * 60)
    
    needs_migration = [item for item in migration_plan if item['needs_migration']]
    no_change = [item for item in migration_plan if not item['needs_migration']]
    
    for item in needs_migration:
        print(f"🔄 RENAME:")
        print(f"   From: {item['current_name']}")
        print(f"   To:   {item['new_name']}")
        print(f"   Why:  {item['reason']}")
        print()
    
    for item in no_change:
        print(f"✅ SKIP: {item['current_name']} - {item['reason']}")
    
    print(f"\n📊 Summary:")
    print(f"   • {len(needs_migration)} files will be renamed")
    print(f"   • {len(no_change)} files will remain unchanged")
    print(f"   • {len(errors)} errors encountered")
    
    if errors:
        print(f"\n❌ Errors:")
        for error in errors:
            print(f"   • {error}")
    
    if not needs_migration:
        print(f"\n🎉 No migration needed! All workflows already have meaningful names.")
        return True
    
    if dry_run:
        print(f"\n🎭 This was a DRY RUN - no files were actually renamed.")
        print(f"💡 Run with --apply to perform the actual migration.")
        return True
    
    # Perform actual migration
    print(f"\n🚀 Performing actual migration...")
    successful_migrations = 0
    
    for item in needs_migration:
        try:
            old_path = item['current_file']
            new_path = old_path.parent / f"{item['new_name']}.workflow.json"
            
            # Check if new path already exists
            if new_path.exists():
                print(f"⚠️  Skipping {item['current_name']} - target already exists: {new_path.name}")
                continue
            
            # Rename the file
            shutil.move(str(old_path), str(new_path))
            print(f"✅ Renamed: {item['current_name']} → {item['new_name']}")
            successful_migrations += 1
            
        except Exception as e:
            print(f"❌ Failed to rename {item['current_name']}: {e}")
    
    print(f"\n🎉 Migration complete!")
    print(f"   • {successful_migrations}/{len(needs_migration)} files successfully renamed")
    
    return successful_migrations == len(needs_migration)

def main():
    """Main function to run the migration."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Migrate workflow file names to use meaningful descriptions")
    parser.add_argument("--workflows-dir", type=str, default="saved_workflows", 
                       help="Directory containing workflow files (default: saved_workflows)")
    parser.add_argument("--apply", action="store_true", 
                       help="Actually perform the migration (default is dry run)")
    
    args = parser.parse_args()
    
    workflows_dir = Path(args.workflows_dir)
    dry_run = not args.apply
    
    print("🔧 Workflow File Name Migration Tool")
    print("🎯 Converts 'recorded_workflow_TIMESTAMP' to meaningful names")
    print()
    
    try:
        success = migrate_workflow_names(workflows_dir, dry_run=dry_run)
        
        if success:
            print("\n✨ Migration completed successfully!")
            if dry_run:
                print("🔄 Run with --apply to perform actual renaming")
        else:
            print("\n❌ Migration completed with errors")
            
    except KeyboardInterrupt:
        print("\n⏹️  Migration cancelled by user")
    except Exception as e:
        print(f"\n💥 Migration failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 