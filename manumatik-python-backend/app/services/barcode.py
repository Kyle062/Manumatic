import barcode
from barcode.writer import ImageWriter
from PIL import Image, ImageDraw, ImageFont
import io

def generate_barcode_image(part_number: str, part_name: str, price: float) -> io.BytesIO:
    # 1. Generate the raw barcode using Code128 (standard for retail/auto parts)
    # Code128 supports letters and numbers, perfect for things like "BP-001"
    CODE128 = barcode.get_barcode_class('code128')
    
    # We tell it to use the ImageWriter (Pillow) to draw the barcode
    barcode_instance = CODE128(part_number, writer=ImageWriter())
    
    # Save the barcode to a temporary memory buffer
    buffer = io.BytesIO()
    barcode_instance.write(buffer, options={
        "module_width": 0.3,     # Thickness of bars
        "module_height": 15.0,   # Height of bars
        "font_size": 10,         # Font size for the number
        "text_distance": 5.0,    # Distance from bars to text
        "background": "white",
        "foreground": "black",
    })
    
    # Reset buffer to the beginning
    buffer.seek(0)
    
    # 2. Open the generated barcode image using Pillow to add the Name and Price
    img = Image.open(buffer)
    
    # Calculate new image height to fit the text at the bottom
    new_height = img.height + 40
    new_img = Image.new("RGB", (img.width, new_height), "white")
    new_img.paste(img, (0, 0))
    
    # Draw the Part Name and Price at the bottom
    draw = ImageDraw.Draw(new_img)
    
    # Try to load a default font, or use a fallback
    try:
        font = ImageFont.truetype("arial.ttf", 14)
    except IOError:
        font = ImageFont.load_default()
    
    # Truncate name if it's too long to fit
    display_name = part_name[:30] + "..." if len(part_name) > 30 else part_name
    text = f"{display_name}\nP{price:.2f}"
    
    # Draw text centered
    text_bbox = draw.textbbox((0, 0), text, font=font, align="center")
    text_width = text_bbox[2] - text_bbox[0]
    text_x = (new_img.width - text_width) / 2
    
    draw.text((text_x, img.height), text, fill="black", font=font, align="center")
    
    # Save the final image back to a buffer
    final_buffer = io.BytesIO()
    new_img.save(final_buffer, format="PNG")
    final_buffer.seek(0)
    
    return final_buffer