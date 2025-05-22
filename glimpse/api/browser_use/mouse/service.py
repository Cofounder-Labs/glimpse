"""
Service for generating and executing realistic mouse movements.
"""

import asyncio
import logging
import math
import random
from typing import Tuple, List, Optional

from playwright.async_api import Page, ElementHandle

from browser_use.mouse.views import MouseMovementPattern, MouseMovementConfig

logger = logging.getLogger(__name__)


class MouseMovementService:
    """Service for handling realistic mouse movements."""
    
    def __init__(self, config: Optional[MouseMovementConfig] = None):
        """Initialize the mouse movement service with configuration."""
        self.config = config or MouseMovementConfig()
        logger.info(f"🖱️ Mouse Movement Service initialized with pattern={self.config.pattern.value}, enabled={self.config.enabled}")
        self._visual_cursor_initialized = False
        self._last_page_url = None
        
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
                // Default to center of viewport if position is unknown
                return {
                    x: window.innerWidth / 2,
                    y: window.innerHeight / 2
                };
            }
        """)
        return (position["x"], position["y"])
    
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
        script = """
        () => {
            // Remove any existing cursor
            const existingCursor = document.getElementById('browser-use-visual-cursor');
            if (existingCursor) {
                existingCursor.remove();
            }
            
            // Create cursor element
            const cursor = document.createElement('div');
            cursor.id = 'browser-use-visual-cursor';
            cursor.style.position = 'fixed';
            cursor.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
            cursor.style.borderRadius = '50%';
            cursor.style.width = '25px';
            cursor.style.height = '25px';
            cursor.style.top = '0';
            cursor.style.left = '0';
            cursor.style.zIndex = '9999999';
            cursor.style.pointerEvents = 'none';
            cursor.style.transition = 'transform 0.1s ease-out';
            cursor.style.boxShadow = '0 0 10px 2px yellow';
            cursor.style.border = '2px solid white';
            
            document.body.appendChild(cursor);
            
            // Store a reference to the cursor element for future use
            window.__browserUseVisualCursor = cursor;
            
            console.log('Visual cursor created');
        }
        """
        await page.evaluate(script)
        self._visual_cursor_initialized = True
    
    async def update_visual_cursor(self, page: Page, x: int, y: int, clicking: bool = False):
        """Update the position of the visual cursor."""
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
                
                // Show click effect
                if (params.clicking) {
                    // Create a click ripple effect
                    const ripple = document.createElement('div');
                    ripple.style.position = 'fixed';
                    ripple.style.left = (params.x - 25) + 'px';
                    ripple.style.top = (params.y - 25) + 'px';
                    ripple.style.width = '50px';
                    ripple.style.height = '50px';
                    ripple.style.borderRadius = '50%';
                    ripple.style.backgroundColor = 'rgba(255, 255, 0, 0.5)';
                    ripple.style.zIndex = '9999998';
                    ripple.style.pointerEvents = 'none';
                    ripple.style.animation = 'browser-use-ripple 0.5s ease-out';
                    
                    // Add the keyframes if they don't exist
                    if (!document.getElementById('browser-use-ripple-keyframes')) {
                        const style = document.createElement('style');
                        style.id = 'browser-use-ripple-keyframes';
                        style.textContent = `
                            @keyframes browser-use-ripple {
                                0% { transform: scale(0.5); opacity: 1; }
                                100% { transform: scale(1.5); opacity: 0; }
                            }
                        `;
                        document.head.appendChild(style);
                    }
                    
                    document.body.appendChild(ripple);
                    setTimeout(() => ripple.remove(), 500);
                    
                    // Also change cursor appearance
                    cursor.style.backgroundColor = 'rgba(255, 0, 0, 1)';
                    cursor.style.transform = 'scale(0.7)';
                    setTimeout(() => {
                        cursor.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
                        cursor.style.transform = 'scale(1)';
                    }, 200);
                }
            } else {
                console.warn('Visual cursor element not found when trying to update position');
            }
        }
        """
        await page.evaluate(script, {'x': x, 'y': y, 'clicking': clicking})
    
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
            logger.info(f"🖱️ Page navigation detected, resetting visual cursor state")
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
        
        # Get current position for visual cursor
        if self.config.show_visual_cursor:
            x, y = await self.get_current_mouse_position(page)
            await self.update_visual_cursor(page, x, y, clicking=True)
        
        # Click the element
        logger.info("🖱️ Clicking element")
        await element.click() 