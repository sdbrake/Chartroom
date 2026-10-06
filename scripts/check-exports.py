"""Verify and extract real Studio/CLI exports for browser QA. All outputs stay in this project."""
from pathlib import Path
import zipfile
root = Path(__file__).resolve().parents[1]
artifacts = root / 'tests/artifacts'
for name in ['browser-student','browser-teaching','image-student','palette-student','palette-teaching']:
    archive = artifacts / (name + '.zip')
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None, 'CRC mismatch: ' + name
        dest = artifacts / ('extracted-' + name)
        for member in z.infolist():
            target = (dest / member.filename).resolve()
            assert target.is_relative_to(dest.resolve()), 'Unsafe ZIP path'
        z.extractall(dest)
        print(name, 'CRC PASS;', len(z.infolist()), 'members;', sum(i.file_size for i in z.infolist()), 'bytes')
        if not name.endswith('-teaching'):
            html = (dest / 'index.html').read_text(encoding='utf-8')
            assert 'PRIVATE BROWSER NOTE' not in html
            assert 'PRIVATE ANSWER' not in html
print('ZIP validation, real extraction and private-aside exclusion: PASS')
