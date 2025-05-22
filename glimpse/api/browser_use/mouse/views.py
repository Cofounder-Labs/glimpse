"""
Models for mouse movement patterns and configuration.
"""

import enum
from typing import Optional
from pydantic import BaseModel, Field


class MouseMovementPattern(str, enum.Enum):
    """Enum for different types of mouse movement patterns."""
    
    LINEAR = "linear"  # Simple straight line movement
    BEZIER = "bezier"  # Curved movement using bezier curves
    HUMAN = "human"    # More realistic human-like movement with slight variations


class MouseMovementConfig(BaseModel):
    """Configuration for mouse movement behavior."""
    
    enabled: bool = Field(
        default=True, 
        description="Whether to use realistic mouse movements"
    )
    pattern: MouseMovementPattern = Field(
        default=MouseMovementPattern.LINEAR,
        description="Type of mouse movement pattern to use"
    )
    speed_variation: float = Field(
        default=0.3, 
        description="Amount of speed variation (0-1) for more human-like movement"
    )
    min_movement_time: float = Field(
        default=0.3,
        description="Minimum time in seconds to complete a mouse movement"
    )
    max_movement_time: float = Field(
        default=1.0,
        description="Maximum time in seconds to complete a mouse movement"
    )
    overshoot_probability: float = Field(
        default=0.1,
        description="Probability (0-1) of overshooting the target slightly"
    ) 
    show_visual_cursor: bool = Field(
        default=False,
        description="Show a visual cursor in the browser to visualize mouse movements"
    ) 