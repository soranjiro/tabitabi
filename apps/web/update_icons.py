import os
from PIL import Image, ImageDraw

def create_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background circle
    draw.ellipse((0, 0, size, size), fill="#3b82f6")

    # Scale factor
    s = size / 512.0

    # Map Pin Construction
    # We want a pin that looks like the SVG path
    # Head Circle: Center (256, 200), Radius 110
    cx, cy = 256 * s, 200 * s
    r = 110 * s

    # Triangle (Tail)
    # Top width matches circle diameter roughly at the equator or slightly below
    # Let's say tangent points at y=200+something
    # Triangle points: (156, 240), (356, 240), (256, 420)
    # 156 = 256 - 100
    # 356 = 256 + 100

    p1 = (156 * s, 240 * s)
    p2 = (356 * s, 240 * s)
    p3 = (256 * s, 420 * s)

    draw.polygon([p1, p2, p3], fill="white")

    # Draw Head Circle on top to merge
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill="white")

    # Inner hole (Blue)
    # Center (256, 200), Radius 40
    r_inner = 40 * s
    draw.ellipse((cx - r_inner, cy - r_inner, cx + r_inner, cy + r_inner), fill="#3b82f6")

    return img

# Ensure directories exist
os.makedirs('static/icons', exist_ok=True)

# Save 192
img192 = create_icon(192)
img192.save('static/icons/icon-192.png')
print("Saved static/icons/icon-192.png")

# Save 512
img512 = create_icon(512)
img512.save('static/icons/icon-512.png')
print("Saved static/icons/icon-512.png")

# Save SVG
# Using a path that matches the logic above roughly
svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <circle cx="256" cy="256" r="256" fill="#3b82f6"/>
  <path d="M256 90c-60.8 0-110 49.2-110 110 0 60.8 110 220 110 220s110-159.2 110-220c0-60.8-49.2-110-110-110zm0 150c-22.1 0-40-17.9-40-40s17.9-40 40-40 40 17.9 40 40-17.9 40-40 40z" fill="white"/>
</svg>'''

with open('static/favicon.svg', 'w') as f:
    f.write(svg_content)
print("Saved static/favicon.svg")
