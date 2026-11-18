import re, json, sys, html
sys.path.insert(0,'/home/claude/downstreet/tools')
from build import TemplateParser
ATTRS={'aria-label','placeholder','alt','title','content','label','value'}
def tmpl_strings(body):
    p=TemplateParser(); p.feed(body); p.close()
    out=[]
    def walk(n, parent=None):
        for k in n[2]:
            if isinstance(k,str):
                if parent in ('style','script'): continue
                t=k.strip()
                if re.search(r'[A-Za-z]{2}',t) and not re.fullmatch(r'\{\{[^}]*\}\}',t): out.append(('text',t))
            else:
                for a,v in k[1].items():
                    if a in ATTRS and re.search(r'[A-Za-z]{2}',v) and '{{' not in v and a!='value': out.append(('attr:'+a,v))
                walk(k,k[0])
    walk(p.root)
    return out
STR=re.compile(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"")
def js_strings(code):
    out=[]
    for m in STR.finditer(code):
        s=m.group(1) if m.group(1) is not None else m.group(2)
        if not re.search(r'[A-Za-z]{2}',s): continue
        if re.match(r'^(M[\d .\-]|#|rgba?\(|var\(|[a-z\-]+:\s|position:|display:|flex|grid|https?:|[a-z][A-Za-z0-9]*$|[a-z\-]+$|\d)',s): continue
        if re.search(r'(px|em|%)\b.*;|;\s*[a-z\-]+:',s): continue
        out.append(('js',s))
    return out
def main(files):
  for f in files:
      src=open(f).read()
      body=re.search(r'<x-dc>(.*)</x-dc>',src,re.S).group(1)
      code=re.search(r'<script type="text/x-dc" data-dc-script[^>]*>(.*?)</script>',src,re.S).group(1)
      items=tmpl_strings(body)+js_strings(code)
      seen=[];
      for k,v in items:
          if v not in [x[1] for x in seen]: seen.append((k,v))
      json.dump([v for k,v in seen],open(f.split('/')[-1]+'.strings.json','w'),ensure_ascii=False,indent=0)
      print(f, len(seen), sum(len(v) for k,v in seen),'chars')

if __name__=='__main__':
    main(sys.argv[1:])
