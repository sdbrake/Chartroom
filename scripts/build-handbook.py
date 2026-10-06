"""Development-only Markdown -> offline HTML handbook. Requires Python Markdown."""
from pathlib import Path
import html
import re
import markdown
root = Path(__file__).resolve().parents[1]
style = "body{max-width:960px;margin:0 auto;padding:36px 26px 90px;background:#f2efe9;color:#1f2933;font:18px/1.65 Arial,sans-serif}h1,h2,h3{font-family:Georgia,serif;font-weight:400;line-height:1.2}h1{font-size:46px}h2{font-size:32px;margin-top:46px}a{color:#245d45}a:focus-visible{outline:3px solid #4a6fa5}pre{background:#182030;color:#f2efe9;padding:22px;overflow:auto;font:15px/1.6 Consolas,monospace}code{font-family:Consolas,monospace}table{border-collapse:collapse;width:100%;font-size:16px}td,th{padding:12px;text-align:left;border-bottom:1px solid #c2c1b8}th{background:#e6e2d9}nav{font-size:15px;border-bottom:2px solid #b07d2b;padding-bottom:18px}li{margin-bottom:9px}@media(max-width:600px){body{font-size:16px;padding:20px}h1{font-size:34px}table{display:block;overflow:auto}}"
for name, source in {'README':root/'README.md','RULES':root/'docs/RULES.md','ANNOTATIONS':root/'docs/ANNOTATIONS.md','DEVELOPING':root/'docs/DEVELOPING.md','VERIFICATION':root/'VERIFICATION.md','GITHUB':root/'GITHUB.md'}.items():
    text = source.read_text(encoding='utf-8')
    body = markdown.markdown(text, extensions=['tables', 'fenced_code'])
    for target in ['README','RULES','ANNOTATIONS','DEVELOPING','VERIFICATION','PALETTES','GITHUB']:
        body = re.sub(r'href="(?:\.\./|docs/)?'+target+r'\.(?:md|html)"', 'href="'+target+'.html"', body)
    title = text.splitlines()[0].lstrip('# ').strip()
    page = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+html.escape(title)+'</title><style>'+style+'</style></head><body><nav><a href="../START HERE.html">Start here</a> · <a href="../index.html">Open Studio</a> · <a href="RULES.html">Rules</a> · <a href="ANNOTATIONS.html">Annotations</a></nav>\n'+body+'\n</body></html>\n'
    (root/'docs'/f'{name}.html').write_text(page,encoding='utf-8')
    print('Built docs/'+name+'.html')
