#!/usr/bin/env python3
"""Build the Downstreet website into docs/ (what GitHub Pages serves).

    python3 tools/build.py                       # address: https://leadsdownstreet.github.io/downstreet/
    python3 tools/build.py --site-url https://downstreet.com   # after you add your own domain

Each page in src/*.dc.html is the same file as its board on the design canvas.
The build turns each one into real pages (one web address per tab), writes the
text of every page into its HTML so it loads instantly and shows up in search,
then the runtime takes over for the interactive parts.

Needs Python 3 and Playwright (pip install playwright && playwright install chromium).
"""
import argparse
import html
import http.server
import json
import os
import re
import shutil
import socketserver
import sys
import tempfile
import threading
from datetime import date
from html.parser import HTMLParser
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
OUT = os.path.join(ROOT, 'docs')

SITES = [
    {
        'id': 'home',
        'source': 'home.dc.html',
        'path': '',                       # served at the site root
        'favicon': 'assets/icon-home.svg',
        'og_image': 'assets/og-home.png',
        'theme_color': '#F5F3EE',
        'pages': [
            ('home', '', 'Downstreet · Need a pro? There’s one down the street.',
             'Tell us what needs fixing around the house. Downstreet finds a local pro near you in Fort Worth and about 50 miles out. Free for homeowners.'),
            ('how', 'how-it-works/', 'How it works · Downstreet',
             'Tell us the job, we find a local pro who does that work, and they call you. Free for homeowners, no obligation to hire.'),
            ('services', 'services/', 'Services · Downstreet',
             'Thirty kinds of home jobs, from Christmas lights and handyman work to roofing and remodels, around Fort Worth.'),
            ('faq', 'faq/', 'Questions · Downstreet',
             'Is Downstreet free? Who are the pros? Who gets your number? Answers to common questions.'),
        ],
    },
    {
        'id': 'pro',
        'source': 'pro.dc.html',
        'path': 'pro/',
        'favicon': 'assets/icon-pro.svg',
        'og_image': 'assets/og-pro.png',
        'theme_color': '#111417',
        'pages': [
            ('home', '', 'Downstreet Pro · Booked jobs from down the street',
             'Homeowners near you ask Downstreet for help. We book the visit and send you the job. Pay 20% of the first $10,000 and 10% above, only after you get paid.'),
            ('how', 'how-it-works/', 'How it works · Downstreet Pro',
             'We find homeowners, call them back and book the visit on your calendar. You do the work and report how it went.'),
            ('pricing', 'pricing/', 'Pricing · Downstreet Pro',
             'No sign-up fee, no monthly fee, no per-lead fee. 20% of the first $10,000 you collect on a job and 10% of anything above. Try the fee calculator.'),
            ('trades', 'trades/', 'Trades · Downstreet Pro',
             'Thirty trades, one pro each per area. See if yours is open around Fort Worth.'),
            ('areas', 'areas/', 'Service area · Downstreet Pro',
             'Fort Worth and about 50 miles out. Check your ZIP code.'),
            ('rules', 'rules-of-the-road/', 'Rules of the road · Downstreet Pro',
             'The plain rules every Downstreet Pro works by, and answers to common questions.'),
            ('apply', 'get-leads/', 'Get leads · Downstreet Pro',
             'Claim your trade in your area. Four quick steps.'),
            ('report', 'report-a-job/', 'Report a job · Downstreet Pro',
             'Tell us how a lead went: booked, quoted, won, lost or a bad lead.'),
            ('portal', 'portal/', 'Pro portal · Downstreet Pro',
             'Your leads, where each one stands, and the fees due on jobs you have been paid for.'),
        ],
        'noindex': {'report', 'portal'},
    },
]

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}
# Python's HTML parser lowercases names; SVG needs these spelled exactly.
SVG_TAGS = {t.lower(): t for t in ['clipPath', 'linearGradient', 'radialGradient', 'foreignObject', 'textPath', 'feGaussianBlur',
                                   'feOffset', 'feBlend', 'feColorMatrix', 'feComposite', 'feFlood', 'feMerge', 'feMergeNode',
                                   'feMorphology', 'feTurbulence', 'feDropShadow', 'animateTransform', 'animateMotion']}
SVG_ATTRS = {a.lower(): a for a in ['viewBox', 'preserveAspectRatio', 'markerWidth', 'markerHeight', 'markerUnits', 'refX', 'refY',
                                    'gradientUnits', 'gradientTransform', 'patternUnits', 'patternContentUnits', 'patternTransform',
                                    'clipPathUnits', 'maskUnits', 'maskContentUnits', 'filterUnits', 'primitiveUnits', 'stdDeviation',
                                    'textLength', 'lengthAdjust', 'pathLength', 'spreadMethod', 'startOffset', 'baseFrequency',
                                    'numOctaves', 'attributeName', 'attributeType', 'repeatCount', 'keyTimes', 'keySplines',
                                    'calcMode', 'tableValues', 'kernelMatrix', 'diffuseConstant', 'specularExponent', 'surfaceScale']}


class TemplateParser(HTMLParser):
    """Turns the page template into [tag, attrs, children] lists without any
    browser clean-up (a browser would drop <sc-for> inside <select>)."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = ['#root', {}, []]
        self.stack = [self.root]
        self.svg_depth = 0

    def _open(self, tag, attrs, self_closing):
        in_svg = self.svg_depth > 0 or tag == 'svg'
        if in_svg:
            tag = SVG_TAGS.get(tag, tag)
            attrs = [(SVG_ATTRS.get(k, k), v) for k, v in attrs]
        node = [tag, {k: ('' if v is None else v) for k, v in attrs}, []]
        self.stack[-1][2].append(node)
        if self_closing or (not in_svg and tag in VOID):
            return
        if tag == 'svg':
            self.svg_depth += 1
        self.stack.append(node)

    def handle_starttag(self, tag, attrs):
        self._open(tag, attrs, False)

    def handle_startendtag(self, tag, attrs):
        self._open(tag, attrs, True)

    def handle_endtag(self, tag):
        name = SVG_TAGS.get(tag, tag) if self.svg_depth else tag
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i][0] == name:
                if name == 'svg':
                    self.svg_depth -= 1
                del self.stack[i:]
                return

    def handle_data(self, data):
        kids = self.stack[-1][2]
        if kids and isinstance(kids[-1], str):
            kids[-1] += data
        else:
            kids.append(data)


def squeeze(nodes, pre=False):
    """Shrink runs of whitespace that hold a line break to one line break (the page looks the same)."""
    out = []
    for n in nodes:
        if isinstance(n, str):
            if not pre:
                n = re.sub(r'\s*\n\s*', '\n', n)
            out.append(n)
        else:
            out.append([n[0], n[1], squeeze(n[2], pre or n[0] in ('pre', 'textarea', 'style', 'script'))])
    return out


def read_source(path, links):
    src = open(path, encoding='utf-8').read()
    for old, new in links.items():
        src = src.replace(f'href="{old}"', f'href="{new}"')
    m = re.search(r'<x-dc>(.*)</x-dc>', src, re.S)
    body = m.group(1)
    hm = re.search(r'<helmet>(.*?)</helmet>', body, re.S)
    helmet = hm.group(1).strip() if hm else ''
    body = body[:hm.start()] + body[hm.end():] if hm else body
    sm = re.search(r'<script type="text/x-dc" data-dc-script[^>]*>(.*?)</script>', src, re.S)
    p = TemplateParser()
    p.feed(body)
    p.close()
    return helmet, squeeze(p.root[2]), sm.group(1)


PAGE = '''<!doctype html>
<html lang="en" data-site-base="{site_base}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
{robots}<link rel="canonical" href="{canonical}">
<link rel="icon" href="{base}{favicon}" type="image/svg+xml">
<link rel="apple-touch-icon" href="{base}{touch_icon}">
<meta name="theme-color" content="{theme_color}">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{site_url}{og_image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
{helmet}
<style>#app:empty{{min-height:100vh}}</style>
</head>
<body>
<div id="app">{prerendered}</div>
<noscript><p style="font-family:system-ui,sans-serif;padding:16px">Turn on JavaScript to use the forms and calculators on this site.</p></noscript>
<script src="{base}assets/config.js"></script>
<script src="{base}assets/morphdom.min.js"></script>
<script src="{base}assets/runtime.js"></script>
<script src="{base}assets/{site_id}.js"></script>
</body>
</html>
'''

ICON_HOME = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<style>.m{fill:#1E2226;stroke:#1E2226}@media (prefers-color-scheme: dark){.m{fill:#F5F3EE;stroke:#F5F3EE}}</style>
<path class="m" d="M50 6 L89 36 V72 H11 V36 Z" stroke-width="6" stroke-linejoin="round"/>
<path d="M40 42 H60 V72 H40 Z" fill="#F5C400"/>
<path d="M42 79 H58 L68 98 H32 Z" fill="#F5C400"/>
</svg>
'''
ICON_PRO = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<style>.m{stroke:#1E2226}@media (prefers-color-scheme: dark){.m{stroke:#F5F3EE}}</style>
<path class="m" d="M26 98 V62 A36 36 0 0 1 62 26 H98" fill="none" stroke-width="26"/>
<path d="M26 98 V62 A36 36 0 0 1 62 26 H98" fill="none" stroke="#F5C400" stroke-width="3.6" stroke-dasharray="7 6"/>
<path d="M69 56 L84 68 V84 H54 V68 Z" fill="#F5C400" stroke="#F5C400" stroke-width="3" stroke-linejoin="round"/>
</svg>
'''

NOT_FOUND = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found · Downstreet</title>
<meta name="robots" content="noindex">
<link rel="icon" href="{base}assets/icon-home.svg" type="image/svg+xml">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&amp;family=Inter:wght@400;600;700&amp;display=swap">
<style>
body{{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F5F3EE;color:#1E2226;font-family:Inter,system-ui,sans-serif;padding:24px;box-sizing:border-box}}
main{{max-width:520px;display:flex;flex-direction:column;gap:18px}}
h1{{margin:0;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:clamp(40px,8vw,64px);line-height:1;letter-spacing:-0.03em}}
p{{margin:0;font-size:18px;line-height:1.5;color:#45484C}}
nav{{display:flex;flex-wrap:wrap;gap:12px}}
a{{display:inline-flex;align-items:center;min-height:48px;padding:0 22px;border-radius:999px;font-weight:700;text-decoration:none}}
.a1{{background:#1E2226;color:#F5C400}}.a2{{border:1.5px solid #1E2226;color:#1E2226}}
</style>
</head>
<body>
<main>
<img src="{base}assets/icon-home.svg" width="56" height="56" alt="Downstreet logo">
<h1>Wrong turn.</h1>
<p>That page isn’t here. It may have moved, or the link has a typo.</p>
<nav><a class="a1" href="{base}">Downstreet home</a><a class="a2" href="{base}pro/">For contractors</a></nav>
</main>
</body>
</html>
'''


def serve(directory):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=directory, **k)

        def log_message(self, *a):
            pass
    srv = socketserver.TCPServer(('127.0.0.1', 0), Quiet)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--site-url', default='https://leadsdownstreet.github.io/downstreet',
                    help='the address the site will live at, without a trailing slash')
    ap.add_argument('--no-prerender', action='store_true')
    args = ap.parse_args()

    site_url = args.site_url.rstrip('/') + '/'
    base = urlparse(site_url).path or '/'
    if not base.endswith('/'):
        base += '/'

    os.makedirs(os.path.join(OUT, 'assets'), exist_ok=True)
    shutil.copy(os.path.join(SRC, 'runtime.js'), os.path.join(OUT, 'assets', 'runtime.js'))
    config_path = os.path.join(OUT, 'assets', 'config.js')
    if not os.path.exists(config_path):
        open(config_path, 'w').write(
            '// Paste the web app URL of the Google Apps Script (see apps-script/README.md) between the quotes.\n'
            '// Until then, the forms work on the page but submissions are not saved anywhere.\n'
            "window.DS_CONFIG = { submitUrl: '' };\n")
    open(os.path.join(OUT, 'assets', 'icon-home.svg'), 'w').write(ICON_HOME)
    open(os.path.join(OUT, 'assets', 'icon-pro.svg'), 'w').write(ICON_PRO)
    open(os.path.join(OUT, '.nojekyll'), 'w').write('')
    open(os.path.join(OUT, '404.html'), 'w').write(NOT_FOUND.format(base=base))

    links = {'DownstreetIsoWebsite.dc.html': base, 'DownstreetProSite.dc.html': base + 'pro/'}
    written = []   # (site, page_id, file path, url)
    for site in SITES:
        helmet, template, code = read_source(os.path.join(SRC, site['source']), links)
        site_base = base + site['path']
        routes = {pid: route for pid, route, _, _ in site['pages']}
        titles = {pid: title for pid, _, title, _ in site['pages']}
        bundle = ('/* Built by tools/build.py from src/%s. Edit the source, then rebuild. */\n'
                  '(function () {\n'
                  'var TEMPLATE = %s;\n'
                  'function factory(DCLogic) {\n%s\nreturn Component;\n}\n'
                  'DC.mount({ template: TEMPLATE, factory: factory, routes: %s, titles: %s });\n'
                  '})();\n') % (site['source'], json.dumps(template, ensure_ascii=False, separators=(',', ':')),
                                code.strip(), json.dumps(routes), json.dumps(titles, ensure_ascii=False))
        open(os.path.join(OUT, 'assets', site['id'] + '.js'), 'w', encoding='utf-8').write(bundle)
        for pid, route, title, desc in site['pages']:
            url = site_url + site['path'] + route
            robots = '<meta name="robots" content="noindex">\n' if pid in site.get('noindex', ()) else ''
            page = PAGE.format(site_base=site_base, base=base, title=html.escape(title), desc=html.escape(desc),
                               robots=robots, canonical=url, favicon=site['favicon'], touch_icon='assets/touch-' + site['id'] + '.png',
                               theme_color=site['theme_color'], site_url=site_url, og_image=site['og_image'],
                               helmet=helmet, prerendered='', site_id=site['id'])
            folder = os.path.join(OUT, site['path'], route)
            os.makedirs(folder, exist_ok=True)
            fp = os.path.join(folder, 'index.html')
            open(fp, 'w', encoding='utf-8').write(page)
            written.append((site, pid, fp, url))

    today = date.today().isoformat()
    urls = [u for s, pid, fp, u in written if pid not in s.get('noindex', ())]
    open(os.path.join(OUT, 'sitemap.xml'), 'w').write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + ''.join(f'<url><loc>{u}</loc><lastmod>{today}</lastmod></url>\n' for u in urls) + '</urlset>\n')
    open(os.path.join(OUT, 'robots.txt'), 'w').write(f'User-agent: *\nAllow: /\nSitemap: {site_url}sitemap.xml\n')

    if args.no_prerender:
        print('built without prerendering')
        return

    from playwright.sync_api import sync_playwright
    # Serve docs/ at the same path it will have online, so every link resolves.
    tmp = tempfile.mkdtemp()
    target = os.path.join(tmp, base.strip('/')) if base != '/' else tmp
    if base != '/':
        os.makedirs(os.path.dirname(target), exist_ok=True)
        os.symlink(OUT, target)
    srv = serve(tmp if base != '/' else OUT)
    local = f'http://127.0.0.1:{srv.server_address[1]}'
    errors = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        ctx = browser.new_context(viewport={'width': 1440, 'height': 900}, color_scheme='light', reduced_motion='no-preference')
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        for site, pid, fp, url in written:
            page.goto(local + base + site['path'] + dict((p[0], p[1]) for p in site['pages'])[pid])
            page.wait_for_function("document.documentElement.getAttribute('data-ready') === '1'", timeout=15000)
            inner = page.evaluate("document.getElementById('app').innerHTML")
            doc = open(fp, encoding='utf-8').read().replace('<div id="app"></div>', '<div id="app">' + inner + '</div>', 1)
            open(fp, 'w', encoding='utf-8').write(doc)
            print(f'  {site["path"] + dict((p[0], p[1]) for p in site["pages"])[pid] or "/":<28} {len(doc) // 1024} KB')
        # share images and home-screen icons
        for site in SITES:
            shot = ctx.new_page()
            shot.set_viewport_size({'width': 1200, 'height': 630})
            shot.goto(local + base + site['path'])
            shot.wait_for_function("document.documentElement.getAttribute('data-ready') === '1'")
            shot.wait_for_timeout(800)
            shot.screenshot(path=os.path.join(OUT, site['og_image']))
            icon = ctx.new_page()
            icon.set_viewport_size({'width': 180, 'height': 180})
            svg = open(os.path.join(OUT, site['favicon'])).read().replace('@media (prefers-color-scheme: dark)', '@media not all')
            icon.set_content('<body style="margin:0;background:%s;display:flex;align-items:center;justify-content:center;height:180px">'
                             '<div style="width:124px;height:124px">%s</div></body>' % ('#F5C400', svg.replace('<svg ', '<svg width="124" height="124" ')))
            icon.screenshot(path=os.path.join(OUT, 'assets', 'touch-' + site['id'] + '.png'))
        browser.close()
    srv.shutdown()
    if errors:
        print('PAGE ERRORS:', *errors, sep='\n  ')
        sys.exit(1)
    print(f'done: {len(written)} pages in docs/, for {site_url}')


if __name__ == '__main__':
    main()
