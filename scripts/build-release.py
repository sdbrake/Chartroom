"""Build public GitHub/offline ZIPs from reviewed file lists after runtime tests pass."""
from pathlib import Path, PurePosixPath
import hashlib
import io
import json
import zipfile

OFFLINE_NAME = 'downloads/Chartroom-Studio-Offline.zip'
BLOCKED = {'private', 'converted-lectures', 'backups', 'node_modules', '.git', 'artifacts', '__pycache__', 'tmp', 'dist', 'releases'}


def checked_files(root, names):
    if not isinstance(names, list) or not names or len(names) != len(set(names)):
        raise ValueError('Manifest lists must be nonempty and contain no duplicates.')
    root = Path(root).resolve()
    result = {}
    for name in names:
        if not isinstance(name, str) or not name or '\\' in name or ':' in name:
            raise ValueError('Unsafe manifest path: '+str(name))
        p = PurePosixPath(name)
        if p.is_absolute() or any(part in ('', '.', '..') for part in name.split('/')):
            raise ValueError('Unsafe manifest path: '+name)
        if any(part.lower() in BLOCKED or part.lower().startswith('.env') for part in p.parts):
            raise ValueError('Private/generated path is forbidden: '+name)
        if name.lower().endswith('.chartroom.json') and name != 'examples/demo.chartroom.json':
            raise ValueError('Personal project files are forbidden: '+name)
        if p.parts[0] == 'downloads':
            raise ValueError('Downloads are generated, not source inputs.')
        f = root.joinpath(*p.parts)
        if any(parent.is_symlink() for parent in [f, *f.parents] if parent != root and parent.is_relative_to(root)):
            raise ValueError('Symlink input is forbidden: '+name)
        if not f.resolve().is_relative_to(root) or not f.is_file():
            raise ValueError('Missing or escaping input: '+name)
        result[name] = f.read_bytes()
    return result


def zip_bytes(files):
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w') as archive:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, data, compresslevel=9)
    data = output.getvalue()
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        if archive.testzip() is not None:
            raise ValueError('ZIP CRC verification failed.')
        if any(archive.read(name) != content for name, content in files.items()):
            raise ValueError('ZIP round-trip verification failed.')
    return data


def build_archives(root, manifest):
    repository = checked_files(root, manifest['repository'])
    offline = checked_files(root, manifest['offline'])
    if 'index.html' not in repository or 'index.html' not in offline or not set(offline).issubset(repository):
        raise ValueError('Both packages need index.html; offline files must be a repository subset.')
    offline_zip = zip_bytes(offline)
    repository[OFFLINE_NAME] = offline_zip
    return offline_zip, zip_bytes(repository)


def verify_runtime(root):
    report = json.loads((root/'tests/artifacts/verification.json').read_text(encoding='utf-8'))
    if not report.get('passed') or not report.get('results') or any(r.get('exitCode') != 0 for r in report['results']):
        raise ValueError('Tests did not pass. Run npm test before building a release.')
    expected = {'index.html', 'cli.cjs', *('src/'+p.name for p in (root/'src').iterdir() if p.is_file())}
    if set(report.get('hashes', {})) != expected:
        raise ValueError('Verification does not cover the current runtime.')
    for name, digest in report['hashes'].items():
        if hashlib.sha256((root/name).read_bytes()).hexdigest() != digest:
            raise ValueError('Runtime changed after tests: '+name)


def main():
    root = Path(__file__).resolve().parents[1]
    verify_runtime(root)
    manifest = json.loads((root/'public-files.json').read_text(encoding='utf-8'))
    offline, repository = build_archives(root, manifest)
    for relative, data in [(OFFLINE_NAME, offline), ('dist/Chartroom-Studio-GitHub.zip', repository)]:
        output = root/relative
        output.parent.mkdir(parents=True, exist_ok=True)
        temporary = output.with_suffix('.zip.tmp')
        temporary.write_bytes(data)
        temporary.replace(output)
        digest = hashlib.sha256(data).hexdigest()
        output.with_suffix('.zip.sha256').write_text(digest+'  '+output.name+'\n', encoding='utf-8')
        print(json.dumps({'file':relative, 'bytes':len(data), 'sha256':digest, 'crc':'PASS'}))


if __name__ == '__main__':
    main()
