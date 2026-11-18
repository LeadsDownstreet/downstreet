# Form receiver (Google Apps Script)

Every form on both sites, in English and Spanish, posts to this script. It files each one into
the **Downstreet website forms** Google Sheet (owned by leadsbydelta@gmail.com):

| Tab | From | Notes |
|---|---|---|
| Homeowner requests | "Get my pro" form | Lead ID (DS-1001…), Status dropdown, exact consent wording shown |
| Pro applications | 4-step "Get leads" application | Status dropdown, terms wording shown |
| Area requests | "Request a trade or area" | |
| Job reports | "Report a job" | Fee is already calculated |
| Spam | Anything that filled the hidden field or was sent within 2.5 s of opening the page | |

Spanish answers are stored in English (the Language column says which site it came from).
New homeowner requests and pro applications email the script owner.

## Deploy (once)

1. Open the sheet → **Extensions → Apps Script**. Paste `Code.gs` over everything and save.
2. **Deploy → New deployment** → gear icon → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
3. **Deploy**, then **Authorize access** and allow it (Google shows an "unverified app" warning for
   your own scripts: **Advanced → Go to Downstreet form receiver**).
4. Copy the **Web app URL** (ends in `/exec`) into `docs/assets/config.js`, commit and push.

## Changing the script later

**Deploy → Manage deployments → pencil → Version: New version → Deploy.** That keeps the same URL.
A brand-new deployment gets a new URL, which you would have to paste into `config.js` again.

## Testing without Google

`tools/forms-test/` has a stand-in for Apps Script (`mock.js` runs 23 checks on `Code.gs`;
`server.js` serves it locally so the real site forms can be tested in a browser).
