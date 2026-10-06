"""Public packaging regression tests; only synthetic files are used."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile
ROOT=Path(__file__).resolve().parents[1]

class PublicReleaseTests(unittest.TestCase):
    def test_allowlisted_deterministic_archives_and_private_exclusion(self):
        script=ROOT/'scripts/build-release.py'
        self.assertTrue(script.is_file(), 'public manifest-based release builder exists')
        spec=importlib.util.spec_from_file_location('release_builder',script)
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        (ROOT/'tests/tmp').mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(dir=ROOT/'tests/tmp') as td:
            r=Path(td)
            for name,text in [('index.html','<h1>Public fixture</h1>'),('src/app.js','/* public */'),('private/secret.md','NOT_PUBLIC'),('extra.md','NOT_PUBLIC'),('personal.chartroom.json','NOT_PUBLIC')]:
                f=r/name;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(text)
            manifest={'repository':['index.html','src/app.js'],'offline':['index.html','src/app.js']}
            offline,repo=module.build_archives(r,manifest)
            self.assertEqual((offline,repo),module.build_archives(r,manifest))
            import io
            with zipfile.ZipFile(io.BytesIO(repo)) as z:
                self.assertEqual(set(z.namelist()),{'index.html','src/app.js','downloads/Chartroom-Studio-Offline.zip'})
                self.assertIsNone(z.testzip());self.assertEqual(z.read('downloads/Chartroom-Studio-Offline.zip'),offline)
                self.assertNotIn(b'NOT_PUBLIC',b''.join(z.read(n) for n in z.namelist()))
            for bad in ['personal.chartroom.json','../outside.md','private/secret.md','converted-lectures/secret.md','tests/tmp/secret.md','.env','C:/outside.md','src\\app.js']:
                with self.subTest(bad=bad),self.assertRaises(ValueError):
                    module.build_archives(r,{'repository':['index.html',bad],'offline':['index.html']})
            with self.assertRaises(ValueError):module.build_archives(r,{'repository':['index.html','index.html'],'offline':['index.html']})
            with self.assertRaises(ValueError):module.build_archives(r,{'repository':['index.html'],'offline':['extra.md']})

if __name__=='__main__':unittest.main()
