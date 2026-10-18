#!/usr/bin/env python3
import os
import math
from PIL import Image, ImageDraw, ImageFilter

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "../../public/assets/food")
os.makedirs(OUTPUT_DIR, exist_ok=True)

SIZE = 256

def new_canvas():
    return Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

def save_image(img, name):
    path = os.path.join(OUTPUT_DIR, f"{name}.png")
    img.save(path, "PNG")
    print(f"Generated {name}.png")

def draw_egg():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    # Egg shape (stretched bezier-like / oval)
    # Base shadow
    draw.ellipse([48, 40, 208, 225], fill=(235, 205, 170, 255))
    # Mid warm tone
    draw.ellipse([54, 45, 202, 218], fill=(250, 228, 198, 255))
    # Highlight
    draw.ellipse([75, 65, 125, 135], fill=(255, 245, 230, 220))
    draw.ellipse([85, 75, 105, 105], fill=(255, 255, 255, 240))
    save_image(img, "egg")

def draw_tomato():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    # Tomato body
    draw.ellipse([35, 55, 221, 230], fill=(215, 38, 25, 255))
    draw.ellipse([42, 60, 214, 224], fill=(235, 52, 36, 255))
    # Specular shine
    draw.ellipse([65, 80, 115, 125], fill=(255, 120, 110, 200))
    draw.ellipse([75, 90, 95, 105], fill=(255, 255, 255, 220))
    # Green calyx / leaves on top
    draw.polygon([(128, 65), (100, 30), (120, 50)], fill=(46, 125, 50, 255))
    draw.polygon([(128, 65), (156, 30), (136, 50)], fill=(46, 125, 50, 255))
    draw.polygon([(128, 65), (75, 55), (105, 65)], fill=(56, 142, 60, 255))
    draw.polygon([(128, 65), (181, 55), (151, 65)], fill=(56, 142, 60, 255))
    # Stem
    draw.rectangle([123, 20, 133, 48], fill=(76, 175, 80, 255))
    save_image(img, "tomato")

def draw_milk():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    # Milk carton or bottle
    # Body
    draw.rounded_rectangle([70, 75, 186, 230], radius=16, fill=(240, 245, 250, 255), outline=(200, 215, 230, 255), width=3)
    # Blue label
    draw.rectangle([70, 125, 186, 185], fill=(59, 130, 246, 255))
    # Drop symbol on label
    draw.ellipse([116, 142, 140, 168], fill=(255, 255, 255, 255))
    # Top neck & cap
    draw.polygon([(70, 75), (95, 42), (161, 42), (186, 75)], fill=(225, 235, 245, 255))
    draw.rounded_rectangle([110, 22, 146, 42], radius=4, fill=(59, 130, 246, 255))
    # Highlight
    draw.line([(85, 90), (85, 215)], fill=(255, 255, 255, 180), width=6)
    save_image(img, "milk")

def draw_cheese():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    # Triangular cheese wedge
    # Top triangle
    draw.polygon([(40, 145), (195, 80), (220, 155)], fill=(255, 213, 79, 255))
    # Side 1
    draw.polygon([(40, 145), (220, 155), (220, 205), (40, 195)], fill=(255, 179, 0, 255))
    # Swiss cheese holes
    draw.ellipse([80, 160, 110, 185], fill=(220, 150, 0, 255))
    draw.ellipse([140, 165, 175, 195], fill=(220, 150, 0, 255))
    draw.ellipse([100, 110, 130, 130], fill=(240, 190, 50, 255))
    draw.ellipse([160, 115, 180, 135], fill=(240, 190, 50, 255))
    save_image(img, "cheese")

def draw_butter():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    # Butter stick on a plate
    draw.ellipse([30, 175, 226, 225], fill=(226, 232, 240, 255))
    # Top face
    draw.polygon([(60, 120), (160, 95), (210, 130), (110, 155)], fill=(254, 240, 138, 255))
    # Front face
    draw.polygon([(60, 120), (110, 155), (110, 190), (60, 155)], fill=(250, 204, 21, 255))
    # Right face
    draw.polygon([(110, 155), (210, 130), (210, 165), (110, 190)], fill=(234, 179, 8, 255))
    save_image(img, "butter")

def draw_onion():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    # Golden onion
    draw.ellipse([45, 65, 211, 225], fill=(180, 100, 45, 255))
    draw.ellipse([55, 75, 201, 215], fill=(217, 130, 60, 255))
    # Vertical onion lines
    for x in [85, 110, 146, 171]:
        draw.arc([x-25, 70, x+25, 220], 80, 280, fill=(160, 85, 30, 180), width=3)
    # Sprout / roots
    draw.polygon([(128, 30), (118, 70), (138, 70)], fill=(120, 160, 60, 255))
    draw.line([(120, 225), (115, 245)], fill=(160, 120, 80, 255), width=3)
    draw.line([(128, 225), (128, 250)], fill=(160, 120, 80, 255), width=3)
    draw.line([(136, 225), (141, 245)], fill=(160, 120, 80, 255), width=3)
    save_image(img, "onion")

def draw_garlic():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    # Garlic bulb
    draw.ellipse([40, 95, 216, 225], fill=(245, 242, 235, 255))
    # Clove segments
    draw.arc([60, 95, 140, 225], 70, 290, fill=(210, 200, 190, 255), width=3)
    draw.arc([116, 95, 196, 225], 250, 110, fill=(210, 200, 190, 255), width=3)
    # Stem top
    draw.polygon([(128, 40), (115, 100), (141, 100)], fill=(215, 205, 190, 255))
    save_image(img, "garlic")

def draw_spinach():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    # Vibrant leaf cluster
    draw.ellipse([50, 60, 160, 210], fill=(34, 139, 34, 255))
    draw.ellipse([100, 40, 210, 190], fill=(46, 160, 46, 255))
    # Veins
    draw.line([(155, 45), (130, 210)], fill=(75, 190, 75, 255), width=4)
    draw.line([(145, 95), (180, 75)], fill=(75, 190, 75, 255), width=3)
    draw.line([(140, 135), (105, 115)], fill=(75, 190, 75, 255), width=3)
    # Stem
    draw.line([(130, 205), (120, 245)], fill=(50, 120, 50, 255), width=6)
    save_image(img, "spinach")

def draw_potato():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    # Rustic earthy oval potato
    draw.ellipse([40, 65, 216, 195], fill=(160, 115, 75, 255))
    draw.ellipse([50, 75, 206, 185], fill=(185, 135, 90, 255))
    # Eyes / dots
    for dot in [(85, 105), (145, 95), (115, 150), (175, 140), (75, 160)]:
        draw.ellipse([dot[0], dot[1], dot[0]+8, dot[1]+5], fill=(120, 80, 50, 220))
    save_image(img, "potato")

def draw_carrot():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    # Green fronds top
    draw.line([(128, 70), (100, 25)], fill=(46, 160, 46, 255), width=5)
    draw.line([(128, 70), (128, 20)], fill=(34, 139, 34, 255), width=5)
    draw.line([(128, 70), (156, 25)], fill=(56, 175, 56, 255), width=5)
    # Carrot body
    draw.polygon([(90, 70), (166, 70), (136, 235), (120, 235)], fill=(249, 115, 22, 255))
    # Ridges
    for y in [105, 140, 175, 205]:
        draw.line([(110, y), (145, y)], fill=(234, 88, 12, 255), width=3)
    save_image(img, "carrot")

def draw_chicken():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    # Roasted chicken drumstick
    # Bone end
    draw.ellipse([50, 185, 80, 215], fill=(245, 245, 245, 255))
    draw.ellipse([70, 205, 100, 235], fill=(245, 245, 245, 255))
    draw.polygon([(70, 195), (115, 155), (95, 135), (55, 175)], fill=(230, 230, 230, 255))
    # Meat bulb
    draw.ellipse([90, 45, 220, 175], fill=(180, 85, 30, 255))
    draw.ellipse([100, 55, 210, 165], fill=(217, 119, 6, 255))
    draw.ellipse([115, 70, 165, 115], fill=(251, 191, 36, 200))
    save_image(img, "chicken")

def draw_rice():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    # Ceramic Bowl
    draw.pieslice([40, 60, 216, 230], 0, 180, fill=(59, 130, 246, 255))
    draw.rectangle([95, 215, 161, 235], fill=(37, 99, 235, 255))
    # Fluffy Rice Mound
    draw.pieslice([45, 60, 211, 165], 180, 360, fill=(248, 250, 252, 255))
    for grain in [(80, 100), (120, 85), (160, 95), (105, 115), (145, 110)]:
        draw.ellipse([grain[0], grain[1], grain[0]+12, grain[1]+6], fill=(226, 232, 240, 255))
    save_image(img, "rice")

def draw_pasta():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    # Plate
    draw.ellipse([30, 150, 226, 225], fill=(226, 232, 240, 255))
    # Pasta swirls (golden yellow noodles)
    draw.arc([60, 75, 196, 185], 0, 360, fill=(245, 190, 40, 255), width=14)
    draw.arc([75, 90, 181, 170], 40, 320, fill=(255, 215, 75, 255), width=12)
    draw.arc([90, 105, 166, 155], 10, 270, fill=(240, 175, 30, 255), width=10)
    save_image(img, "pasta")

def draw_flour():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    # Paper flour bag
    draw.rounded_rectangle([65, 80, 191, 225], radius=12, fill=(241, 235, 220, 255), outline=(210, 200, 180, 255), width=3)
    # Folded top
    draw.polygon([(65, 80), (80, 45), (176, 45), (191, 80)], fill=(225, 215, 195, 255))
    # Blue Wheat badge
    draw.ellipse([100, 120, 156, 176], fill=(59, 130, 246, 255))
    draw.line([(128, 130), (128, 166)], fill=(255, 255, 255, 255), width=4)
    save_image(img, "flour")

def draw_bread():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    # Crusty golden bread loaf
    draw.rounded_rectangle([45, 85, 211, 205], radius=50, fill=(180, 100, 40, 255))
    draw.rounded_rectangle([50, 90, 206, 200], radius=45, fill=(217, 135, 60, 255))
    # Bakers cuts
    for x in [85, 128, 171]:
        draw.line([(x-12, 105), (x+12, 185)], fill=(245, 185, 110, 255), width=6)
    save_image(img, "bread")

def draw_olive_oil():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    # Green glass bottle
    draw.rounded_rectangle([80, 85, 176, 225], radius=16, fill=(101, 140, 60, 255))
    draw.rectangle([80, 120, 176, 190], fill=(234, 179, 8, 255))
    # Neck
    draw.rectangle([112, 45, 144, 85], fill=(101, 140, 60, 255))
    # Cap
    draw.rectangle([110, 25, 146, 45], fill=(180, 80, 30, 255))
    save_image(img, "olive_oil")

def draw_soy_sauce():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    # Soy sauce dispenser
    draw.polygon([(90, 85), (75, 225), (181, 225), (166, 85)], fill=(45, 25, 20, 255))
    # Red cap
    draw.polygon([(100, 85), (105, 50), (151, 50), (156, 85)], fill=(220, 38, 38, 255))
    draw.rectangle([151, 58, 168, 68], fill=(220, 38, 38, 255))
    save_image(img, "soy_sauce")

def draw_salt():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    # Glass salt shaker
    draw.rounded_rectangle([85, 75, 171, 225], radius=12, fill=(240, 245, 250, 220), outline=(200, 215, 230, 255), width=3)
    # Metal top
    draw.rounded_rectangle([95, 35, 161, 75], radius=8, fill=(160, 174, 192, 255))
    # Holes
    for hx in [112, 128, 144]:
        draw.ellipse([hx-2, 45, hx+2, 49], fill=(74, 85, 104, 255))
    # Salt text
    draw.text((115, 135), "S", fill=(148, 163, 184, 255))
    save_image(img, "salt")

def draw_black_pepper():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    # Wooden pepper mill
    draw.rounded_rectangle([95, 70, 161, 225], radius=14, fill=(120, 75, 45, 255))
    # Grinder top
    draw.ellipse([90, 50, 166, 75], fill=(100, 60, 35, 255))
    draw.ellipse([120, 30, 136, 46], fill=(160, 174, 192, 255)) # Silver knob
    save_image(img, "black_pepper")

def main():
    draw_egg()
    draw_tomato()
    draw_milk()
    draw_cheese()
    draw_butter()
    draw_onion()
    draw_garlic()
    draw_spinach()
    draw_potato()
    draw_carrot()
    draw_chicken()
    draw_rice()
    draw_pasta()
    draw_flour()
    draw_bread()
    draw_olive_oil()
    draw_soy_sauce()
    draw_salt()
    draw_black_pepper()
    print("All initial transparent PNG assets generated successfully!")

if __name__ == "__main__":
    main()
