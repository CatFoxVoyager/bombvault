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

import os
import re

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
      13.57%   {{ transform: translateX({band_end}px); }}
      100%     {{ transform: translateX({band_end}px); }}
    }}
    /* linear, not eased: an eased pass hands off at the wrong moment and the
       row stops reading as one band crossing both buttons. */
    .band {{ animation: pass 7s linear {delay}s infinite; }}
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
      <rect x="0" y="-60" width="{band_w}" height="365.3"
            fill="url(#sheen)" transform="skewX(-16)"/>
    </g>
  </g>
</svg>
"""

# THE SHEEN is the donation buttons' own: a tilted white band, clipped to the
# button, crossing once every seven seconds. The second button starts 0.800s
# later so one band appears to travel the whole row rather than two bands
# blinking independently. That step is the donation row's 0.658s scaled by the
# width these render at, 195 against their 160.
#
# The geometry is scaled from the 841.9-wide coffee button: a 165-wide band on
# 841.9 is 141 on 720, and the travel ends a band's width past the right edge
# so nothing is left hanging in frame.
SHEEN_W = 141.0
SHEEN_FROM = -244.0
SHEEN_TO = 822.0

# slug, brand file, background, ink, heading, second line, accessible name, delay
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
# The delays are spaced so one sheen appears to travel the whole row rather
# than four appearing at once: 0.800s apart, the donation row's step scaled to
# the width these render at.
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
     "Docs", "online manual", "Read the documentation", "0.000"),
    # The image itself. A browser cannot download an image, so this one opens
    # the package page rather than pretending to hand over a file: the second
    # line says "ghcr.io image" and not "download".
    ("docker-image", "docker", "#1d63ed", "#ffffff",
     "Docker", "ghcr.io image", "The container image on ghcr.io", "0.800"),
    # GitHub attaches "Source code (zip)" to every release: the whole repository
    # at that tag, not the Dockerfile alone. The button says Source for that
    # reason. The glyph is a ZIP rather than GitHub's mark, because what arrives
    # is an archive - the mark would name the host, the glyph names the file.
    ("source-zip", "zip", "#4d5562", "#ffffff",
     "Source", "zip archive", "Download the source archive for this release", "1.600"),
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
    for slug, mark, bg, ink, head, sub, alt, delay in BUTTONS:
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
                              sub_text=sub, alt=alt, delay=delay,
                              band_w=SHEEN_W, band_start=SHEEN_FROM,
                              band_end=SHEEN_TO)
        ziel = os.path.join(OUT, slug + ".svg")
        with open(ziel, "wb") as fh:
            fh.write(svg.encode("utf-8"))
        print(f"{slug}.svg  {os.path.getsize(ziel)} B")


if __name__ == "__main__":
    main()
