"""
Clean the festive assets that cannot be used as shipped.

(The temple no longer needs a pass. The original was a magic-wand cut that
kept an orange fringe and a pale haze; it has since been replaced by
temple.png, which is cut cleanly and is used as supplied.)

1. diwali.jpg is a JPEG on solid white, so it lands on the panel as a white
   rectangle. We key the white to transparent and keep the lettering's own
   anti-aliasing by deriving alpha from luminance rather than thresholding.

Originals are left untouched; both write new files.
"""
import os

from PIL import Image, ImageDraw, ImageFilter, ImageChops
import numpy as np

SRC = "public/festive"

# ---------------------------------------------------------------- temple
# ---------------------------------------------------------------- wordmark
w = Image.open(f"{SRC}/diwali.jpg").convert("RGB")
arr = np.asarray(w).astype(np.float32)

# Alpha from darkness: white paper -> 0, saturated lettering -> 1. Using the
# channel spread as well keeps the orange flames solid, since they are bright
# but very much not white.
lum = arr.mean(axis=2) / 255.0
sat = (arr.max(axis=2) - arr.min(axis=2)) / 255.0
alpha = np.clip((1.0 - lum) * 1.6 + sat * 1.4, 0, 1)
alpha[alpha < 0.06] = 0.0

out = np.dstack([arr.astype(np.uint8), (alpha * 255).astype(np.uint8)])
Image.fromarray(out, "RGBA").save(f"{SRC}/diwali-wordmark.png")
print("diwali-wordmark.png", Image.open(f"{SRC}/diwali-wordmark.png").size)

# ---------------------------------------------------------------- ganesha
# ganesha.jpg is a POSTER: the sculpted relief sits above a title and a credit
# line for another studio. Only the relief is ours to use, so everything below
# it is cropped away.
#
# Then it needs a real alpha. Shipping the crop and blending it with
# mix-blend-multiply did not work: the poster's ground is a shade DARKER than
# the login panel's ivory, so multiply darkened the whole rectangle and the
# image read as a grey box pasted over the artwork.
#
# So the alpha is derived from how much darker each pixel is than the poster's
# own background. The flat ground falls to zero, the carved shadows stay, and
# what is left is the relief alone — which composites onto any background.
g = Image.open(f"{SRC}/ganesha.jpg").convert("RGB")
# Tight to the sculpture. A looser crop keeps the poster's vignetted corners,
# and those survive the keying below as a grey haze.
crop = g.crop((210, 180, 1010, 1120))

arr = np.asarray(crop).astype(np.float32)
lum = arr.mean(axis=2)

# The ground is the brightest broad region, so a high percentile finds it
# without being thrown off by a stray highlight. The -6 baseline keeps the
# ground's own faint texture from registering as subject.
ground = float(np.percentile(lum, 90))
alpha = np.clip((ground - lum - 6.0) / (ground * 0.17), 0.0, 1.0)

# Radial falloff, not a rectangular one: the poster is vignetted, so its
# corners are darker than its centre and a straight-edged feather leaves them
# showing as shadow in the corners of a visible box.
hgt, wid = alpha.shape
yy, xx = np.mgrid[0:hgt, 0:wid]
cy, cx = hgt / 2.0, wid / 2.0
r = np.sqrt(((yy - cy) / (hgt * 0.52)) ** 2 + ((xx - cx) / (wid * 0.52)) ** 2)
alpha *= np.clip(1.6 - r * 1.6, 0.0, 1.0)

out = np.dstack([arr.astype(np.uint8), (alpha * 255).astype(np.uint8)])
img = Image.fromarray(out, "RGBA")
img.putalpha(img.getchannel("A").filter(ImageFilter.GaussianBlur(2.0)))
img.save(f"{SRC}/ganesha-relief.png")
print("ganesha-relief.png", img.size)

# ---------------------------------------------------------- corner mandala
# festive-corner-mandala.png is only ~29% transparent: the gold linework sits
# on a near-white field that was never keyed out. On the ivory panel that
# field is lighter than the background, so the asset paints a visible white
# rectangle around itself — which is what the corner looked like.
#
# Alpha is taken from how far each pixel is from white. The linework is thin
# and anti-aliased, so a hard threshold would leave it jagged; a ramp keeps
# the soft edges intact.
for src_name, out_name in (
    ("public/assets/images/festive-corner-mandala.png", "corner-mandala-clean.png"),
    ("public/assets/images/festive-mandala-full.png", "mandala-full-clean.png"),
):
    m = Image.open(src_name).convert("RGBA")
    rgb = np.asarray(m.convert("RGB")).astype(np.float32)
    old_a = np.asarray(m)[:, :, 3].astype(np.float32) / 255.0

    lum = rgb.mean(axis=2)
    keyed = np.clip((250.0 - lum) / 42.0, 0.0, 1.0)

    # Respect whatever transparency the file already had — this only removes
    # the white field, it never makes an already-clear pixel opaque.
    alpha = np.minimum(old_a, keyed) * 255.0

    out = np.dstack([rgb.astype(np.uint8), alpha.astype(np.uint8)])
    Image.fromarray(out, "RGBA").save(f"{SRC}/{out_name}")
    print(out_name, Image.open(f"{SRC}/{out_name}").size)

# ------------------------------------------------- sidebar footer cap
# Built from the reference the user supplied: a maroon panel with a swept top
# edge, gold trim and three diyas sitting on the curve.
#
# Only the TOP of it is taken — the curve, the trim and the lamps. The lower
# part of the reference is the credit line, which the sidebar renders as live
# text; baking it into an image would freeze the year and make it unreadable
# to a screen reader.
#
# The cream around the curve is keyed out so the cap can sit on the sidebar's
# own gradient. Keying is by distance from cream rather than a threshold, so
# the anti-aliased gold trim keeps its soft edge.
REF = (
    "C:/Users/aclde/AppData/Local/Temp/claude/"
    "c--Users-aclde-Downloads-B2B/8f17788b-cccb-4ce3-8fe9-7da0e47b8981/images/161.png"
)
if os.path.exists(REF):
    cap = Image.open(REF).convert("RGB").crop((0, 0, 235, 104))
    arr = np.asarray(cap).astype(np.float32)

    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    # Cream is bright and barely saturated; the maroon, gold and flames are
    # none of those things.
    lum = arr.mean(axis=2)
    sat = (arr.max(axis=2) - arr.min(axis=2)) / np.maximum(arr.max(axis=2), 1.0)
    cream = (lum > 205) & (sat < 0.22)

    alpha = np.where(cream, 0.0, 1.0)
    # Soften what is left so the key does not leave a hard sawtooth.
    alpha_img = Image.fromarray((alpha * 255).astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(0.6)
    )

    out = np.dstack([arr.astype(np.uint8), np.asarray(alpha_img)])
    Image.fromarray(out, "RGBA").save(f"{SRC}/sidebar-cap.png")
    print("sidebar-cap.png", Image.open(f"{SRC}/sidebar-cap.png").size)
else:
    print("sidebar-cap.png SKIPPED — reference image not found")

# --------------------------------------------------------------- lamps
# lamps.jpg is a string of fairy lights saved over a CHECKERBOARD — the
# transparency is painted into the pixels, so using the file directly tiles
# grey squares across whatever it sits on.
#
# The checker is neutral and mid-bright; the bulbs are warm or blown-out white
# and the wire is near-black, so none of the subject overlaps the ground in
# both saturation and luminance at once. Alpha is built from that: keep what
# is warm, very bright, or dark, and drop the rest on a ramp so the bulbs keep
# their halos.
lamps = Image.open(f"{SRC}/lamps.jpg").convert("RGB")
arr = np.asarray(lamps).astype(np.float32)
lum = arr.mean(axis=2)
mx, mn = arr.max(axis=2), arr.min(axis=2)
sat = (mx - mn) / np.maximum(mx, 1.0)

# SATURATION IS THE SEPARATOR, measured rather than assumed. The checker is
# perfectly neutral (sat 0.00-0.01) while the wire is warm brown (0.11-0.14)
# and the bulbs are warmer still, so one test divides them.
#
# An earlier version also keyed on darkness, reasoning that the wire is dark.
# It is not — it sits around luminance 180, and the checker's dark squares are
# 140, so that rule kept the checker and ghosted the squares back in.
warm = np.clip((sat - 0.05) / 0.08, 0.0, 1.0)
bright = np.clip((lum - 242.0) / 13.0, 0.0, 1.0)   # blown-out bulb centres
alpha = np.clip(np.maximum(warm, bright), 0.0, 1.0)

# Anything genuinely neutral is ground, whatever its brightness.
alpha[(sat < 0.04) & (lum < 250)] = 0.0

alpha_img = Image.fromarray((alpha * 255).astype(np.uint8)).filter(
    ImageFilter.GaussianBlur(0.8)
)
Image.fromarray(
    np.dstack([arr.astype(np.uint8), np.asarray(alpha_img)]), "RGBA"
).save(f"{SRC}/lamps-clean.png")
print("lamps-clean.png", Image.open(f"{SRC}/lamps-clean.png").size)

# ------------------------------------------------- the ornate diya
# "Glowing Ornate Diwali Diya.png" is a PNG in name only: its mode is RGB and
# the checkerboard is painted into the pixels, so it has no transparency at
# all (clear fraction 0.000, opaque 1.000).
#
# A plain saturation key is not enough here. The checker's white squares and
# the flame's white-hot core are both neutral and both near 255, so any rule
# that drops one drops the other and the flame comes out hollow.
#
# So the checker is identified by CONNECTIVITY instead: it is the neutral
# region joined to the border, and the flame is neutral but enclosed by the
# saturated bowl. A flood fill from the corners marks the former and leaves
# the latter alone.
d = Image.open(f"{SRC}/Glowing Ornate Diwali Diya.png").convert("RGB")
arr = np.asarray(d).astype(np.float32)
mx, mn = arr.max(axis=2), arr.min(axis=2)
sat = (mx - mn) / np.maximum(mx, 1.0)

neutral = (sat < 0.12)

# Grow a marker inward from the border, constrained to the neutral region,
# until it stops changing. This is a flood fill done with dilation —
# ImageDraw.floodfill returned an empty result here, and a fill that silently
# does nothing is worse than one that errors, so this version is checked by
# how much it actually removed.
marker = np.zeros_like(neutral)
marker[0, :] = marker[-1, :] = True
marker[:, 0] = marker[:, -1] = True
marker &= neutral

prev = -1
while marker.sum() != prev:
    prev = marker.sum()
    grown = np.asarray(
        Image.fromarray((marker * 255).astype(np.uint8), "L").filter(
            ImageFilter.MaxFilter(3)
        )
    ) > 0
    marker = grown & neutral

alpha = np.where(marker, 0.0, 255.0)
if marker.mean() < 0.3:
    raise SystemExit(
        f"diya key removed only {marker.mean():.1%} — expected ~74% checker"
    )

alpha_img = Image.fromarray(alpha.astype(np.uint8)).filter(
    ImageFilter.GaussianBlur(1.0)
)
Image.fromarray(
    np.dstack([arr.astype(np.uint8), np.asarray(alpha_img)]), "RGBA"
).save(f"{SRC}/diya.png")
print("diya.png", Image.open(f"{SRC}/diya.png").size)

# ------------------------------------- Happy Diwali celebration strip
# This sheet already HAS an alpha channel — the grey wash around it is just a
# viewer drawing near-transparent pixels, not something baked into the image.
# The real problem is that the alpha is far too weak to use: the script sits
# at 42/255 and the bulbs at 12, so dropped onto the band the artwork is
# barely visible.
#
# So the alpha is lifted with a gamma curve rather than a threshold: faint
# detail is raised a lot, anything already solid is left alone, and the soft
# edges survive. Everything under 6 is cut to zero, which clears the dusting
# of 2/255 pixels that would otherwise haze the whole rectangle.
sheet = Image.open(f"{SRC}/HappyDiwaliCelebrationAssets.png").convert("RGBA")
sa = np.asarray(sheet).astype(np.float32)
alpha = sa[:, :, 3]
alpha = np.where(alpha < 6, 0.0, 255.0 * np.power(alpha / 255.0, 0.38))

# Lifting the alpha also lifts the pale cloud the original hid behind it, and
# a white cloud is obvious on a cream band. The cloud is neutral grey at
# middling brightness; every element is either saturated (lanterns, script,
# bulbs) or near-white and very bright (the firework cores), so one test on
# saturation AND luminance separates them.
srgb = sa[:, :, :3]
mx, mn = srgb.max(axis=2), srgb.min(axis=2)
sat = (mx - mn) / np.maximum(mx, 1.0)
lum = srgb.mean(axis=2)
# Saturation alone, with no luminance let-off: the cloud runs right up to
# near-white, so any brightness exemption let the brightest part of it
# through — which is exactly what the first attempt looked like. Every
# element here carries colour, so nothing worth keeping is neutral.
alpha = np.where(sat < 0.11, 0.0, alpha)
Image.fromarray(
    np.dstack([sa[:, :, :3].astype(np.uint8), alpha.astype(np.uint8)]), "RGBA"
).save(f"{SRC}/diwali-strip.png")
print("diwali-strip.png", Image.open(f"{SRC}/diwali-strip.png").size)

# ---------------------------------------- split the strip into sprites
# The strip is one pre-composed image, and scaling it into a lane can never
# match a layout where each element is placed individually — it crowds the
# pieces together and leaves the rest of the band empty. So it is cut into
# its four sprites and the band composes them itself.
#
# Each piece is cropped to its own alpha bounds, so there is no transparent
# padding to position around.
strip = Image.open(f"{SRC}/diwali-strip.png").convert("RGBA")
sarr = np.asarray(strip).astype(np.float32)

# A harder key than the strip itself gets: at display size the leftover haze
# between elements reads as a milky cloud on the cream band.
srgb = sarr[:, :, :3]
mx, mn = srgb.max(axis=2), srgb.min(axis=2)
sat = (mx - mn) / np.maximum(mx, 1.0)
# A RAMP, not a cut. The leftover wash is warm (saturation 0.16-0.25), so a
# hard threshold either keeps the cloud or takes the bulbs' glow with it.
# Scaling alpha by saturation fades the flat wash out while the glow — which
# climbs in saturation toward each light — survives as a gradient.
a2 = sarr[:, :, 3] * np.clip((sat - 0.15) / 0.13, 0.0, 1.0)
clean = Image.fromarray(
    np.dstack([srgb.astype(np.uint8), a2.astype(np.uint8)]), "RGBA"
)

PIECES = {
    "sprite-lights": (0, 0, 660, 724),
    "sprite-lanterns": (640, 0, 1010, 724),
    "sprite-bursts": (1000, 0, 1500, 724),
    "sprite-wordmark": (1480, 0, 2172, 724),
}
for name, box in PIECES.items():
    piece = clean.crop(box)
    bbox = piece.getbbox()
    if bbox:
        piece = piece.crop(bbox)
    piece.save(f"{SRC}/{name}.png")
    print(name, piece.size)

# ------------------------------- string lights & flame lettering
# Both ship as mode RGB with a checkerboard painted in — "Transparent
# Background" is in one of the filenames, but there is no alpha channel at
# all. Same treatment as the ornate diya: the checker is the neutral region
# JOINED TO THE BORDER, found by flooding inward, which keeps enclosed
# neutral areas (a bulb's white core, the counter inside a letter) intact.
#
# Enclosed checker is then caught separately: anything still neutral AND very
# bright is ground too. That matters for the lettering, where the holes in
# "a" and "p" are checker the flood cannot reach.
def key_checker(src_name, out_name, neutral_below=0.12, bright_above=232):
    img = Image.open(f"{SRC}/{src_name}").convert("RGB")
    a = np.asarray(img).astype(np.float32)
    mx, mn = a.max(axis=2), a.min(axis=2)
    s = (mx - mn) / np.maximum(mx, 1.0)
    l = a.mean(axis=2)
    neutral = s < neutral_below

    marker = np.zeros_like(neutral)
    marker[0, :] = marker[-1, :] = True
    marker[:, 0] = marker[:, -1] = True
    marker &= neutral

    prev = -1
    while marker.sum() != prev:
        prev = marker.sum()
        grown = np.asarray(
            Image.fromarray((marker * 255).astype(np.uint8), "L").filter(
                ImageFilter.MaxFilter(3)
            )
        ) > 0
        marker = grown & neutral

    ground = marker | (neutral & (l > bright_above))
    alpha = np.where(ground, 0.0, 255.0)
    alpha_img = Image.fromarray(alpha.astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(0.9)
    )

    out = Image.fromarray(
        np.dstack([a.astype(np.uint8), np.asarray(alpha_img)]), "RGBA"
    )
    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)
    out.save(f"{SRC}/{out_name}")
    print(out_name, out.size, "cleared", f"{ground.mean():.0%}")


# bright_above is disabled for the lights: their bulbs ARE neutral and very
# bright, so the enclosed-checker rule punched the cores out and left glowing
# rings. The flood alone is enough here — nothing checkered is enclosed.
key_checker(
    "Golden Hanging String Lights on Transparent Background.png",
    "string-lights.png",
    bright_above=999,
)
key_checker("Happy Diwali Flame Lettering.png", "diwali-lettering.png")

# The lantern trio, replacing the lanterns cut out of the celebration strip —
# those carried a patch of the strip's pale wash around them, which showed as
# a grey smudge behind the lamps. Same checkerboard situation as the rest:
# mode RGB, no alpha. bright_above is left off for the same reason as the
# string lights — the lantern glass is bright and nearly neutral at its
# centre, and cutting it would hollow the lamps out.
key_checker("Golden Diwali Lantern Trio.png", "lantern-trio.png", bright_above=999)
