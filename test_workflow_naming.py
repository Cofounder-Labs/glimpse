#!/usr/bin/env python3
"""
Test script to validate workflow naming improvements.

This tests the workflow filename generation from meaningful names
instead of generic "recorded_workflow_" prefixes.
"""

import re
from datetime import datetime

def clean_workflow_name(raw_name: str) -> str:
    """Test the workflow name cleaning logic."""
    # Clean the name: remove special characters, limit length, add timestamp for uniqueness
    clean_name = ''.join(c if c.isalnum() or c in ' -_' else '' for c in raw_name)
    clean_name = clean_name.strip().replace(' ', '_')[:50]  # Limit length and replace spaces
    timestamp_suffix = datetime.now().strftime("%Y%m%d_%H%M%S")
    workflow_name = f"{clean_name}_{timestamp_suffix}" if clean_name else f"recorded_workflow_{timestamp_suffix}"
    return workflow_name

def test_workflow_naming():
    """Test various workflow naming scenarios."""
    
    print("🧪 Testing Workflow Naming Logic")
    print("=" * 50)
    
    test_cases = [
        "A workflow to search and display weather information for a specific location on weather.com",
        "This workflow automates searching for cat videos on Google and navigating to short videos",
        "This workflow navigates to the Yahoo News Health section",
        "Automates the process of searching for cat videos on Google and accessing the short videos section",
        "Government Form Submission",
        "Navigate to Dashboard and Generate Report",
        "User Registration & Email Verification Process",
        "E-commerce Product Search and Purchase Flow",
        "Social Media Content Publishing Workflow",
        "",  # Empty name test
        "A" * 100,  # Very long name test
        "Special!@#$%^&*()Characters[]{};':\",./<>?",  # Special characters test
    ]
    
    print("🎯 Testing name cleaning and generation:")
    for i, test_name in enumerate(test_cases, 1):
        cleaned = clean_workflow_name(test_name)
        print(f"{i:2d}. Input:  '{test_name[:60]}{'...' if len(test_name) > 60 else ''}'")
        print(f"    Output: '{cleaned}'")
        print()
    
    print("✅ Key improvements:")
    print("   • Uses meaningful workflow descriptions instead of 'recorded_workflow_'")
    print("   • Cleans names to be filesystem-safe") 
    print("   • Limits length to 50 characters + timestamp")
    print("   • Handles edge cases (empty names, special characters)")
    print("   • Still includes timestamp for uniqueness")
    
    return True

def simulate_workflow_examples():
    """Show examples of the new naming with your actual workflow list."""
    
    print("\n🚀 Examples with Your Actual Workflows")
    print("=" * 50)
    
    # Based on the workflow names shown in your screenshot
    example_workflows = [
        "A workflow to search and display weather information for a specific location on weather.com. (4 steps)",
        "This workflow automates searching for cat videos on Google and navigating to short videos. (4 steps)", 
        "This workflow navigates to the Yahoo News Health section. (2 steps)",
        "Automates the process of searching for cat videos on Google and accessing the short videos section. (4 steps)",
        "This workflow automates navigating to Yahoo News, accessing the Politics section, and selecting a specific article. (4 steps)",
        "Automates searching for cat videos on Google and navigating to the short video section. (4 steps)",
        "This workflow automates the search for cat videos on Google and navigates to the results specifically for short videos. (4 steps)",
        "A workflow to navigate directly to the Yahoo Mail overview page. (1 steps)"
    ]
    
    print("📋 Before (old naming):")
    for i, _ in enumerate(example_workflows):
        old_name = f"recorded_workflow_{datetime.now().strftime('%Y%m%d')}_{183427 + i}"
        print(f"   {old_name}")
    
    print(f"\n📋 After (new meaningful naming):")
    for workflow_desc in example_workflows:
        # Extract just the main description part (before the steps count)
        main_desc = workflow_desc.split(" (")[0] 
        new_name = clean_workflow_name(main_desc)
        print(f"   {new_name}")
    
    print(f"\n🎯 Benefits:")
    print(f"   ✅ Immediately recognizable workflow purpose")
    print(f"   ✅ No more generic 'recorded_workflow_' prefix") 
    print(f"   ✅ Easy to find specific workflows in the list")
    print(f"   ✅ Meaningful names in file system")

if __name__ == "__main__":
    print("🔧 Testing Improved Workflow Naming")
    print("🎯 Moving from 'recorded_workflow_TIMESTAMP' to meaningful names")
    print()
    
    try:
        test_workflow_naming()
        simulate_workflow_examples()
        
        print(f"\n🎉 Workflow naming improvements ready!")
        print(f"✨ Your workflows will now have meaningful, descriptive names")
        
    except Exception as e:
        print(f"\n💥 Test failed with error: {e}")
        import traceback
        traceback.print_exc() 