const fs = require('fs'), vm = require('vm');
const code = fs.readFileSync(__dirname + '/../../apps-script/Code.gs', 'utf8');
function makeSheet(name) {
  const rows = []; let maxRows = 1000;
  const sh = {
    name, rows, validations: [], fmt: [], widths: {},
    getName: () => name, getSheetId: () => 42, getMaxRows: () => maxRows,
    getLastColumn: () => rows.length ? Math.max(...rows.map(r => r.length)) : 0,
    getLastRow: () => rows.length,
    getRange: (r, c, nr = 1, nc = 1) => ({
      setValues: (v) => { for (let i = 0; i < v.length; i++) { rows[r - 1 + i] = rows[r - 1 + i] || []; v[i].forEach((x, j) => rows[r - 1 + i][c - 1 + j] = x); } return chain; },
      setValue: (x) => { rows[r - 1] = rows[r - 1] || []; rows[r - 1][c - 1] = x; return chain; },
      getValues: () => { const out = []; for (let i = 0; i < nr; i++) { const row = rows[r - 1 + i] || []; out.push(Array.from({length: nc}, (_, j) => row[c - 1 + j] ?? '')); } return out; },
      setNumberFormat: (f) => { sh.fmt.push([c, f]); return chain; },
      setDataValidation: (rule) => { sh.validations.push([c, rule]); return chain; }
    }),
    setFrozenRows: () => {}, setColumnWidth: (i, w) => { sh.widths[i] = w; },
    appendRow: (v) => rows.push(v)
  };
  const chain = {setFontWeight: () => chain, setBackground: () => chain, setFontColor: () => chain};
  return sh;
}
const sheets = {Sheet1: makeSheet('Sheet1')};
const ss = {
  getSheetByName: (n) => sheets[n] || null,
  insertSheet: (n) => (sheets[n] = makeSheet(n)),
  getSheets: () => Object.values(sheets), deleteSheet: (s) => delete sheets[s.name],
  getUrl: () => 'https://docs.google.com/spreadsheets/d/TEST/edit'
};
const cacheStore = {}, props = {}, mails = [];
const ctx = {
  console,
  SpreadsheetApp: {getActiveSpreadsheet: () => ss, newDataValidation: () => { const b = {requireValueInList: (l) => (b.list = l, b), setAllowInvalid: () => b, build: () => ({list: b.list})}; return b; }},
  LockService: {getScriptLock: () => ({waitLock: () => {}, releaseLock: () => {}})},
  CacheService: {getScriptCache: () => ({get: (k) => cacheStore[k] || null, put: (k, v) => { cacheStore[k] = v; }})},
  PropertiesService: {getScriptProperties: () => ({getProperty: (k) => props[k] ?? null, setProperty: (k, v) => { props[k] = v; }})},
  MailApp: {sendEmail: (m) => mails.push(m), getRemainingDailyQuota: () => 100},
  Session: {getEffectiveUser: () => ({getEmail: () => 'owner@example.com'})},
  ContentService: {MimeType: {JSON: 'json'}, createTextOutput: (t) => ({t, setMimeType() { return this; }})}
};
vm.createContext(ctx); vm.runInContext(code, ctx);
const post = (body) => JSON.parse(ctx.doPost({postData: {contents: JSON.stringify(body)}}).t);
const meta = (o) => Object.assign({lang: 'en', msOnPage: 9000, ua: 'Test UA'}, o || {});
let ok = true; const expect = (cond, msg) => { if (!cond) { ok = false; console.log('FAIL', msg); } else console.log('ok  ', msg); };

console.log(ctx.setup());
expect(!sheets.Sheet1, 'setup removes empty Sheet1');
expect(sheets['Homeowner requests'].validations.length === 1, 'status dropdown on homeowner tab');

let r = post({kind: 'homeowner-request', id: 'a1', page: 'https://x/downstreet/', data: {name: 'Ann Lee', phone: '817-555-0123', service: 'Fencing', zip: '76116', details: '=HYPERLINK("x")'}, meta: meta({consentText: 'By tapping Get my pro, you agree…'})});
expect(r.ok && r.leadId === 'DS-1001', 'EN homeowner request saved as DS-1001');
const H = sheets['Homeowner requests'];
const hdr = H.rows[0], row = H.rows[1], col = (n) => row[hdr.indexOf(n)];
expect(col('Phone') === "'(817) 555-0123", 'phone formatted and kept as text');
expect(col('ZIP') === "'76116", 'ZIP kept as text');
expect(col('Details') === "'=HYPERLINK(\"x\")", 'formula text neutralised');
expect(col('Status') === 'New' && col('Language') === 'English' && col('Check') === '', 'status, language, no problems');
expect(mails.length === 1 && /DS-1001: Fencing in 76116/.test(mails[0].subject), 'email alert sent: ' + (mails[0] && mails[0].subject));

r = post({kind: 'homeowner-request', id: 'a1', data: {name: 'Ann Lee'}, meta: meta()});
expect(r.ok && r.leadId === 'DS-1001' && H.rows.length === 2, 'retry with same id does not duplicate');

r = post({kind: 'homeowner-request', id: 'b2', data: {name: 'María', phone: '12', service: 'Cercas', zip: '7611'}, meta: meta({lang: 'es'})});
const row2 = H.rows[2];
expect(r.leadId === 'DS-1002' && row2[hdr.indexOf('Service')] === 'Fencing' && row2[hdr.indexOf('Language')] === 'Spanish', 'Spanish service translated to English');
expect(/phone looks wrong/.test(row2[hdr.indexOf('Check')]) && /zip is not 5 digits/.test(row2[hdr.indexOf('Check')]) && /no consent/.test(row2[hdr.indexOf('Check')]), 'problems flagged: ' + row2[hdr.indexOf('Check')]);
expect(/\(Spanish\)/.test(mails[1].subject), 'Spanish noted in email subject');

r = post({kind: 'homeowner-request', id: 'c3', data: {name: 'bot'}, meta: meta({hp: 'http://spam'})});
expect(r.ok && !r.leadId && H.rows.length === 3 && sheets.Spam.rows.length === 2, 'honeypot goes to Spam');
r = post({kind: 'homeowner-request', id: 'c4', data: {name: 'bot'}, meta: meta({msOnPage: 400})});
expect(sheets.Spam.rows.length === 3 && H.rows.length === 3, 'too-fast submit goes to Spam');

r = post({kind: 'pro-application', id: 'p1', data: {business: 'Ríos Cercas', name: 'Juan', phone: '(817) 555-9999', email: 'j@x.com', trade: 'Cercas', shopZip: '76110', driveUpTo: '25 millas', visitWindows: 'Mañanas entre semana, Sábados', smallestJob: 'De $500 en adelante', licensedInsured: 'Sí, las dos', agreedToTerms: 'yes', newField: 'surprise'}, meta: meta({lang: 'es', consentText: 'Leí las reglas…'})});
const P = sheets['Pro applications'], ph = P.rows[0], pr = P.rows[1], pc = (n) => pr[ph.indexOf(n)];
expect(pc('Trade') === 'Fencing' && pc('Drives up to') === '25 miles' && pc('Visit windows') === 'Weekday mornings, Saturdays' && pc('Smallest job') === '$500 and up' && pc('Licensed & insured') === 'Yes, both', 'Spanish application answers translated');
expect(ph.indexOf('newField') !== -1 && pc('newField') === 'surprise', 'unknown field gets its own column');
expect(pc('Terms shown') === 'Leí las reglas…', 'terms text kept');
expect(mails.length === 3 && /New pro application: Ríos Cercas, Fencing \(Spanish\)/.test(mails[2].subject), 'application email: ' + mails[2].subject);

r = post({kind: 'job-report', id: 'j1', data: {lead: 'DS-1001', outcome: 'Ganado', amountCollected: 13800, collectedOn: '2026-11-17', badLeadReason: '', fee: 2380}, meta: meta({lang: 'es'})});
const J = sheets['Job reports'], jh = J.rows[0], jr = J.rows[1];
expect(jr[jh.indexOf('Outcome')] === 'Won' && jr[jh.indexOf('Fee')] === 2380 && jr[jh.indexOf('Amount collected')] === 13800, 'job report: Won, numbers stay numbers');
expect(mails.length === 3, 'no email for job reports');

r = post({kind: 'area-request', id: 'r1', data: {trade: 'Solar', zip: '76008', contact: 'x@y.com'}, meta: meta()});
expect(sheets['Area requests'].rows.length === 2, 'area request saved');

r = JSON.parse(ctx.doPost({postData: {contents: 'not json'}}).t);
expect(r.ok === false && r.error === 'bad-json', 'bad JSON rejected');
expect(JSON.parse(ctx.doGet().t).ok, 'health check');
console.log(ok ? '\nALL PASSED' : '\nSOME FAILED');
