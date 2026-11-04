"""
Render firework bursts as transparent PNGs.

There is no firework asset in this project and no stock to pull from, so they
are drawn here. The SVG version this replaces read as line art: perfectly
straight rays of even width, which is exactly what a real burst is not.

What makes these read as photographic rather than drawn:
  - each ray is a TRAIL of shrinking, dimming particles, not a stroke, so it
    thins and breaks up toward the tip the way a real spark trail does;
  - rays vary in length, and a few fall well short, because a real shell never
    bursts evenly;
  - gravity droop: particles bend downward with distance;
  - a blurred copy of the whole burst is composited underneath as bloom, which
    is what sells it as light rather than paint.

Deterministic seed per burst, so re-running produces the same files.
"""
from PIL import Image, ImageDraw, ImageFilter
import math, random

SIZE = 900
OUT = "public/festive"

# DARKER THAN THE PANEL, deliberately. These sit on ivory (#fffaf4), so the
# usual white-hot firework palette is invisible — the first attempt rendered
# as a pale smudge for exactly that reason. On a light ground a spark trail
# reads as a dark line, so the palette runs amber to burnt orange with no
# white in it at all.
# DARKER THAN THE PANEL, deliberately. These sit on ivory (#fffaf4), so the
# usual white-hot firework palette is invisible — an early attempt rendered as
# a pale smudge for exactly that reason. On a light ground a spark trail reads
# as a dark line, so every palette runs mid-tone to deep with no white in it.
#
# Each ramps core -> mid -> outer -> tip, so a single trail changes hue along
# its length the way a real one does.
PALETTES = {
    "gold":    [(236, 168, 56), (224, 140, 36), (198, 104, 24), (160, 74, 20)],
    "ember":   [(230, 142, 52), (212, 104, 38), (182, 72, 30), (146, 52, 26)],
    "rose":    [(232, 96, 140), (214, 62, 112), (184, 40, 92), (146, 28, 74)],
    "violet":  [(166, 118, 220), (140, 88, 200), (114, 64, 172), (88, 46, 138)],
    "emerald": [(84, 182, 128), (56, 158, 106), (36, 130, 86), (26, 102, 68)],
    "azure":   [(92, 158, 226), (62, 130, 208), (44, 104, 180), (32, 80, 146)],
}

def render(name, seed, rays=46, palette="gold", spread=0.92):
    rnd = random.Random(seed)
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = cy = SIZE / 2
    cols = PALETTES[palette]
    rmax = SIZE * 0.46 * spread

    for i in range(rays):
        angle = (2 * math.pi / rays) * i + rnd.uniform(-0.035, 0.035)
        # Uneven shell: most rays reach far, a few fizzle early.
        reach = rmax * (0.55 if rnd.random() < 0.15 else rnd.uniform(0.80, 1.0))
        steps = int(reach / 2.4)

        for s in range(steps):
            t = s / max(steps - 1, 1)
            # HOLLOW CORE. A real shell is a shell: the particles are out on
            # the expanding sphere, not packed at the centre. Filling the
            # middle is what made the first pass read as a fuzzy star.
            if t < 0.26:
                continue
            # Gravity droop grows with the square of distance travelled.
            droop = (t ** 2) * reach * 0.17
            x = cx + math.cos(angle) * reach * t
            y = cy + math.sin(angle) * reach * t + droop

            # Particles shrink and dim along the trail, and break up near the
            # tip so it frays instead of stopping dead.
            if t > 0.62 and rnd.random() < (t - 0.62) * 1.5:
                continue
            r = max(0.45, 1.9 * (1 - t * 0.72))
            fade = (1 - t) ** 0.95
            col = cols[0] if t < 0.1 else cols[1] if t < 0.45 else cols[2] if t < 0.8 else cols[3]
            a = int(250 * fade)
            if a <= 2:
                continue
            d.ellipse([x - r, y - r, x + r, y + r], fill=(*col, a))

        # A brighter head on most trails.
        if rnd.random() < 0.72:
            t = rnd.uniform(0.80, 0.97)
            x = cx + math.cos(angle) * reach * t
            y = cy + math.sin(angle) * reach * t + (t ** 2) * reach * 0.17
            d.ellipse([x - 1.6, y - 1.6, x + 1.6, y + 1.6], fill=(*cols[1], 245))

    # Bloom: a heavily blurred copy under the sharp one is what makes it read
    # as light rather than as paint.
    # Bloom, but restrained — the first pass blurred so hard that the trails
    # disappeared into a haze and the burst looked like a smudge.
    glow = Image.eval(img.filter(ImageFilter.GaussianBlur(7)).getchannel("A"), lambda v: int(v * 0.55))
    g = img.filter(ImageFilter.GaussianBlur(7)); g.putalpha(glow)
    wide_a = Image.eval(img.filter(ImageFilter.GaussianBlur(22)).getchannel("A"), lambda v: int(v * 0.3))
    w2 = img.filter(ImageFilter.GaussianBlur(22)); w2.putalpha(wide_a)
    out = Image.alpha_composite(Image.alpha_composite(w2, g), img)

    # No white core flash: on ivory it reads as a blown-out hole rather than
    # as light. The hollow centre does that job instead.

    out.save(f"{OUT}/{name}.png")
    print(name, out.size)

render("firework-gold", seed=7, rays=34, palette="gold", spread=1.0)
render("firework-ember", seed=23, rays=28, palette="ember", spread=0.86)
render("firework-rose", seed=61, rays=30, palette="rose", spread=0.92)
render("firework-violet", seed=97, rays=26, palette="violet", spread=0.8)
render("firework-emerald", seed=131, rays=32, palette="emerald", spread=0.88)
render("firework-azure", seed=173, rays=28, palette="azure", spread=0.84)
