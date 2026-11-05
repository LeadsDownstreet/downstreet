/**
 * Downstreet website → Google Sheets.
 *
 * Every form on the website posts here, and each one lands as a row in its own tab:
 *   Homeowner requests · Pro applications · Area requests · Job reports
 * New columns are added on their own if a form gains a field.
 *
 * Setup: see README.md in this folder.
 */

const TABS = {
  'homeowner-request': 'Homeowner requests',
  'pro-application': 'Pro applications',
  'area-request': 'Area requests',
  'job-report': 'Job reports'
};

// Optional: an email address to tell when a homeowner request comes in. Leave '' for none.
const NOTIFY_EMAIL = '';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const body = JSON.parse(e.postData.contents);
    const tabName = TABS[body.kind] || 'Other';
    const data = body.data || {};
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(tabName) || ss.insertSheet(tabName);

    let header = sheet.getLastColumn() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
    if (!header.length) {
      header = ['Received', 'Page'];
      sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    Object.keys(data).forEach(function (key) {
      if (header.indexOf(key) === -1) {
        header.push(key);
        sheet.getRange(1, header.length).setValue(key).setFontWeight('bold');
      }
    });

    const row = header.map(function (key) {
      if (key === 'Received') { return new Date(); }
      if (key === 'Page') { return body.page || ''; }
      const value = data[key];
      if (value == null) { return ''; }
      if (Array.isArray(value)) { return value.join(', '); }
      // keep phone numbers and ZIP codes as text, so a leading zero survives
      return typeof value === 'string' && /^[0-9+()\- ]+$/.test(value) ? "'" + value : value;
    });
    sheet.appendRow(row);

    if (NOTIFY_EMAIL && body.kind === 'homeowner-request') {
      MailApp.sendEmail(NOTIFY_EMAIL, 'New Downstreet request: ' + (data.service || 'a job') + ' in ' + (data.zip || '?'),
        Object.keys(data).map(function (k) { return k + ': ' + data[k]; }).join('\n'));
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Lets you open the web app URL in a browser to check it is live.
function doGet() {
  return ContentService.createTextOutput('Downstreet form receiver is running.');
}
