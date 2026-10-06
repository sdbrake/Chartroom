"""Verify exact public ZIP contents, extract safely, and check local HTML links."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
import importlib.util
import json
import shutil
import zipfile

root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('release_builder',root/'scripts/build-release.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
manifest=json.loads((root/'public-files.json').read_text(encoding='utf-8'))
expected_offline,expected_repository=builder.build_archives(root,manifest)

class Links(HTMLParser):
    def __init__(self,offline):super().__init__();self.links=[];self.offline=offline
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if self.offline and attrs.get('id')=='offline-download' and 'hidden' in attrs:return
        for key in ('href','src'):
            if attrs.get(key):self.links.append(attrs[key])

for relative,name,expected in [('downloads/Chartroom-Studio-Offline.zip','release-offline',expected_offline),('dist/Chartroom-Studio-GitHub.zip','release-repository',expected_repository)]:
    archive=root/relative
    if archive.read_bytes()!=expected:raise SystemExit('Release is stale or modified: '+relative)
    output=root/'tests/tmp'/name
    if output.exists():shutil.rmtree(output)
    output.mkdir(parents=True)
    with zipfile.ZipFile(archive) as z:
        if z.testzip() is not None:raise SystemExit('ZIP CRC failure')
        for n in z.namelist():
            if not (output/n).resolve().is_relative_to(output.resolve()):raise SystemExit('Unsafe ZIP member')
        z.extractall(output)
    checked=0;missing=[]
    for f in output.rglob('*.html'):
        # Synthetic converter fixtures are test inputs, not navigable app pages.
        if f.relative_to(output).parts[0] == 'tests':continue
        parser=Links(name=='release-offline');parser.feed(f.read_text(encoding='utf-8'))
        for link in parser.links:
            url=urlsplit(link)
            if url.scheme or link.startswith('#') or not url.path:continue
            checked+=1
            target=(f.parent/unquote(url.path)).resolve()
            if not target.is_relative_to(output.resolve()) or not target.is_file():missing.append([f.relative_to(output).as_posix(),link])
    if missing:raise SystemExit('Broken package links: '+json.dumps(missing))
    print(json.dumps({'package':relative,'crc':'PASS','sourceBytes':'MATCH','htmlReferences':checked,'links':'PASS'}))
