"""Imports a Start Bootstrap theme into public/themes/<id> and writes Jack's matching skill.

Usage: python3 scripts/import-theme.py <cloned repo dir> <theme id> <Display name> "<best for>"
Existing themes get the motion layer with: python3 scripts/import-theme.py --motion-only <id>
"""
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://alwaysbro.com'
LOCAL_MOTION = '../_motion'
SITE_MOTION = f'{SITE}/themes/_motion'
MOTION_CSS = '<link href="{base}/motion.css" rel="stylesheet" />'
MOTION_JS = '<script src="{base}/motion.js" defer></script>'


def add_motion(html: str, base: str) -> str:
    if '_motion/motion.css' in html:
        return html
    html = html.replace('</head>', f'        {MOTION_CSS.format(base=base)}\n    </head>', 1)
    return html.replace('</body>', f'        {MOTION_JS.format(base=base)}\n    </body>', 1)


def absolute(html: str, theme: str) -> str:
    prefix = f'{SITE}/themes/{theme}/'
    return re.sub(r'(?P<a>(?:href|src)=")(?!https?:|#|mailto:|tel:|data:|/)(?P<p>[^"]+)"', lambda m: f'{m["a"]}{prefix}{m["p"]}"', html)


def skill(theme: str, name: str, best_for: str, html: str, source: str) -> str:
    return f'''---
name: theme-{theme}
description: "Starter theme '{name}' ({best_for}) with scroll motion effects. Load this when the user picks the {name} theme or the first message contains [theme:{theme}]."
license: MIT
metadata:
  source: {source}
---

# Theme: {name}

Free MIT-licensed Start Bootstrap template with the AlwaysBro motion layer (scroll reveals, hero parallax, card tilt, progress bar). Stylesheet, scripts and images are hosted at {SITE}/themes/{theme}/ and referenced below by absolute URL, so keep those URLs until the user supplies their own pictures. Keep the two motion lines (motion.css in the head, motion.js before the closing body tag).

## What to do

1. Do not copy the demo text. First collect the real details. If the user has not already given them, call `ask_questions` once with short questions and clickable options (allow_custom true) for: business or product name, one-line tagline, contact details (phone, email, address or city), the list of services or products with prices if any, social links, and ask them to attach their logo and photos in the chat.
2. Then build the site from the template below. Keep its layout, sections and CSS classes. Replace every demo name, heading, paragraph, price, link, email and phone with the user's details. Remove sections that do not apply instead of leaving placeholder text.
3. Put the markup into the app's own file structure (see the app-file-structure skill) and link the template stylesheet and scripts by the absolute URLs already in the template. Keep the Start Bootstrap licence comment.
4. Deploy, check the browser console, and fix errors.

## Template HTML

```html
{html}
```
'''


def main() -> None:
    if sys.argv[1] == '--motion-only':
        theme = sys.argv[2]
        page = ROOT / 'public/themes' / theme / 'index.html'
        page.write_text(add_motion(page.read_text(), LOCAL_MOTION), encoding='utf-8')
        md = ROOT / f'worker/agents/think/skills/theme-{theme}/SKILL.md'
        md.write_text(add_motion(md.read_text(), SITE_MOTION), encoding='utf-8')
        return
    repo, theme, name, best_for = Path(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4]
    out = ROOT / 'public/themes' / theme
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(repo / 'dist', out)
    page = out / 'index.html'
    page.write_text(add_motion(page.read_text(), LOCAL_MOTION), encoding='utf-8')
    template = add_motion(absolute((repo / 'dist/index.html').read_text(), theme), SITE_MOTION)
    folder = ROOT / f'worker/agents/think/skills/theme-{theme}'
    folder.mkdir(parents=True, exist_ok=True)
    (folder / 'SKILL.md').write_text(skill(theme, name, best_for, template, f'https://github.com/startbootstrap/startbootstrap-{repo.name.split("startbootstrap-")[-1]}'), encoding='utf-8')


if __name__ == '__main__':
    main()
