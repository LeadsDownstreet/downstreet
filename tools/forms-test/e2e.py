import json, urllib.request, time
from playwright.sync_api import sync_playwright
B='http://localhost:8770/downstreet/'
fail=lambda n: urllib.request.urlopen(f'http://localhost:8790/fail?n={n}').read()
dump=lambda: json.loads(urllib.request.urlopen('http://localhost:8790/dump').read())
def text(pg): return pg.evaluate("document.getElementById('app').innerText")
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':900})
    errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
    def homeowner(path, svc, name, phone):
        pg.goto(B+path); pg.wait_for_timeout(2800)
        pg.select_option('select[name=service]', label=svc); pg.fill('input[name=zip]','76116'); pg.fill('input[name=name]',name); pg.fill('input[name=phone]',phone)
        pg.locator('form button[type=submit]').click()
    # 1 English, normal
    homeowner('', 'Fencing', 'Ann Lee', '817-555-0123')
    pg.wait_for_timeout(150); busy=pg.locator('form button[type=submit]').inner_text() if pg.locator('form button[type=submit]').count() else '(gone)'
    pg.wait_for_selector('text=DS-1001', timeout=8000); t=text(pg); i=t.find('DS-1001')
    print('1 EN ok | button while sending:', busy, '|', t[max(0,i-120):i+10].replace('\n',' '))
    # 2 Spanish, server down twice -> error, then retry works
    fail(2); homeowner('es/', 'Cercas', 'María López', '8175550199')
    pg.wait_for_selector('[role=alert]', timeout=10000); print('2 ES error shown:', pg.locator('[role=alert]').inner_text(), '| form still there:', pg.locator('input[name=phone]').input_value())
    pg.locator('form button[type=submit]').click(); pg.wait_for_selector('text=DS-1002', timeout=8000); print('2 ES retry ok')
    # 3 one blip -> silent retry succeeds
    fail(1); homeowner('', 'Roofing', 'Bo Kim', '8175550111'); pg.wait_for_selector('text=DS-1003', timeout=10000); print('3 auto-retry ok')
    # 4 Spanish job report (won)
    pg.goto(B+'es/pro/reportar-trabajo/'); pg.wait_for_timeout(2800)
    pg.locator('#app input').first.fill('DS-1001'); pg.get_by_role('button',name='Ganado',exact=True).click()
    pg.locator('#app input[inputmode], #app input[type=text]').nth(1).fill('13800')
    pg.get_by_role('button', name='Enviar reporte').click(); pg.wait_for_selector('text=Gracias. Registrado.', timeout=8000); print('4 ES report ok')
    # 5 English area request, server down twice
    pg.goto(B+'pro/areas/'); pg.wait_for_timeout(2800)
    fail(2); pg.locator('form input[name=trade]').fill('Solar'); pg.locator('form input[name=zip]').fill('76008'); pg.locator('form input[name=contact]').fill('x@y.com')
    pg.locator('form button[type=submit]').click(); pg.wait_for_selector('[role=alert]', timeout=10000); print('5 area error:', pg.locator('[role=alert]').inner_text())
    pg.locator('form button[type=submit]').click(); pg.wait_for_selector('text=Got it.', timeout=8000); print('5 area retry ok')
    print('page errors:', errs)
    b.close()
d=dump()
for tab,rows in d['sheets'].items():
    print('\n==',tab, len(rows)-1,'rows')
    for r in rows[:4]: print('  ', [str(x)[:40] for x in r])
print('\nemails:', d['mails'])
