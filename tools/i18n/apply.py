"""apply.py SRC OUT MAPMODULE  -> writes a translated copy and lists any English left."""
import html, importlib, json, re, sys
sys.path.insert(0, '/home/claude/i18n')
from extract import tmpl_strings, js_strings

src_path, out_path, mod = sys.argv[1:4]
T = importlib.import_module(mod).T
src = open(src_path, encoding='utf-8').read()

m = re.search(r'(<x-dc>)(.*?)(<script type="text/x-dc" data-dc-script[^>]*>)(.*?)(</script>)', src, re.S)
pre, body, sopen, code, post = src[:m.start(2)], m.group(2), m.group(3), m.group(4), src[m.end(4):]
pre = src[:m.start(2)]

keys = sorted(T, key=len, reverse=True)
used = set()

def sub_body(b):
    for en in keys:
        es = T[en]
        for e_en, e_es in {(en, es), (html.escape(en, quote=False), html.escape(es, quote=False))}:
            # whole text node
            pat = re.compile(r'(>[ \t\r\n]*)' + re.escape(e_en) + r'([ \t\r\n]*<)')
            b, n = pat.subn(lambda mm: mm.group(1) + e_es + mm.group(2), b)
            if n: used.add(en)
            # whole attribute value
            for q in '"\'':
                a_en = q + html.escape(en, quote=True) .replace('&#x27;', "'") + q
                a_es = q + html.escape(es, quote=True).replace('&#x27;', "'") + q
                for cand_en, cand_es in {(q + en + q, q + es + q), (a_en, a_es)}:
                    pat2 = re.compile(r'(\s(?:aria-label|placeholder|alt|title|content|label)=)' + re.escape(cand_en))
                    b, n = pat2.subn(lambda mm: mm.group(1) + cand_es, b)
                    if n: used.add(en)
    return b

def jsq(s, q):
    return s.replace('\\', '\\\\').replace(q, '\\' + q)

def sub_code(c):
    for en in keys:
        es = T[en]
        for q in "'\"":
            lit = q + jsq(en, q) + q
            if lit in c:
                c = c.replace(lit, q + jsq(es, q) + q)
                used.add(en)
    return c

body2 = sub_body(body)
code2 = sub_code(code)
out = pre + body2 + sopen + code2 + post
open(out_path, 'w', encoding='utf-8').write(out)

english = set(T)
left = [s for k, s in tmpl_strings(body2) + js_strings(code2) if s in english or (re.search(r'\b(the|and|you|your|we|our|to|of|is)\b', s) and s not in T.values())]
print('unused keys:', [k for k in T if k not in used])
print('still English-looking:')
for s in dict.fromkeys(left):
    print('  ', repr(s[:140]))
