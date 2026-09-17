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
Writes .github/assets/download-buttons/*.svg, which are committed, and the
button rows in README.md between their markers, all of them showing one
sprite, .github/assets/download-buttons/buttons.svg.
"""

import http.client
import io
import math
import os
import re
import time
import urllib.error
import urllib.request
from html import escape

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
#
# The last column is where the button leads. It lives here with the rest of the
# button because this file writes the README row too, see write_readme().
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
     "Docs", "online manual", "Read the documentation",
     "https://junkerderprovinz.github.io/bombvault/"),
    # The image itself. A browser cannot download an image, so this one opens
    # the package page rather than pretending to hand over a file: the second
    # line says "ghcr.io image" and not "download".
    ("docker-image", "docker", "#1d63ed", "#ffffff",
     "Docker", "ghcr.io image", "The container image on ghcr.io",
     "https://github.com/junkerderprovinz/bombvault/pkgs/container/bombvault"),
    # GitHub attaches "Source code (zip)" to every release: the whole repository
    # at that tag, not the Dockerfile alone. The button says Source for that
    # reason. The glyph is a ZIP rather than GitHub's mark, because what arrives
    # is an archive - the mark would name the host, the glyph names the file.
    ("source-zip", "zip", "#4d5562", "#ffffff",
     "Source", "zip archive", "Download the source archive for this release",
     "https://github.com/junkerderprovinz/bombvault/releases/latest"),
]

# THE README ROWS are written here as well, between markers, so a button added
# to BUTTONS reaches the page by running this file and nothing else: the
# download row, and every donation row (the one under the description and the one in
# Support).
#
# ALL OF THEM SHOW ONE FILE, buttons.svg, each button through its own
# #svgView fragment inside its own link. The shine is a CSS animation, and a
# browser runs it on a clock that starts when that <img> gets its file. Separate
# files arrive at separate moments, so the band jumped between buttons; and
# Firefox reuses an image it already has when GitHub swaps the page without a
# reload, starting a new clock on it. One file arrives once for every button on
# the page and all of its <img> are inserted together, so all clocks start
# together: the download row, then the donation row, in order. That is
# also why the donation buttons are copied into this file rather than linked
# from the profile repository's give.svg: two files would be two arrivals again.
# Measured on github.com in Firefox, loaded fresh and after in-page navigation.
# The layout of a sprite is explained in
# junkerderprovinz/junkerderprovinz, donate/buttons/sprite.mjs.
#
# The donation buttons are read from the profile repository when this runs, so
# after they change there, run this again. The sprite is read from main, so a
# branch's README preview shows main's buttons.
REPO = "bombvault"
SPRITE = os.path.join(OUT, "buttons.svg")
SPRITE_URL = "https://raw.githubusercontent.com/junkerderprovinz/%s/main/.github/assets/download-buttons/buttons.svg" % REPO
GIVE_URL = "https://raw.githubusercontent.com/junkerderprovinz/junkerderprovinz/main/donate/buttons/button-%s-live.svg"
GIVE_RENDER_PX = 160.0
# slug, where it leads, accessible name. The same three as in every README.
GIVE = [
    ("buy-me-a-coffee", "https://buymeacoffee.com/junkerderprovinz", "Buy me a coffee"),
    ("paypal", "https://www.paypal.com/donate/?hosted_button_id=76FVV52TKXTUS", "PayPal"),
    ("crypto", "https://junkerderprovinz.github.io/junkerderprovinz/", "Donate with crypto"),
]
README = os.path.join(HERE, "..", "README.md")
ROW_OPEN = "<!-- download-buttons: written by scripts/gen_download_buttons.py -->"
ROW_CLOSE = "<!-- /download-buttons -->"
GIVE_OPEN = "<!-- give-buttons: written by scripts/gen_download_buttons.py -->"
GIVE_CLOSE = "<!-- /give-buttons -->"

def brand(name):
    """Path data plus the viewBox width and height it was drawn in."""
    with open(os.path.join(BRANDS, name + ".txt"), "rb") as fh:
        path = fh.read().decode("utf-8").strip()
    with open(os.path.join(BRANDS, name + ".box.txt"), "rb") as fh:
        box = [float(v) for v in fh.read().decode("utf-8").split()]
    return path, box[2], box[3]


def num(x):
    """A coordinate as the fragment carries it: no trailing zeros, no float noise."""
    return ("%.3f" % x).rstrip("0").rstrip(".")


# The names a button document defines. Every one of them is prefixed per button
# in the sprite, and the sprite is refused if any is left without a prefix, so a
# button template that starts using another name fails here instead of quietly
# handing one button's delay or clip to all of them.
UNPREFIXED = re.compile(r'id="(?!b\d+-)|url\(#(?!b\d+-)|href="#(?!b\d+-)|class="(?!b\d+-)|@keyframes (?!b\d+-)|animation: (?!b\d+-|none)')


def sprite(parts):
    """Several button documents as one SVG, laid out left to right.

    Every part keeps its own document as a nested <svg> at its own x, with its
    ids, class and keyframes prefixed, because the CSS inside one SVG document
    is shared: unprefixed, the last button's delay would win for all of them.
    Returns the sprite and each part's x.
    """
    x, xs, body = 0.0, [], []
    for i, (svg, width, _height) in enumerate(parts):
        pre = "b%d-" % i
        s = re.sub(r"<\?xml[^>]*>\s*", "", svg, count=1)
        s = re.sub(r"<!--.*?-->\s*", "", s, flags=re.S)
        s = re.sub(r'id="(edge|sheen)"', lambda m: 'id="%s%s"' % (pre, m.group(1)), s)
        s = re.sub(r"url\(#(edge|sheen)\)", lambda m: "url(#%s%s)" % (pre, m.group(1)), s)
        s = s.replace('class="band"', 'class="%sband"' % pre)
        s = re.sub(r"\.band\b", ".%sband" % pre, s)
        s = re.sub(r"@keyframes pass\b", "@keyframes %spass" % pre, s)
        s = s.replace("animation: pass ", "animation: %spass " % pre)
        s = re.sub(r"<svg\b", '<svg x="%s" y="0"' % num(x), s, count=1)
        left = UNPREFIXED.search(s)
        if left:
            raise SystemExit("button %d still has an unprefixed name near %r" % (i, s[left.start():left.start() + 40]))
        xs.append(x)
        body.append(s.strip())
        x = round(x + width, 3)
    height = max(p[2] for p in parts)
    head = ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
            'viewBox="0 0 %s %s">\n' % (num(x), num(height)))
    return head + "\n".join(body) + "\n</svg>\n", xs


def give_buttons():
    """The donation buttons' own files and sizes, as the profile repository publishes them.

    The size is read from each file's viewBox rather than assumed, because the
    other repository decides it. The query string gets past raw.githubusercontent's
    five-minute cache, so a run right after a change there sees the change.
    """
    out = []
    for slug, _href, _alt in GIVE:
        url = GIVE_URL % slug + "?t=%d" % time.time()
        for attempt in range(3):
            try:
                with urllib.request.urlopen(url, timeout=30) as r:
                    svg = r.read().decode("utf-8")
                break
            except urllib.error.HTTPError as err:
                if err.code < 500 or attempt == 2:
                    raise SystemExit("%s: HTTP %d" % (url, err.code))
            except (OSError, http.client.HTTPException):
                # A dropped connection, also halfway through the body. Nothing
                # has been written yet, so trying again is safe.
                if attempt == 2:
                    raise
            time.sleep(2)
        box = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', svg)
        if not box:
            raise SystemExit("%s has no viewBox" % url)
        out.append((svg, float(box.group(1)), float(box.group(2))))
    return out


def blocks(text, opener, closer):
    """Every opener ... closer span in the text, in order.

    An opener whose closer is missing is refused rather than paired with the
    next block's closer, which would replace everything in between.
    """
    spans, at = [], 0
    while True:
        start = text.find(opener, at)
        if start < 0:
            return spans
        end = text.find(closer, start)
        following = text.find(opener, start + len(opener))
        if end < 0 or (0 <= following < end):
            raise SystemExit("README.md has %s without its %s" % (opener, closer))
        spans.append((start, end))
        at = end + len(closer)


def read_readme():
    """README.md, checked before anything is written.

    Read after the donation buttons are fetched, so an edit saved meanwhile is
    not overwritten with the text from before it. Checked before any file is
    written, so a README without its markers stops the run while the buttons are
    still untouched. REPO is checked against the links for the same reason:
    copied into another repository and left unchanged, it would quietly show this
    repository's buttons there.
    """
    text = io.open(README, encoding="utf-8", newline="").read()
    if len(blocks(text, ROW_OPEN, ROW_CLOSE)) != 1:
        raise SystemExit("README.md needs exactly one %s ... %s" % (ROW_OPEN, ROW_CLOSE))
    if not blocks(text, GIVE_OPEN, GIVE_CLOSE):
        raise SystemExit("README.md has no %s ... %s" % (GIVE_OPEN, GIVE_CLOSE))
    for slug, *_, href in BUTTONS:
        if "/%s/" % REPO not in href:
            raise SystemExit("REPO is %r, but %s leads to %s" % (REPO, slug, href))
    return text


def row(opener, items, nl):
    """One centred row: a link per button, the separator on its own line, two
    spaces in, because that is the gap GAP_PX was measured on."""
    lines = [opener, '<p align="center">']
    for index, (href, alt, x, width, height, render) in enumerate(items):
        if index:
            lines.append("  &nbsp;")
        lines.append('  <a href="%s"><img src="%s#svgView(viewBox(%s,0,%s,%s))" alt="%s" width="%s" height="%s"></a>'
                     % (escape(href), SPRITE_URL, num(x), num(width), num(height), escape(alt), num(render), num(render * height / width)))
    lines.append("</p>")
    return nl.join(lines) + nl


def write_readme(text, xs, gives):
    """Replace every marked row, each taking the line ending of its own marker.

    width AND height are both set, because the image's own proportions are the
    whole sprite's, not the button's.
    """
    downloads = [(href, alt, xs[i], W, H, RENDER_PX) for i, (_s, *_, alt, href) in enumerate(BUTTONS)]
    donations = [(href, alt, xs[len(BUTTONS) + i], gives[i][1], gives[i][2], GIVE_RENDER_PX)
                 for i, (_s, href, alt) in enumerate(GIVE)]
    for opener, closer, items in ((ROW_OPEN, ROW_CLOSE, downloads), (GIVE_OPEN, GIVE_CLOSE, donations)):
        for start, end in reversed(blocks(text, opener, closer)):
            nl = "\r\n" if text[start:].split("\n", 1)[0].endswith("\r") else "\n"
            text = text[:start] + row(opener, items, nl) + text[end:]
    io.open(README, "w", encoding="utf-8", newline="").write(text)
    print("README.md  download row of %d, donation rows of %d" % (len(BUTTONS), len(GIVE)))


def main():
    gives = give_buttons()
    readme = read_readme()
    svgs = []
    for index, (slug, mark, bg, ink, head, sub, alt, _href) in enumerate(BUTTONS):
        path, bw, bh = brand(mark)
        # Scale on the LONGER axis so glyphs of different proportions end up
        # the same optical size. Docker's box is 640 by 512, the ZIP glyph's is
        # 384 by 512; scaling on width alone would leave the narrow one huge.
        scale = GLYPH / max(bw, bh)
        # Re-centre horizontally: a wide mark scaled on its width sits left of
        # a square one at the same x.
        gx = GX + (GLYPH - bw * scale) / 2
        gy = GY + (GLYPH - bh * scale) / 2
        svgs.append((slug, TEMPLATE.format(w=W, h=H, r=R, bg=bg, ink=ink, gx=gx, gy=gy,
                                           scale=scale, path=path, font=FONT, head=head,
                                           sub_text=sub, alt=escape(alt),
                                           delay="%.3f" % (STEP * index),
                                           cycle="%g" % CYCLE,
                                           pass_pct="%.2f" % PASS_PCT,
                                           band_w="%.1f" % SHEEN_W,
                                           band_h="%g" % SHEEN_H,
                                           band_start="%.1f" % SHEEN_FROM,
                                           band_end="%.1f" % SHEEN_TO)))
    # Built, and checked, before anything is written.
    whole, xs = sprite([(svg, W, H) for _slug, svg in svgs] + gives)
    os.makedirs(OUT, exist_ok=True)
    for slug, svg in svgs:
        ziel = os.path.join(OUT, slug + ".svg")
        with open(ziel, "wb") as fh:
            fh.write(svg.encode("utf-8"))
        print(f"{slug}.svg  {os.path.getsize(ziel)} B")
    with open(SPRITE, "wb") as fh:
        fh.write(whole.encode("utf-8"))
    print(f"buttons.svg  {os.path.getsize(SPRITE)} B, {len(xs)} buttons")
    write_readme(readme, xs, gives)


if __name__ == "__main__":
    main()
