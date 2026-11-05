# Saving form submissions to Google Sheets

The website's four forms (homeowner requests, pro applications, area requests, job reports)
send what people type to one Google Apps Script, which writes each one as a row in a Google Sheet.
Until this is set up, the forms still work on the page, but nothing is saved.

## Setup (about 10 minutes, once)

1. Make a new Google Sheet, for example "Downstreet website submissions".
   A fresh sheet is safest; the script adds its own tabs and columns.
2. In the sheet: **Extensions › Apps Script**.
3. Delete what's in the editor, paste in all of `Code.gs` from this folder, and click **Save**.
4. Optional: put your email between the quotes in `NOTIFY_EMAIL` to get an email for every homeowner request.
5. Click **Deploy › New deployment**. Next to "Select type" click the gear and pick **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy**, approve the permissions Google asks for, and copy the **Web app URL**
   (it ends in `/exec`).
7. Open `docs/assets/config.js` in this repository and paste that URL between the quotes:

   ```js
   window.DS_CONFIG = { submitUrl: 'https://script.google.com/macros/s/.../exec' };
   ```

   Commit the change. The site picks it up within a minute or two.

## Test it

Fill in the homeowner form on the live site. A row should appear in the "Homeowner requests" tab.

## If you change the script later

Use **Deploy › Manage deployments › Edit › Version: New version**. That keeps the same URL.
A brand-new deployment gets a new URL, which you would have to paste into `config.js` again.

## Good to know

- Anyone who finds the URL could post junk rows to the sheet. That is normal for a lead form;
  if it becomes a problem, add a spam check before going big on ads.
- The homeowner form collects names and phone numbers. Keep the sheet's sharing tight.
