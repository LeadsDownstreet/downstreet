/**
 * Downstreet website → Google Sheets.
 *
 * Every form on both sites (English and Spanish) posts here. Each form gets its own tab:
 *   Homeowner requests · Pro applications · Area requests · Job reports · Spam
 *
 * What it does with each submission:
 *   - files it as a row with readable columns (unknown fields are added at the end)
 *   - gives each homeowner request a lead number (DS-1001, DS-1002, …) and a Status dropdown
 *   - keeps the exact call/text consent wording the visitor saw, the page and the language
 *   - turns Spanish answers ("Cercas", "Ganado") into English so the sheet sorts cleanly
 *   - ignores a submission it has already saved (the site retries once if the network blips)
 *   - sends obvious bots to the Spam tab instead
 *   - emails the script owner about each new homeowner request and pro application
 *
 * Setup: see README.md in this folder. Run setup() once from the editor to build the tabs.
 */

// Who gets the email alerts. Leave '' to send them to the Google account that owns this script.
const NOTIFY_EMAIL = '';
// Turn alerts off for a form by removing it here.
const NOTIFY_KINDS = ['homeowner-request', 'pro-application'];

const TABS = {
  'homeowner-request': {
    name: 'Homeowner requests',
    columns: [
      ['leadId', 'Lead ID'], ['received', 'Received'], ['status', 'Status'], ['name', 'Name'], ['phone', 'Phone'],
      ['service', 'Service'], ['zip', 'ZIP'], ['details', 'Details'], ['lang', 'Language'], ['check', 'Check'],
      ['consentText', 'Consent shown'], ['page', 'Page'], ['ua', 'Browser'], ['submissionId', 'Submission ID']
    ],
    statuses: ['New', 'Called back', 'Sent to pro', 'Booked', 'Won', 'Lost', 'Bad lead', 'Duplicate'],
    widths: {Details: 320, 'Consent shown': 260}
  },
  'pro-application': {
    name: 'Pro applications',
    columns: [
      ['received', 'Received'], ['status', 'Status'], ['business', 'Business'], ['name', 'Name'], ['phone', 'Phone'],
      ['email', 'Email'], ['website', 'Website'], ['trade', 'Trade'], ['tradeOther', 'Other trade'], ['shopZip', 'Shop ZIP'],
      ['driveUpTo', 'Drives up to'], ['visitWindows', 'Visit windows'], ['smallestJob', 'Smallest job'],
      ['licensedInsured', 'Licensed & insured'], ['agreedToTerms', 'Agreed to terms'], ['consentText', 'Terms shown'],
      ['lang', 'Language'], ['check', 'Check'], ['page', 'Page'], ['submissionId', 'Submission ID']
    ],
    statuses: ['New', 'Called', 'Approved', 'Waitlist', 'Declined'],
    widths: {'Terms shown': 260}
  },
  'area-request': {
    name: 'Area requests',
    columns: [
      ['received', 'Received'], ['status', 'Status'], ['trade', 'Trade'], ['zip', 'ZIP'], ['contact', 'Contact'],
      ['lang', 'Language'], ['page', 'Page'], ['submissionId', 'Submission ID']
    ],
    statuses: ['New', 'Contacted', 'Added', 'Not now']
  },
  'job-report': {
    name: 'Job reports',
    columns: [
      ['received', 'Received'], ['lead', 'Lead'], ['outcome', 'Outcome'], ['amountCollected', 'Amount collected'],
      ['collectedOn', 'Collected on'], ['fee', 'Fee'], ['badLeadReason', 'Bad lead reason'], ['invoiced', 'Invoiced'],
      ['lang', 'Language'], ['page', 'Page'], ['submissionId', 'Submission ID']
    ],
    statuses: null
  }
};
const SPAM_TAB = {name: 'Spam', columns: [['received', 'Received'], ['kind', 'Form'], ['reason', 'Why'], ['raw', 'What was sent']]};

// Spanish answers → English, so both sites fill the same columns the same way.
const ES_TO_EN = {
  "Luces de Navidad": "Christmas lights",
  "Reparaciones generales": "Handyman",
  "Pintura": "Painting",
  "Tablaroca (drywall)": "Drywall",
  "Canaletas y limpieza de canaletas": "Gutters & gutter cleaning",
  "Lavado a presión": "Pressure washing",
  "Reparación de electrodomésticos": "Appliance repair",
  "Pisos": "Flooring",
  "Recubrimientos epóxicos para pisos": "Epoxy floor coatings",
  "Gabinetes y encimeras": "Cabinets & countertops",
  "Ventanas y puertas": "Windows & doors",
  "Cercas": "Fencing",
  "Terrazas de madera (decks)": "Decks",
  "Aislamiento": "Insulation",
  "Jardinería y paisajismo": "Landscaping",
  "Chimeneas": "Chimney & fireplace",
  "Generadores": "Generators",
  "Tratamiento y suavizadores de agua": "Water treatment & softeners",
  "Casa inteligente y seguridad": "Smart home & security",
  "Remodelación de cocina": "Kitchen remodeling",
  "Remodelación de baño": "Bath remodeling",
  "Sótanos": "Basements",
  "Ampliaciones y remodelaciones": "Home additions & remodels",
  "Techos": "Roofing",
  "Revestimiento exterior (siding)": "Siding",
  "Cimientos e impermeabilización": "Foundation & waterproofing",
  "Concreto y entradas de auto": "Concrete & driveways",
  "Albañilería y estuco": "Masonry & stucco",
  "Paneles solares": "Solar",
  "Sépticos y drenaje": "Septic & sewer",
  "Otro": "Something else",
  "Agendado": "Booked",
  "Cotizado": "Quoted",
  "Ganado": "Won",
  "Perdido": "Lost",
  "No se presentó": "No-show",
  "Cliente malo": "Bad lead",
  "Número equivocado": "Wrong number",
  "Duplicado": "Duplicate",
  "Fuera de zona": "Out of area",
  "Otro oficio": "Wrong trade",
  "Mañanas entre semana": "Weekday mornings",
  "Tardes entre semana": "Weekday afternoons",
  "Noches entre semana": "Weekday evenings",
  "Sábados": "Saturdays",
  "Domingos": "Sundays",
  "Cualquier tamaño": "Any size",
  "De $500 en adelante": "$500 and up",
  "De $1,000 en adelante": "$1,000 and up",
  "De $5,000 en adelante": "$5,000 and up",
  "Sí, las dos": "Yes, both",
  "En trámite": "Working on it",
  "Mi oficio no lo requiere": "Not needed for my trade",
  "10 millas": "10 miles",
  "25 millas": "25 miles",
  "50 millas": "50 miles"
};
const TRANSLATE_FIELDS = ['service', 'trade', 'outcome', 'badLeadReason', 'visitWindows', 'smallestJob', 'licensedInsured', 'driveUpTo'];

const MAX_FIELD = 2000;          // characters kept per field
const MIN_MS_ON_PAGE = 2500;     // faster than this is almost certainly a bot

// ---------------------------------------------------------------- web app

function doPost(e) {
  let body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return reply({ok: false, error: 'bad-json'});
  }
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
  } catch (err) {
    return reply({ok: false, error: 'busy'});
  }
  try {
    const result = handle(body);
    return reply(result);
  } catch (err) {
    console.error(err && err.stack || err);
    return reply({ok: false, error: 'server'});
  } finally {
    lock.releaseLock();
  }
}

// Open the web app URL in a browser to check it is live.
function doGet() {
  return reply({ok: true, service: 'downstreet-forms'});
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------- core

function handle(body) {
  const kind = String(body.kind || '');
  const tab = TABS[kind];
  const data = (body.data && typeof body.data === 'object') ? body.data : {};
  const meta = (body.meta && typeof body.meta === 'object') ? body.meta : {};
  const submissionId = clean(body.id).slice(0, 64);
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Already saved? The site retries once on a network error, so this keeps a single row.
  const cache = CacheService.getScriptCache();
  if (submissionId) {
    const seen = cache.get('sub:' + submissionId);
    if (seen) { return JSON.parse(seen); }
  }

  const spamReason = !tab ? 'unknown form' : meta.hp ? 'filled the hidden field'
    : (Number(meta.msOnPage) > 0 && Number(meta.msOnPage) < MIN_MS_ON_PAGE) ? 'sent ' + meta.msOnPage + ' ms after the page opened'
    : '';
  if (spamReason) {
    appendRow(ss, SPAM_TAB, {received: new Date(), kind: kind, reason: spamReason, raw: JSON.stringify(body).slice(0, 5000)});
    return remember(cache, submissionId, {ok: true});   // look normal to the bot
  }

  // Normalise the answers.
  const row = {};
  Object.keys(data).forEach(function (key) {
    let v = data[key];
    if (Array.isArray(v)) { v = v.join(', '); }
    if (TRANSLATE_FIELDS.indexOf(key) !== -1 && typeof v === 'string') {
      v = ES_TO_EN[v] || v.split(', ').map(function (part) { return ES_TO_EN[part] || part; }).join(', ');
    }
    row[key] = v;
  });
  row.received = new Date();
  row.status = tab.statuses ? tab.statuses[0] : '';
  row.lang = meta.lang === 'es' ? 'Spanish' : 'English';
  row.page = clean(body.page).slice(0, 500);
  row.ua = clean(meta.ua).slice(0, 200);
  row.consentText = clean(meta.consentText);
  row.submissionId = submissionId;

  const problems = [];
  if ('phone' in row) {
    const p = formatPhone(row.phone);
    if (p) { row.phone = p; } else if (row.phone) { problems.push('phone looks wrong'); }
  }
  ['zip', 'shopZip'].forEach(function (k) {
    if (k in row && row[k] && !/^\d{5}$/.test(String(row[k]).trim())) { problems.push(k + ' is not 5 digits'); }
  });
  if (kind === 'homeowner-request' && !row.consentText) { problems.push('no consent text recorded'); }
  if (kind === 'pro-application' && row.agreedToTerms !== 'yes') { problems.push('did not agree to terms'); }
  row.check = problems.join('; ');

  if (kind === 'homeowner-request') { row.leadId = nextLeadId(); }

  const sheet = appendRow(ss, tab, row);

  if (NOTIFY_KINDS.indexOf(kind) !== -1) {
    try { notify(kind, tab, row, ss, sheet); } catch (err) { console.error('email failed', err); }
  }
  const result = {ok: true};
  if (row.leadId) { result.leadId = row.leadId; }
  return remember(cache, submissionId, result);
}

function remember(cache, id, result) {
  if (id) { cache.put('sub:' + id, JSON.stringify(result), 21600); }   // 6 hours
  return result;
}

function nextLeadId() {
  const props = PropertiesService.getScriptProperties();
  const n = Number(props.getProperty('lastLead') || 1000) + 1;
  props.setProperty('lastLead', String(n));
  return 'DS-' + n;
}

function formatPhone(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.length === 11 && d.charAt(0) === '1') { d = d.slice(1); }
  if (d.length !== 10) { return ''; }
  return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
}

function clean(v) {
  return v == null ? '' : String(v).replace(/\s+/g, ' ').trim();
}

// Text that a spreadsheet could read as a formula, a date or a number gets a leading apostrophe.
function cell(v) {
  if (v == null) { return ''; }
  if (v instanceof Date || typeof v === 'number' || typeof v === 'boolean') { return v; }
  let s = String(v);
  if (s.length > MAX_FIELD) { s = s.slice(0, MAX_FIELD) + '…'; }
  if (/^[=+\-@\t\r]/.test(s) || /^[0-9()+\- ]+$/.test(s)) { s = "'" + s; }
  return s;
}

// ---------------------------------------------------------------- sheet helpers

function ensureSheet(ss, tab) {
  let sheet = ss.getSheetByName(tab.name);
  if (!sheet) {
    sheet = ss.insertSheet(tab.name);
    const headers = tab.columns.map(function (c) { return c[1]; });
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#1E2226').setFontColor('#F5F3EE');
    sheet.setFrozenRows(1);
    headers.forEach(function (h, i) {
      sheet.setColumnWidth(i + 1, (tab.widths && tab.widths[h]) || (h === 'Page' || h === 'Browser' ? 180 : 130));
    });
    const recCol = headers.indexOf('Received') + 1;
    if (recCol) { sheet.getRange(2, recCol, sheet.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd h:mm am/pm'); }
    if (tab.statuses) {
      const col = headers.indexOf('Status') + 1;
      const rule = SpreadsheetApp.newDataValidation().requireValueInList(tab.statuses, true).setAllowInvalid(true).build();
      sheet.getRange(2, col, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
    }
  }
  return sheet;
}

function appendRow(ss, tab, row) {
  const sheet = ensureSheet(ss, tab);
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const header = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const keyFor = {};
  tab.columns.forEach(function (c) { keyFor[c[1]] = c[0]; });

  // Any field the site sends that has no column yet gets one at the end.
  const known = tab.columns.map(function (c) { return c[0]; });
  Object.keys(row).forEach(function (k) {
    if (known.indexOf(k) === -1 && header.indexOf(k) === -1 && k !== 'ua' && k !== 'consentText' && k !== 'check' && k !== 'status' && k !== 'leadId' && k !== 'lang' && k !== 'page' && k !== 'submissionId' && k !== 'received') {
      header.push(k);
      sheet.getRange(1, header.length).setValue(k).setFontWeight('bold').setBackground('#1E2226').setFontColor('#F5F3EE');
    }
  });

  const values = header.map(function (h) {
    const key = keyFor[h] || h;
    return cell(row[key]);
  });
  sheet.appendRow(values);
  return sheet;
}

// ---------------------------------------------------------------- email

function notify(kind, tab, row, ss, sheet) {
  const to = NOTIFY_EMAIL || Session.getEffectiveUser().getEmail();
  if (!to) { return; }
  const lines = tab.columns
    .filter(function (c) { return ['received', 'status', 'page', 'ua', 'consentText', 'submissionId'].indexOf(c[0]) === -1; })
    .map(function (c) { return row[c[0]] ? c[1] + ': ' + row[c[0]] : ''; })
    .filter(Boolean);
  const link = ss.getUrl() + '#gid=' + sheet.getSheetId();
  const subject = kind === 'homeowner-request'
    ? 'New request ' + row.leadId + ': ' + (row.service || 'a job') + ' in ' + (row.zip || '?') + (row.lang === 'Spanish' ? ' (Spanish)' : '')
    : 'New pro application: ' + (row.business || row.name || '?') + ', ' + (row.trade || '?') + (row.lang === 'Spanish' ? ' (Spanish)' : '');
  MailApp.sendEmail({
    to: to,
    subject: subject,
    name: 'Downstreet website',
    body: lines.join('\n') + (row.check ? '\n\nCheck: ' + row.check : '') + '\n\nOpen the sheet: ' + link
  });
}

// ---------------------------------------------------------------- one-time setup

// Run once from the editor (select setup, click Run). Builds every tab so the sheet looks right before
// the first real submission, and asks Google for the permissions the web app needs.
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABS).forEach(function (k) { ensureSheet(ss, TABS[k]); });
  ensureSheet(ss, SPAM_TAB);
  const blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) { ss.deleteSheet(blank); }
  MailApp.getRemainingDailyQuota();   // makes Google ask for the email permission now
  return 'Tabs ready: ' + ss.getSheets().map(function (s) { return s.getName(); }).join(', ');
}
