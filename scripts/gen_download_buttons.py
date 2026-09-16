"""Generate the README's download buttons from one template.

From a template, because hand-drawn buttons are chances to type one number
differently, and the point of a row of them is that they look like one control
repeated.

THE GEOMETRY is ArrowLoop's, so the buttons here and there are the same object:
245.3 tall with rx 38.2, which is the Buy Me a Coffee button's own height and
corner, and 720 wide rather than that button's 841.9 because at 841.9 a third
of the face sits empty next to the longest word.

THE COLOUR is the thing's own and there is no outline (jdp: "die butotns sollen
keine rahmenliniehaben und farbig sein"). A filled shape in a colour somebody
already associates with the thing does the work an outline was doing, faster:
the eye finds "the blue one" before it reads the word.

WHAT A CONTAINER REPO ACTUALLY OFFERS is not a bundle, it is an image, and a
browser cannot download one of those: a click on it can only open a page. So
the first button downloads the `docker-compose.yml` instead, which IS a file
and is the thing somebody needs in order to run the image. It is attached to
every release, because a release asset is served with Content-Disposition
attachment and therefore actually downloads, where a raw file in the repo would
open as text in a tab.

The second button is the source archive, and it is labelled as exactly that.
GitHub attaches "Source code (zip)" to every release automatically: it is the
whole repository at that tag, not the Dockerfile alone. Calling it anything
else on the button would send somebody looking for an image to a folder of
YAML.

THE GLYPHS are Font Awesome Free (icons CC BY 4.0), from the brands set and
the solid one. The brand marks are trademarks of their owners and are used the
one way a trademark may be used without permission: to name the thing they
point at. Each button links to that thing, the marks are unmodified, and
nothing here claims endorsement by anyone.

The source button carries a ZIP glyph rather than the GitHub mark, because
what it hands over is an archive, not a visit to GitHub. The mark named the
host; the glyph names the file.

Run from anywhere:  python scripts/gen_download_buttons.py
Writes .github/assets/download-buttons/*.svg, which are committed.
"""

import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", ".github", "assets", "download-buttons")
BRANDS = os.path.join(HERE, "brand-paths")

W, H, R = 720.0, 245.3, 38.2

GLYPH = 112.0
GX, GY = 78.0, (H - GLYPH) / 2

FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

TEMPLATE = """<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{alt}">
  <title>{alt}</title>
  <defs>
    <clipPath id="edge">
      <rect x="0" y="0" width="{w}" height="{h}" rx="{r}" ry="{r}"/>
    </clipPath>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0"    stop-color="#fff" stop-opacity="0"/>
      <stop offset="0.45" stop-color="#fff" stop-opacity="0.28"/>
      <stop offset="0.55" stop-color="#fff" stop-opacity="0.28"/>
      <stop offset="1"    stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <style>
    @keyframes pass {{
      0%       {{ transform: translateX({band_start}px); }}
      {pass_pct}%   {{ transform: translateX({band_end}px); }}
      100%     {{ transform: translateX({band_end}px); }}
    }}
    /* linear, not eased: an eased pass hands off at the wrong moment and the
       row stops reading as one band crossing both buttons.

       `backwards` is not decoration, it is the second half of the delay. An
       animation that has not started yet leaves its element wherever the
       document put it, which for this band is x=0 - INSIDE the button, against
       its left edge. So the stagger that makes the row read as one band was
       also parking a motionless band on every button but the first, for as long
       as that button's delay, every single time the page loaded. It came right
       on its own from the second cycle onwards, which is why it survived: it is
       only ever wrong while somebody is looking at the row for the first time.
       `backwards` holds the 0% state during the delay instead, and 0% is off
       the left edge. */
    .band {{ animation: pass {cycle}s linear {delay}s infinite backwards; }}
    @media (prefers-reduced-motion: reduce) {{
      .band {{ animation: none; opacity: 0; }}
    }}
  </style>
  <rect width="{w}" height="{h}" rx="{r}" ry="{r}" fill="{bg}"/>
  <g transform="translate({gx} {gy}) scale({scale})" fill="{ink}">
    <path d="{path}"/>
  </g>
  <text x="238" y="110" font-family="{font}" font-size="82" font-weight="700" fill="{ink}">{head}</text>
  <text x="240" y="180" font-family="{font}" font-size="50" font-weight="400" fill="{ink}" fill-opacity="0.72">{sub_text}</text>
  <g clip-path="url(#edge)">
    <g class="band">
      <!-- Taller than the canvas and started off its left edge, so the tilt
           never exposes a corner. skewX rather than rotate: the band stays
           axis-aligned for the translate, so the motion is one transform. -->
      <rect x="0" y="-60" width="{band_w}" height="{band_h}"
            fill="url(#sheen)" transform="skewX(-16)"/>
    </g>
  </g>
</svg>
"""

# THE SHEEN IS DEFINED ON SCREEN, NOT ON THIS CANVAS, and that sentence is the
# whole of this block.
#
# A tilted white band, clipped to the button, crossing once every seven seconds:
# the donation row's own, and the point is that it is the SAME band there and
# here. It was not. Both rows described their band in their own canvas units,
# and the two canvases differ (720 here, 841.9 there) as do the widths the
# READMEs render them at (195 here, 160 there), so what reached the page was a
# 38px band at 304px per second above a 31px band at 249. Two effects on one
# page, which is what got reported.
#
# So the three numbers below are in SCREEN pixels and are the same for every row
# in the house (see the GitHub style guide, "Der Schein"). Everything else is
# derived from the width this row is rendered at.
#
# THE GAP IS MEASURED, not assumed. The row is `<img width="195">` with a
# newline, two spaces and a `&nbsp;` between the images, which HTML collapses to
# space-nbsp-space: 13.16px at GitHub's 16px body text, measured in a browser.
# It used to be taken as 4px, which left the band hanging in the gap 17% too
# long here - the visible half of the defect.
#
# The separator matters and is part of the rule: `&nbsp;` glued to the closing
# `</a>` instead of standing on its own line measures 8.77px, and a row written
# that way needs its own number.
BAND_PX = 33.0     # the band's width on screen
SPEED = 250.0      # screen pixels per second
GAP_PX = 13.16     # measured, see above
RENDER_PX = 195.0  # the width the README asks for
CYCLE = 7.0        # seconds, one full loop including the rest

# Canvas units per screen pixel, for this row's own rendered width.
SCALE = W / RENDER_PX
SHEEN_W = BAND_PX * SCALE
# The band is skewed, so its horizontal extent is wider than the rect: skewX
# shifts every point by tan(16 degrees) times its own y, and the rect is taller
# than the canvas on both sides. Clearing the edge by the rect's width alone
# would leave the tilted corner showing.
SHEEN_H = H + 120.0
CLEAR = SHEEN_W + math.tan(math.radians(16)) * SHEEN_H
SHEEN_FROM = -CLEAR
SHEEN_TO = W + CLEAR
# How long the band needs to cross one button, and how long to travel from one
# button's left edge to the next one's. Both come from one speed, so the band
# leaves button n at the moment it enters button n+1.
PASS = (SHEEN_TO - SHEEN_FROM) / SCALE / SPEED
STEP = (RENDER_PX + GAP_PX) / SPEED
PASS_PCT = PASS / CYCLE * 100.0

# slug, brand file, background, ink, heading, second line, accessible name
#
# GitHub's own colour is black, and a black button without an outline vanishes
# into GitHub's dark theme, exactly as a black macOS button did in ArrowLoop's
# row. The slate below stays visible on both themes.
#
# WINDOWS AND LINUX are start scripts, not builds, and the second line says so.
# There is one image and it runs on both; what differs is the twenty lines of
# checking in front of it. On Windows that check is the whole point: the
# emulator needs /dev/kvm, which inside WSL2 exists only with
# nestedVirtualization=true in a file nothing prompts you to create.
#
# Linux yellow is Tux's own #fcc624 and is the one bright face in the row, so
# its ink is dark rather than white. White on that yellow fails every contrast
# check and looks washed out next to the other three.
#
# The delay is the button's POSITION times STEP, computed below rather than
# written out here: a hand-kept column of seconds is a column somebody edits the
# row without touching, and then the band hands off into nothing.
#
# THIS ROW STARTS AT ZERO because it is the FIRST row on the page. One band
# works its way down the README rather than one band per row running beside the
# others: the whole first row, then the whole second. The give row below carries
# the other half of that schedule - a fixed 3.8s offset, which is when the
# longest download row in the house (ArrowLoop's four buttons) has finished. It
# has to be a fixed number rather than a derived one, because those three
# buttons are one shared asset referenced by twenty-six repositories and cannot
# know what a given README puts above them.
BUTTONS = [
    # DOCS IS FIRST, and it is in this row rather than on a line of its own
    # (jdp, 2026-09-13: "der Dokubutton soll in der zeile der downloadbuttons
    # als erstes stehen und genau das gleiche format haben"). It used to be a
    # hand-drawn 841.9-wide SVG above the row, which meant two buttons claiming
    # the same job at two different sizes. The head reads "Docs" rather than
    # "Documentation" because the long word runs past the face at this width -
    # measured, not guessed: 13 characters at font-size 82 need more room than
    # the 482 units left of the right edge.
    #
    # It keeps its yellow. That is the coffee button's own #fd0, which is where
    # this button's colour came from originally, and it is the one warm face in
    # a row that is otherwise blue and slate. Dark ink on it for the same reason
    # the Linux button has dark ink.
    ("docs", "book", "#fd0", "#0d0c23",
     "Docs", "online manual", "Read the documentation"),
    # The image itself. A browser cannot download an image, so this one opens
    # the package page rather than pretending to hand over a file: the second
    # line says "ghcr.io image" and not "download".
    ("docker-image", "docker", "#1d63ed", "#ffffff",
     "Docker", "ghcr.io image", "The container image on ghcr.io"),
    # GitHub attaches "Source code (zip)" to every release: the whole repository
    # at that tag, not the Dockerfile alone. The button says Source for that
    # reason. The glyph is a ZIP rather than GitHub's mark, because what arrives
    # is an archive - the mark would name the host, the glyph names the file.
    ("source-zip", "zip", "#4d5562", "#ffffff",
     "Source", "zip archive", "Download the source archive for this release"),
]


def brand(name):
    """Path data plus the viewBox width and height it was drawn in."""
    with open(os.path.join(BRANDS, name + ".txt"), "rb") as fh:
        path = fh.read().decode("utf-8").strip()
    with open(os.path.join(BRANDS, name + ".box.txt"), "rb") as fh:
        box = [float(v) for v in fh.read().decode("utf-8").split()]
    return path, box[2], box[3]


def main():
    os.makedirs(OUT, exist_ok=True)
    for index, (slug, mark, bg, ink, head, sub, alt) in enumerate(BUTTONS):
        path, bw, bh = brand(mark)
        # Scale on the LONGER axis so glyphs of different proportions end up
        # the same optical size. Docker's box is 640 by 512, the ZIP glyph's is
        # 384 by 512; scaling on width alone would leave the narrow one huge.
        scale = GLYPH / max(bw, bh)
        # Re-centre horizontally: a wide mark scaled on its width sits left of
        # a square one at the same x.
        gx = GX + (GLYPH - bw * scale) / 2
        gy = GY + (GLYPH - bh * scale) / 2
        svg = TEMPLATE.format(w=W, h=H, r=R, bg=bg, ink=ink, gx=gx, gy=gy,
                              scale=scale, path=path, font=FONT, head=head,
                              sub_text=sub, alt=alt,
                              delay="%.3f" % (STEP * index),
                              cycle="%g" % CYCLE,
                              pass_pct="%.2f" % PASS_PCT,
                              band_w="%.1f" % SHEEN_W,
                              band_h="%g" % SHEEN_H,
                              band_start="%.1f" % SHEEN_FROM,
                              band_end="%.1f" % SHEEN_TO)
        ziel = os.path.join(OUT, slug + ".svg")
        with open(ziel, "wb") as fh:
            fh.write(svg.encode("utf-8"))
        print(f"{slug}.svg  {os.path.getsize(ziel)} B")


if __name__ == "__main__":
    main()
