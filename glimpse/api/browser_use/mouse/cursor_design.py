"""
Shared cursor design definitions for mouse pointer visualization.
This ensures consistency between the actual implementation and preview files.
Uses realistic SVG cursor designs provided by the user.
"""


def get_mouse_pointer_svg(width: int = 28, height: int = 28) -> str:
    """
    Generate a realistic mouse pointer SVG using the user's provided design.
    
    Args:
        width: SVG width in pixels
        height: SVG height in pixels
    
    Returns:
        Complete SVG element as string
    """
    return f'''<svg width="{width}" height="{height}" viewBox="0 0 28 28" style="pointer-events: none;">
    <polygon fill="#FFFFFF" points="8.2,20.9 8.2,4.9 19.8,16.5 13,16.5 12.6,16.6 "/>
    <polygon fill="#FFFFFF" points="17.3,21.6 13.7,23.1 9,12 12.7,10.5 "/>
    <rect x="12.5" y="13.6" transform="matrix(0.9221 -0.3871 0.3871 0.9221 -5.7605 6.5909)" width="2" height="8"/>
    <polygon points="9.2,7.3 9.2,18.5 12.2,15.6 12.6,15.5 17.4,15.5 "/>
</svg>'''


def get_pointing_hand_svg(width: int = 32, height: int = 32) -> str:
    """
    Generate a realistic pointing hand SVG using the user's provided design.
    
    Args:
        width: SVG width in pixels
        height: SVG height in pixels
    
    Returns:
        Complete SVG element as string
    """
    return f'''<svg width="{width}" height="{height}" viewBox="0 0 32 32" style="pointer-events: none;">
    <g>
        <defs>
            <rect id="SVGID_1_" width="32" height="32"/>
        </defs>
        <clipPath id="SVGID_2_">
            <use href="#SVGID_1_" overflow="visible"/>
        </clipPath>
        <path clip-path="url(#SVGID_2_)" fill="#FFFFFF" d="M11.3,20.4c-0.3-0.4-0.6-1.1-1.2-2c-0.3-0.5-1.2-1.5-1.5-1.9
            c-0.2-0.4-0.2-0.6-0.1-1c0.1-0.6,0.7-1.1,1.4-1.1c0.5,0,1,0.4,1.4,0.7c0.2,0.2,0.5,0.6,0.7,0.8c0.2,0.2,0.2,0.3,0.4,0.5
            c0.2,0.3,0.3,0.5,0.2,0.1c-0.1-0.5-0.2-1.3-0.4-2.1c-0.1-0.6-0.2-0.7-0.3-1.1c-0.1-0.5-0.2-0.8-0.3-1.3c-0.1-0.3-0.2-1.1-0.3-1.5
            c-0.1-0.5-0.1-1.4,0.3-1.8c0.3-0.3,0.9-0.4,1.3-0.2c0.5,0.3,0.8,1,0.9,1.3c0.2,0.5,0.4,1.2,0.5,2c0.2,1,0.5,2.5,0.5,2.8
            c0-0.4-0.1-1.1,0-1.5c0.1-0.3,0.3-0.7,0.7-0.8c0.3-0.1,0.6-0.1,0.9-0.1c0.3,0.1,0.6,0.3,0.8,0.5c0.4,0.6,0.4,1.9,0.4,1.8
            c0.1-0.4,0.1-1.2,0.3-1.6c0.1-0.2,0.5-0.4,0.7-0.5c0.3-0.1,0.7-0.1,1,0c0.2,0,0.6,0.3,0.7,0.5c0.2,0.3,0.3,1.3,0.4,1.7
            c0,0.1,0.1-0.4,0.3-0.7c0.4-0.6,1.8-0.8,1.9,0.6c0,0.7,0,0.6,0,1.1c0,0.5,0,0.8,0,1.2c0,0.4-0.1,1.3-0.2,1.7
            c-0.1,0.3-0.4,1-0.7,1.4c0,0-1.1,1.2-1.2,1.8c-0.1,0.6-0.1,0.6-0.1,1c0,0.4,0.1,0.9,0.1,0.9s-0.8,0.1-1.2,0c-0.4-0.1-0.9-0.8-1-1.1
            c-0.2-0.3-0.5-0.3-0.7,0c-0.2,0.4-0.7,1.1-1.1,1.1c-0.7,0.1-2.1,0-3.1,0c0,0,0.2-1-0.2-1.4c-0.3-0.3-0.8-0.8-1.1-1.1L11.3,20.4z"/>
        
        <path clip-path="url(#SVGID_2_)" fill="none" stroke="#000000" stroke-width="0.75" stroke-linecap="round" stroke-linejoin="round" d="
            M11.3,20.4c-0.3-0.4-0.6-1.1-1.2-2c-0.3-0.5-1.2-1.5-1.5-1.9c-0.2-0.4-0.2-0.6-0.1-1c0.1-0.6,0.7-1.1,1.4-1.1c0.5,0,1,0.4,1.4,0.7
            c0.2,0.2,0.5,0.6,0.7,0.8c0.2,0.2,0.2,0.3,0.4,0.5c0.2,0.3,0.3,0.5,0.2,0.1c-0.1-0.5-0.2-1.3-0.4-2.1c-0.1-0.6-0.2-0.7-0.3-1.1
            c-0.1-0.5-0.2-0.8-0.3-1.3c-0.1-0.3-0.2-1.1-0.3-1.5c-0.1-0.5-0.1-1.4,0.3-1.8c0.3-0.3,0.9-0.4,1.3-0.2c0.5,0.3,0.8,1,0.9,1.3
            c0.2,0.5,0.4,1.2,0.5,2c0.2,1,0.5,2.5,0.5,2.8c0-0.4-0.1-1.1,0-1.5c0.1-0.3,0.3-0.7,0.7-0.8c0.3-0.1,0.6-0.1,0.9-0.1
            c0.3,0.1,0.6,0.3,0.8,0.5c0.4,0.6,0.4,1.9,0.4,1.8c0.1-0.4,0.1-1.2,0.3-1.6c0.1-0.2,0.5-0.4,0.7-0.5c0.3-0.1,0.7-0.1,1,0
            c0.2,0,0.6,0.3,0.7,0.5c0.2,0.3,0.3,1.3,0.4,1.7c0,0.1,0.1-0.4,0.3-0.7c0.4-0.6,1.8-0.8,1.9,0.6c0,0.7,0,0.6,0,1.1
            c0,0.5,0,0.8,0,1.2c0,0.4-0.1,1.3-0.2,1.7c-0.1,0.3-0.4,1-0.7,1.4c0,0-1.1,1.2-1.2,1.8c-0.1,0.6-0.1,0.6-0.1,1
            c0,0.4,0.1,0.9,0.1,0.9s-0.8,0.1-1.2,0c-0.4-0.1-0.9-0.8-1-1.1c-0.2-0.3-0.5-0.3-0.7,0c-0.2,0.4-0.7,1.1-1.1,1.1
            c-0.7,0.1-2.1,0-3.1,0c0,0,0.2-1-0.2-1.4c-0.3-0.3-0.8-0.8-1.1-1.1L11.3,20.4z"/>
        
        <line clip-path="url(#SVGID_2_)" fill="none" stroke="#000000" stroke-width="0.75" stroke-linecap="round" x1="19.6" y1="20.7" x2="19.6" y2="17.3"/>
        <line clip-path="url(#SVGID_2_)" fill="none" stroke="#000000" stroke-width="0.75" stroke-linecap="round" x1="17.6" y1="20.7" x2="17.5" y2="17.3"/>
        <line clip-path="url(#SVGID_2_)" fill="none" stroke="#000000" stroke-width="0.75" stroke-linecap="round" x1="15.6" y1="17.3" x2="15.6" y2="20.7"/>
    </g>
</svg>'''


def get_mouse_pointer_css_cursor() -> str:
    """
    Generate CSS for creating the mouse pointer using just CSS (fallback).
    
    Returns:
        CSS styles for creating a pointer shape
    """
    return """
    width: 28px;
    height: 28px;
    background: white;
    clip-path: polygon(29% 18%, 29% 75%, 43% 56%, 46% 56%, 45% 59%, 61% 77%, 65% 74%, 32% 43%, 64% 59%, 29% 18%);
    filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.5));
    """


def get_mouse_pointer_javascript() -> str:
    """
    Generate JavaScript code to create the visual cursor element.
    
    Returns:
        JavaScript code as string
    """
    svg_content = get_mouse_pointer_svg(24, 24).replace('\n', '').replace('  ', ' ')
    
    return f"""
// Remove any existing cursor
const existingCursor = document.getElementById('browser-use-visual-cursor');
if (existingCursor) {{
    existingCursor.remove();
}}

// Create cursor element
const cursor = document.createElement('div');
cursor.id = 'browser-use-visual-cursor';
cursor.style.position = 'fixed';
cursor.style.top = '0';
cursor.style.left = '0';
cursor.style.zIndex = '9999999';
cursor.style.pointerEvents = 'none';
cursor.style.transition = 'none'; // Remove transition for smoother movement

// Set the realistic mouse pointer
cursor.innerHTML = `{svg_content}`;

document.body.appendChild(cursor);

// Store a reference to the cursor element for future use
window.__browserUseVisualCursor = cursor;

console.log('Realistic visual cursor created');
"""


def get_pointing_hand_javascript() -> str:
    """
    Generate JavaScript code to change cursor to pointing hand.
    
    Returns:
        JavaScript code as string
    """
    svg_content = get_pointing_hand_svg(24, 24).replace('\n', '').replace('  ', ' ')
    
    return f"""
const cursor = window.__browserUseVisualCursor;
if (cursor) {{
    cursor.innerHTML = `{svg_content}`;
}}
""" 