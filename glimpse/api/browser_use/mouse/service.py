"""
Service for generating and executing realistic mouse movements.
"""

import asyncio
import logging
import math
import random
import time
import json
from typing import Tuple, List, Optional, Union
from pathlib import Path

from playwright.async_api import Page, ElementHandle

from browser_use.mouse.views import MouseMovementPattern, MouseMovementConfig
from .cursor_design import get_mouse_pointer_javascript, get_pointing_hand_javascript

logger = logging.getLogger(__name__)


class ClickEvent:
    """Represents a single click event with timing and position data."""
    
    def __init__(self, timestamp: float, x: int, y: int, page_url: str = ""):
        self.timestamp = timestamp  # Time since recording started
        self.x = x
        self.y = y
        self.page_url = page_url
    
    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "x": self.x,
            "y": self.y,
            "page_url": self.page_url
        }


class MouseMovementService:
    """Service for handling realistic mouse movements with click tracking."""
    
    def __init__(self, config: Optional[MouseMovementConfig] = None):
        """Initialize the mouse movement service with configuration."""
        self.config = config or MouseMovementConfig()
        logger.info(f"🖱️ Mouse Movement Service initialized with pattern={self.config.pattern.value}, enabled={self.config.enabled}")
        self._visual_cursor_initialized = False
        self._last_page_url = None
        self._stored_position = None  # Store mouse position across page loads
        
        # Click tracking
        self._recording_start_time = None
        self._click_events: List[ClickEvent] = []
        self._recording_dir = None
        
    def start_recording(self, recording_dir: Optional[str] = None):
        """Start tracking clicks for the recording session."""
        self._recording_start_time = time.time()
        self._click_events.clear()
        self._recording_dir = recording_dir
        logger.info(f"🖱️ Started click tracking for recording session")
        
    def stop_recording(self) -> List[dict]:
        """Stop tracking clicks and return the recorded events."""
        click_data = [event.to_dict() for event in self._click_events]
        logger.info(f"🖱️ Stopped click tracking. Recorded {len(click_data)} click events")
        
        # Save click data to file if recording directory is provided
        if self._recording_dir and click_data:
            self._save_click_data(click_data)
        
        return click_data
    
    def _save_click_data(self, click_data: List[dict]):
        """Save click data to a JSON file in the recording directory."""
        try:
            recording_path = Path(self._recording_dir)
            click_file = recording_path / "clicks.json"
            
            with open(click_file, 'w') as f:
                json.dump({
                    "recording_start_time": self._recording_start_time,
                    "clicks": click_data
                }, f, indent=2)
                
            logger.info(f"🖱️ Saved click data to {click_file}")
        except Exception as e:
            logger.error(f"🖱️ Failed to save click data: {e}")
    
    def _record_click(self, x: int, y: int, page_url: str = ""):
        """Record a click event with current timestamp."""
        if self._recording_start_time is not None:
            current_time = time.time()
            timestamp = current_time - self._recording_start_time
            
            click_event = ClickEvent(timestamp, x, y, page_url)
            self._click_events.append(click_event)
            
            logger.info(f"🖱️ Recorded click at ({x}, {y}) at {timestamp:.2f}s on {page_url}")
    
    async def get_element_center(self, element: ElementHandle) -> Tuple[int, int]:
        """Get the center coordinates of an element."""
        box = await element.bounding_box()
        if not box:
            raise ValueError("Could not get bounding box for element")
        
        return (
            int(box["x"] + box["width"] / 2),
            int(box["y"] + box["height"] / 2)
        )
    
    async def get_current_mouse_position(self, page: Page) -> Tuple[int, int]:
        """Get the current mouse position on the page."""
        # Unfortunately Playwright doesn't provide a direct way to get mouse position
        # We'll use JavaScript to get it
        position = await page.evaluate("""
            () => {
                if (window.__mousePosition) {
                    return window.__mousePosition;
                }
                if (window.__browserUseCursorX !== undefined && window.__browserUseCursorY !== undefined) {
                    return {
                        x: window.__browserUseCursorX,
                        y: window.__browserUseCursorY
                    };
                }
                return null; // Don't provide default, let Python handle it
            }
        """)
        
        # If we got a position from JavaScript, use it and store it
        if position:
            self._stored_position = (position["x"], position["y"])
            return (position["x"], position["y"])
        
        # If we have a stored position from previous page, use it
        if self._stored_position:
            return self._stored_position
        
        # Only as last resort, default to center of viewport
        viewport_center = await page.evaluate("""
            () => ({
                x: window.innerWidth / 2,
                y: window.innerHeight / 2
            })
        """)
        
        self._stored_position = (viewport_center["x"], viewport_center["y"])
        return (viewport_center["x"], viewport_center["y"])
    
    async def setup_mouse_tracking(self, page: Page):
        """Set up JavaScript tracking of mouse position."""
        logger.info("🖱️ Setting up mouse position tracking in page")
        await page.evaluate("""
            () => {
                if (!window.__mouseTrackingInitialized) {
                    window.__mousePosition = {
                        x: window.innerWidth / 2,
                        y: window.innerHeight / 2
                    };
                    
                    document.addEventListener('mousemove', (e) => {
                        window.__mousePosition = {
                            x: e.clientX,
                            y: e.clientY
                        };
                    });
                    
                    window.__mouseTrackingInitialized = true;
                }
            }
        """)
    
    async def create_visual_cursor(self, page: Page):
        """Create a visual cursor element in the page to show mouse movements."""
        if self._visual_cursor_initialized:
            return
            
        logger.info("🖱️ Creating visual cursor indicator")
        script = get_mouse_pointer_javascript()
        await page.evaluate(script)
        self._visual_cursor_initialized = True
        
        # Position the cursor at the stored location if available
        if self._stored_position:
            await self.update_visual_cursor(page, self._stored_position[0], self._stored_position[1])
    
    async def update_visual_cursor(self, page: Page, x: int, y: int, clicking: bool = False):
        """Update the position of the visual cursor."""
        # Store the new position
        self._stored_position = (x, y)
        
        script = """
        (params) => {
            const cursor = window.__browserUseVisualCursor;
            if (cursor) {
                // Move cursor directly using left/top instead of transform
                cursor.style.left = params.x + 'px';
                cursor.style.top = params.y + 'px';
                
                // Store current position in window for tracking
                window.__browserUseCursorX = params.x;
                window.__browserUseCursorY = params.y;
                
                // Debug log
                console.log('Updating cursor position to:', params.x, params.y);
            }
        }
        """
        await page.evaluate(script, {"x": x, "y": y, "clicking": clicking})
        
        # Handle cursor shape change during clicking
        if clicking:
            # Change to hand cursor
            hand_script = get_pointing_hand_javascript()
            await page.evaluate(hand_script)
            
            # Add click ripple effect
            ripple_script = """
            (params) => {
                // Create a click ripple effect
                const ripple = document.createElement('div');
                ripple.style.position = 'fixed';
                ripple.style.left = (params.x - 15) + 'px';
                ripple.style.top = (params.y - 15) + 'px';
                ripple.style.width = '30px';
                ripple.style.height = '30px';
                ripple.style.borderRadius = '50%';
                ripple.style.backgroundColor = 'rgba(0, 123, 255, 0.3)';
                ripple.style.border = '2px solid rgba(0, 123, 255, 0.6)';
                ripple.style.zIndex = '9999998';
                ripple.style.pointerEvents = 'none';
                ripple.style.animation = 'browser-use-ripple 0.6s ease-out';
                
                // Add the keyframes if they don't exist
                if (!document.getElementById('browser-use-ripple-keyframes')) {
                    const style = document.createElement('style');
                    style.id = 'browser-use-ripple-keyframes';
                    style.textContent = `
                        @keyframes browser-use-ripple {
                            0% { transform: scale(0.3); opacity: 1; }
                            100% { transform: scale(1.5); opacity: 0; }
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                document.body.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
            }
            """
            await page.evaluate(ripple_script, {"x": x, "y": y})
            
            # Reset cursor back to pointer after click
            await asyncio.sleep(0.2)
            pointer_script = get_mouse_pointer_javascript()
            await page.evaluate(pointer_script)
            # Restore position after recreating cursor
            await page.evaluate(script, {"x": x, "y": y, "clicking": False})
    
    def _generate_linear_path(
        self, start_x: int, start_y: int, end_x: int, end_y: int, steps: int
    ) -> List[Tuple[int, int]]:
        """Generate a linear path between two points with the given number of steps."""
        path = []
        for step in range(steps + 1):
            ratio = step / steps
            x = start_x + (end_x - start_x) * ratio
            y = start_y + (end_y - start_y) * ratio
            path.append((int(x), int(y)))
        return path
    
    def _generate_bezier_path(
        self, start_x: int, start_y: int, end_x: int, end_y: int, steps: int
    ) -> List[Tuple[int, int]]:
        """Generate a bezier curve path between two points."""
        # For now, use a simple quadratic bezier curve
        # In a real implementation, you might use more control points
        path = []
        
        # Create a control point that's off the direct line
        distance = math.sqrt((end_x - start_x) ** 2 + (end_y - start_y) ** 2)
        # Control point is perpendicular to midpoint
        mid_x = (start_x + end_x) / 2
        mid_y = (start_y + end_y) / 2
        normal_x = -(end_y - start_y)
        normal_y = end_x - start_x
        # Normalize and scale
        length = math.sqrt(normal_x ** 2 + normal_y ** 2)
        if length != 0:
            normal_x = normal_x / length * distance * 0.2 * random.choice([-1, 1])
            normal_y = normal_y / length * distance * 0.2 * random.choice([-1, 1])
        
        control_x = mid_x + normal_x
        control_y = mid_y + normal_y
        
        for step in range(steps + 1):
            t = step / steps
            # Quadratic bezier formula
            x = (1 - t) ** 2 * start_x + 2 * (1 - t) * t * control_x + t ** 2 * end_x
            y = (1 - t) ** 2 * start_y + 2 * (1 - t) * t * control_y + t ** 2 * end_y
            path.append((int(x), int(y)))
        
        return path
    
    def _generate_human_path(
        self, start_x: int, start_y: int, end_x: int, end_y: int, steps: int
    ) -> List[Tuple[int, int]]:
        """Generate a more realistic human-like path with slight variations."""
        # For simplicity, we'll use bezier path with additional noise
        base_path = self._generate_bezier_path(start_x, start_y, end_x, end_y, steps)
        
        # Add slight variations to each point
        human_path = []
        for x, y in base_path:
            # Add some noise, more at the beginning, less at the end
            distance_ratio = len(human_path) / steps
            noise_factor = self.config.speed_variation * (1 - distance_ratio)
            
            noise_x = random.randint(-3, 3) * noise_factor
            noise_y = random.randint(-3, 3) * noise_factor
            
            human_path.append((int(x + noise_x), int(y + noise_y)))
        
        return human_path
    
    def _generate_path(self, start_x: float, start_y: float, end_x: float, end_y: float, steps: int = 20) -> List[Tuple[float, float]]:
        """Generate a path of coordinates from start to end based on the configured pattern."""
        if self.config.pattern == MouseMovementPattern.LINEAR:
            return self._generate_linear_path(start_x, start_y, end_x, end_y, steps)
        elif self.config.pattern == MouseMovementPattern.BEZIER:
            return self._generate_bezier_path(start_x, start_y, end_x, end_y, steps)
        else:  # Default to HUMAN pattern
            return self._generate_human_path(start_x, start_y, end_x, end_y, steps)
    
    async def move_mouse_to_element(self, page: Page, element: ElementHandle) -> None:
        """Move the mouse to an element with realistic movement."""
        if not self.config.enabled:
            # If disabled, just use playwright's built-in move function
            logger.info("🖱️ Human-like mouse movement disabled, using direct hover")
            await element.hover()
            return
        
        # Reset visual cursor state when page URL changes to handle navigation
        current_url = page.url
        if hasattr(self, '_last_page_url') and self._last_page_url != current_url:
            logger.info(f"🖱️ Page navigation detected, preserving cursor position across page load")
            # Don't reset visual cursor state, just mark it as needing recreation but keep position
            self._visual_cursor_initialized = False
        self._last_page_url = current_url
        
        # Create visual cursor if it doesn't exist and visualization is enabled
        if self.config.show_visual_cursor:
            await self.create_visual_cursor(page)
        
        logger.info(f"🖱️ Starting human-like mouse movement using {self.config.pattern.value} pattern")
        await self.setup_mouse_tracking(page)
        start_x, start_y = await self.get_current_mouse_position(page)
        end_x, end_y = await self.get_element_center(element)
        
        # Get mouse path
        path = self._generate_path(start_x, start_y, end_x, end_y, steps=20)
        
        # Calculate how long the movement should take
        movement_time = random.uniform(
            self.config.min_movement_time, 
            self.config.max_movement_time
        )
        
        # Calculate steps and delay between steps
        steps = len(path)
        delay_between_steps = movement_time / steps
        
        logger.info(f"🖱️ Moving mouse over {movement_time:.2f} seconds with {steps} steps")
        
        # Execute the mouse movement
        for i, (x, y) in enumerate(path):
            # Add variable timing for more human-like movement
            # Slower at start and end, faster in the middle
            progress = i / steps
            speed_factor = 1.0
            if progress < 0.2:
                # Acceleration at start
                speed_factor = 0.5 + 2.5 * progress
            elif progress > 0.8:
                # Deceleration at end
                speed_factor = 0.5 + 2.5 * (1 - progress)
                
            # Apply speed variation
            step_delay = delay_between_steps / speed_factor
            
            # Move mouse to this point
            await page.mouse.move(x, y)
            
            # Store the position after moving
            self._stored_position = (x, y)
            
            # Update visual cursor if enabled
            if self.config.show_visual_cursor:
                await self.update_visual_cursor(page, x, y)
            
            # Wait before next movement
            await asyncio.sleep(step_delay)
            
        logger.info(f"🖱️ Completed mouse movement to element at ({end_x}, {end_y})")
        
    async def click_element_with_movement(self, page: Page, element: ElementHandle, click_delay: float = None) -> None:
        """Move the mouse to an element and then click it."""
        await self.move_mouse_to_element(page, element)
        
        # Small delay before clicking (like a human would)
        delay = click_delay or random.uniform(0.1, 0.3)
        logger.info(f"🖱️ Pausing for {delay:.2f} seconds before clicking")
        await asyncio.sleep(delay)
        
        # Get current position for visual cursor and recording
        x, y = await self.get_current_mouse_position(page)
        
        if self.config.show_visual_cursor:
            await self.update_visual_cursor(page, x, y, clicking=True)
        
        # Record the click event if tracking is active
        self._record_click(x, y, page.url)
        
        # Click the element
        logger.info("🖱️ Clicking element")
        await element.click() 