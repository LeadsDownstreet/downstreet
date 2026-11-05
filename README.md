# Downstreet website

Two sites in one repository, served by GitHub Pages from the `docs/` folder:

| Site | For | Address (GitHub Pages) |
|---|---|---|
| **Downstreet** | Homeowners asking for a pro | `/` |
| **Downstreet Pro** | Contractors getting booked jobs | `/pro/` |

Every tab has its own web address (for example `/pro/pricing/`), so pages can be linked from ads,
shared, bookmarked and found by search engines. Each page's text is written into its HTML at build
time, so it shows instantly; the calculators, forms and menus then run in the browser.

## What's where

```
src/home.dc.html     the homeowner site (same file as its board on the design canvas)
src/pro.dc.html      the contractor site (same file as its board on the design canvas)
src/runtime.js       runs those page files as a normal website
tools/build.py       builds docs/ from src/
tools/check.py       clicks through the built site and reports anything broken
apps-script/         saves form submissions into a Google Sheet (setup steps inside)
docs/                the built website. GitHub Pages serves this folder. Don't edit by hand,
                     except docs/assets/config.js
```

## Changing the site

1. Edit `src/home.dc.html` or `src/pro.dc.html`. You can also redesign on the canvas and copy the
   board's file over the one in `src/` (keep the `dsSubmit(...)` lines; they send the forms).
2. Rebuild and check:

   ```bash
   pip install playwright && playwright install chromium   # first time only
   python3 tools/build.py
   python3 tools/check.py
   ```

3. Commit `src/` and `docs/` together and push. GitHub Pages updates in a minute or two.

## Forms

Forms post to the Google Apps Script URL in `docs/assets/config.js`. Until that's set, they work on
the page but submissions aren't saved. Setup: `apps-script/README.md`.

## Your own domain (later)

1. Buy the domain, then in the repository go to **Settings › Pages › Custom domain** and enter it.
2. At your domain registrar, add the DNS records GitHub shows you.
3. Rebuild with the new address so links, the sitemap and share images point at it:

   ```bash
   python3 tools/build.py --site-url https://yourdomain.com
   ```

## Still to fill before running ads

Placeholders still in the copy: `[PHONE]`, `[EMAIL]`, `[List your cities]`, `[PRIVACY]`, `[TERMS]`,
how pros are vetted, and two Pro FAQ answers. The Pro terms (one pro per trade per area, 7-day status
reports, automatic bad-lead credits, 12-month attribution, 30 days' notice) need your confirmation,
and the call/text consent text under the homeowner form should get a lawyer's read.
