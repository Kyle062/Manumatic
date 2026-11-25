"""
Barcode label service used by the /api/reports/barcode route.
"""

# 0.Dependencies - python-barcode for Code128, Pillow for text, BytesIO for memory.
import barcode
from barcode.writer import ImageWriter
from PIL import Image, ImageDraw, ImageFont
import io


# 1.Reports(Barcode Labels) - Showing a printable label for each part.
def generate_barcode_image(part_number: str, part_name: str, price: float) -> io.BytesIO:
    # 1.1 Reports(Barcode Labels) - Code128 accepts letters and numbers (BP-001).
    CODE128 = barcode.get_barcode_class('code128')
    
    # 1.2 Reports(Barcode Labels) - ImageWriter draws bars with Pillow, not SVG.
    barcode_instance = CODE128(part_number, writer=ImageWriter())
    
    # 1.3 Reports(Barcode Labels) - Render into memory with scannable bar settings.
    buffer = io.BytesIO()
    # 1.3a Reports(Barcode Labels) - Bar width/height, font, and high contrast aid scanning.
    barcode_instance.write(buffer, options={
        "module_width": 0.3,
        "module_height": 15.0,
        "font_size": 10,
        "text_distance": 5.0,
        "background": "white",
        "foreground": "black",
    })
    
    # 1.4 Reports(Barcode Labels) - Rewind so Pillow reads from the buffer start.
    buffer.seek(0)
    
    # 1.5 Reports(Barcode Labels) - Grow the canvas to fit a two-line text strip.
    img = Image.open(buffer)
    new_height = img.height + 40
    new_img = Image.new("RGB", (img.width, new_height), "white")
    new_img.paste(img, (0, 0))
    
    # 1.6 Reports(Barcode Labels) - Draw object is the pen for the extra text.
    draw = ImageDraw.Draw(new_img)
    
    # 1.7 Reports(Barcode Labels) - Use a built-in font if Arial is unavailable.
    try:
        font = ImageFont.truetype("arial.ttf", 14)
    except IOError:
        font = ImageFont.load_default()
    
    # 1.8 Reports(Barcode Labels) - Cap long names so they fit the label width.
    display_name = part_name[:30] + "..." if len(part_name) > 30 else part_name
    text = f"{display_name}\nP{price:.2f}"
    
    # 1.9 Reports(Barcode Labels) - Measure text to center it horizontally.
    text_bbox = draw.textbbox((0, 0), text, font=font, align="center")
    text_width = text_bbox[2] - text_bbox[0]
    text_x = (new_img.width - text_width) / 2
    
    # 1.10 Reports(Barcode Labels) - Draw text directly below the barcode.
    draw.text((text_x, img.height), text, fill="black", font=font, align="center")
    
    # 1.11 Reports(Barcode Labels) - Save PNG to a rewound buffer for the route.
    final_buffer = io.BytesIO()
    new_img.save(final_buffer, format="PNG")
    final_buffer.seek(0)
    
    return final_buffer
