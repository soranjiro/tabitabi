#!/usr/bin/env python3
"""
Convert favicon.png to various formats and sizes with padding removed.
"""

from PIL import Image
import io
import base64

def trim_whitespace(image):
    """Remove excess whitespace/transparent areas from an image."""
    # Convert to RGBA if not already
    if image.mode != 'RGBA':
        image = image.convert('RGBA')

    # Get bounding box of non-transparent pixels
    bbox = image.getbbox()

    if bbox:
        # Crop to content
        image = image.crop(bbox)

    return image

def create_icon(source_path, output_path, size, add_padding=True):
    """Create an icon from source image with specified size."""
    # Open and trim the source image
    img = Image.open(source_path)
    img = trim_whitespace(img)

    # Add padding if requested (10% on each side)
    if add_padding:
        padding = int(size * 0.05)  # 5% padding on each side
        new_size = size - (padding * 2)
        img.thumbnail((new_size, new_size), Image.Resampling.LANCZOS)

        # Create new image with padding
        final_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        offset = ((size - img.width) // 2, (size - img.height) // 2)
        final_img.paste(img, offset, img if img.mode == 'RGBA' else None)
    else:
        img.thumbnail((size, size), Image.Resampling.LANCZOS)
        final_img = img

    final_img.save(output_path, 'PNG', optimize=True, compress_level=9)
    print(f"Created {output_path} ({size}x{size})")

def create_svg(source_path, output_path):
    """Create SVG from source image."""
    # Open and trim the source image
    img = Image.open(source_path)
    img = trim_whitespace(img)

    # Save as PNG to base64 with optimization
    temp_png = io.BytesIO()
    img.save(temp_png, 'PNG', optimize=True, compress_level=9)
    img_data = temp_png.getvalue()
    img_base64 = base64.b64encode(img_data).decode('utf-8')

    width, height = img.size

    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}">
  <image href="data:image/png;base64,{img_base64}" width="{width}" height="{height}"/>
</svg>'''

    with open(output_path, 'w') as f:
        f.write(svg_content)

    print(f"Created {output_path}")

def main():
    base_path = '/Users/user/Documents/03_app/tabitabi/apps/web/static'
    source = f'{base_path}/favicon.png'

    # Create trimmed favicon.svg
    create_svg(source, f'{base_path}/favicon.svg')

    # Create icon-192.png
    create_icon(source, f'{base_path}/icons/icon-192.png', 192)

    # Create icon-512.png
    create_icon(source, f'{base_path}/icons/icon-512.png', 512)

    print("\nAll icons created successfully!")

if __name__ == '__main__':
    main()
