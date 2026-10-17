from PIL import Image, ImageFilter

SRC = 'public/festive/Happy-Dussehra-Festive-Banner.png'
OUT = 'public/assets/images/festive-banner-v2.jpg'
CW, CH, FEATHER = 1800, 260, 90

src = Image.open(SRC).convert('RGB')
art = src.crop((330, 0, src.width, src.height))
aw = round(art.width * CH / art.height)
art = art.resize((aw, CH), Image.LANCZOS)
pad = CW - aw


def ramp(a, b, w):
    g = Image.new('L', (2, 1))
    g.putpixel((0, 0), a)
    g.putpixel((1, 0), b)
    return g.resize((w, CH), Image.BICUBIC)


# Sky extension. Clamping one column banded badly — that column cuts the
# garland and the temple line, so every feature on it became a hard stripe.
# A WIDE strip, stretched then blurred hard, keeps only the vertical colour
# structure (pale sky above, warm haze below) and loses the features.
# It runs FEATHER px past the join so the artwork has something to fade onto.
strip = art.crop((0, 0, 150, CH)).resize((pad + FEATHER, CH), Image.BICUBIC)
strip = strip.filter(ImageFilter.GaussianBlur(70))
strip.paste(Image.new('RGB', (pad + FEATHER, CH), (255, 246, 232)),
            (0, 0), ramp(165, 0, pad + FEATHER))

canvas = Image.new('RGB', (CW, CH))
canvas.paste(strip, (0, 0))
# Feathered join: a hard paste left a visible vertical edge where the blurred
# sky met the sharp artwork. The first 90px of the artwork now fades in over
# the blur instead.
mask = Image.new('L', (aw, CH), 255)
mask.paste(ramp(0, 255, FEATHER), (0, 0))
canvas.paste(art, (pad, 0), mask)
canvas.save(OUT, quality=88, optimize=True, progressive=True)
print('art starts at %.0f%%' % (pad / CW * 100), canvas.size, 'aspect %.2f' % (CW / CH))
