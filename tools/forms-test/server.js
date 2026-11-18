// Local stand-in for an Apps Script web app: POST /exec runs Code.gs, answers with a 302 to /echo like Google does.
const http = require('http'), fs = require('fs'), vm = require('vm');
const mockSrc = fs.readFileSync(__dirname + '/mock.js', 'utf8').split('console.log(ctx.setup());')[0];
const harness = new Function('require', '__dirname', mockSrc + '; return {ctx, sheets, mails};')(require, __dirname);
let failNext = 0; const results = {}; let n = 0;
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/fail') { failNext = Number(url.searchParams.get('n') || 1); res.end('ok'); return; }
  if (url.pathname === '/dump') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({sheets: Object.fromEntries(Object.entries(harness.sheets).map(([k, v]) => [k, v.rows])), mails: harness.mails.map(m => m.subject)})); return; }
  if (url.pathname === '/exec' && req.method === 'POST') {
    let body = ''; req.on('data', c => body += c); req.on('end', () => {
      if (failNext > 0) { failNext--; res.statusCode = 500; res.end('boom'); return; }
      const out = harness.ctx.doPost({postData: {contents: body}}).t; const k = String(++n); results[k] = out;
      res.statusCode = 302; res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Location', '/echo?k=' + k); res.end();
    }); return;
  }
  if (url.pathname === '/echo') { res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Content-Type', 'application/json'); res.end(results[url.searchParams.get('k')] || '{}'); return; }
  res.statusCode = 404; res.end();
}).listen(8790, () => console.log('mock apps script on 8790'));
