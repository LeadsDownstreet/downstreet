#!/usr/bin/env python3
"""Click through the built site in a real browser and report anything broken.

    python3 tools/check.py [--shots folder]

Serves docs/ at /downstreet/, then on desktop and phone widths: loads every
page, checks for script errors and sideways scrolling, and runs the main
interactions (menus, tabs, back button, calculator, forms, theme toggle).
"""
import argparse
import json
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import OUT, SITES, serve  # noqa: E402

BASE = '/downstreet/'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--shots', default='')
    args = ap.parse_args()
    tmp = tempfile.mkdtemp()
    os.symlink(OUT, os.path.join(tmp, BASE.strip('/')))
    srv = serve(tmp)
    root = f'http://127.0.0.1:{srv.server_address[1]}{BASE}'
    problems, notes = [], []

    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch()

        def new(width, height=900, **kw):
            ctx = browser.new_context(viewport={'width': width, 'height': height}, **kw)
            p = ctx.new_page()
            p.errors = []
            p.on('pageerror', lambda e: p.errors.append(str(e)[:300]))
            p.on('console', lambda m: m.type == 'error' and p.errors.append(m.text[:300]))
            return p

        def ready(p):
            p.wait_for_function("document.documentElement.getAttribute('data-ready') === '1'", timeout=15000)

        # 1. every page, desktop and phone
        for width, label in ((1440, 'desktop'), (390, 'phone')):
            p = new(width)
            for site in SITES:
                for pid, route, title, _ in site['pages']:
                    p.goto(root + site['path'] + route)
                    ready(p)
                    sw = p.evaluate('document.documentElement.scrollWidth')
                    if sw > width:
                        problems.append(f'{label} {site["path"] + route or "/"}: page is {sw}px wide (sideways scroll)')
                    if p.title() != title:
                        problems.append(f'{label} {site["path"] + route}: title is "{p.title()}"')
                    if args.shots:
                        os.makedirs(args.shots, exist_ok=True)
                        name = (site['id'] + '-' + (route.strip('/') or 'home')).replace('/', '-')
                        p.screenshot(path=os.path.join(args.shots, f'{name}-{label}.png'), full_page=(label == 'phone' and False))
            problems += [f'{label}: {e}' for e in p.errors]
            p.context.close()

        # 2. Pro site interactions
        p = new(1440)
        p.goto(root + 'pro/')
        ready(p)
        p.get_by_role('button', name='Pricing').first.click()
        p.wait_for_timeout(200)
        if not p.url.endswith('/pro/pricing/'):
            problems.append('Pro nav: Pricing did not change the address (' + p.url + ')')
        amt = p.locator('input[inputmode="numeric"]').first
        amt.click()
        amt.press('Control+a')
        amt.press_sequentially('25000', delay=20)
        p.wait_for_timeout(200)
        body = p.inner_text('body')
        if '$3,500' not in body:
            problems.append('Calculator: typing 25000 did not show a $3,500 fee')
        focused = p.evaluate('document.activeElement && document.activeElement.getAttribute("inputmode")')
        if focused != 'numeric':
            problems.append('Calculator: the amount box lost focus while typing')
        p.get_by_role('button', name='Kitchen · $42,000').first.click()
        p.wait_for_timeout(200)
        if '$5,200' not in p.inner_text('body'):
            problems.append('Calculator: the Kitchen example did not show a $5,200 fee')
        p.go_back()
        p.wait_for_timeout(300)
        if not p.url.endswith('/pro/') or 'Booked jobs' not in p.inner_text('body'):
            problems.append('Back button did not return to the Pro home page')
        # theme toggle
        before = p.evaluate("getComputedStyle(document.querySelector('#app > *')).backgroundColor")
        p.get_by_role('button', name='Switch to light mode').first.click()
        p.wait_for_timeout(200)
        after = p.evaluate("getComputedStyle(document.querySelector('#app > *')).backgroundColor")
        if before == after:
            problems.append(f'Theme toggle did not change the background ({before})')
        p.evaluate("localStorage.clear()")
        # application, 4 steps
        p.goto(root + 'pro/get-leads/')
        ready(p)
        p.get_by_label('Business name').fill('Cowtown Fence Co.')
        p.get_by_label('Mobile phone').fill('8175550123')
        p.get_by_role('button', name='Next').click()
        p.locator('select').first.select_option('Fencing')
        p.get_by_label('Your shop’s ZIP').fill('76116')
        p.get_by_role('button', name='Next').click()
        p.get_by_role('button', name='Weekday evenings').click()
        p.get_by_role('button', name='Next').click()
        p.locator('button[aria-pressed]', has_text='I’ve read').first.click()
        logs = []
        p.on('console', lambda m: logs.append(m.text))
        p.get_by_role('button', name='Send application').click()
        p.wait_for_timeout(300)
        if 'pro-application' not in ' '.join(logs) and 'Form received' not in ' '.join(logs):
            notes.append('Application: no submission was logged')
        if 'Cowtown' not in p.inner_text('body') and 'fencing' not in p.inner_text('body').lower():
            problems.append('Application: the done screen did not show')
        problems += ['pro interactions: ' + e for e in p.errors]
        if args.shots:
            p.screenshot(path=os.path.join(args.shots, 'pro-apply-done.png'))
        p.context.close()

        # 3. phone menu on the Pro site
        p = new(390, 844)
        p.goto(root + 'pro/')
        ready(p)
        p.get_by_role('button', name='Menu').first.click()
        p.wait_for_timeout(200)
        p.get_by_role('button', name='Trades').last.click()
        p.wait_for_timeout(200)
        if not p.url.endswith('/pro/trades/'):
            problems.append('Phone menu: Trades did not open the Trades page')
        problems += ['phone menu: ' + e for e in p.errors]
        p.context.close()

        # 4. homeowner request form
        p = new(1440)
        p.goto(root)
        ready(p)
        logs = []
        p.on('console', lambda m: logs.append(m.text))
        p.locator('select[name="service"]').select_option('Fencing')
        p.locator('input[name="zip"]').fill('76116')
        p.locator('input[name="name"]').fill('Dana Lopez')
        p.locator('input[name="phone"]').fill('8175550199')
        p.locator('form button[type="submit"]').click()
        p.wait_for_timeout(300)
        text = p.inner_text('body')
        if 'Dana' not in text:
            problems.append('Homeowner form: the thank-you message did not show')
        if not any('homeowner-request' in l or 'Form received' in l for l in logs):
            notes.append('Homeowner form: no submission was logged')
        p.get_by_role('button', name='FAQ').first.click()
        p.wait_for_timeout(200)
        if not p.url.endswith('/faq/'):
            problems.append('Homeowner nav: FAQ did not change the address')
        problems += ['homeowner: ' + e for e in p.errors]
        p.context.close()
        browser.close()
    srv.shutdown()
    print(json.dumps({'problems': problems, 'notes': notes}, indent=2, ensure_ascii=False))
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
