#!/usr/bin/env python3
"""pack-problem-cache.py 的回归测试：确定性打包与清单字段。"""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("pack-problem-cache.py")


def run_pack(source: Path, out: Path, manifest: Path) -> subprocess.CompletedProcess:
    return subprocess.run(
        [
            sys.executable,
            str(SCRIPT),
            "--source",
            str(source),
            "--out",
            str(out),
            "--manifest",
            str(manifest),
        ],
        capture_output=True,
        text=True,
        timeout=60,
    )


class PackProblemCacheTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.source = self.root / "problems"
        self.source.mkdir()
        (self.source / "1.json").write_text('{"slug": "two-sum"}\n', encoding="utf-8")
        (self.source / "2.json").write_text('{"slug": "add-two-numbers"}\n', encoding="utf-8")
        (self.source / "index.json").write_text('{"byNumber": {}}\n', encoding="utf-8")
        (self.source / ".progress.json").write_text("{}", encoding="utf-8")

    def tearDown(self):
        self.tmp.cleanup()

    def test_sha_stable_across_output_names(self):
        first = self.root / "a.tar.gz"
        second = self.root / "b.tar.gz"
        for out in (first, second):
            result = run_pack(self.source, out, self.root / f"{out.stem}.json")
            self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(first.read_bytes(), second.read_bytes())

    def test_manifest_fields_and_default_mirrors(self):
        manifest_path = self.root / "manifest.json"
        result = run_pack(self.source, self.root / "cache.tar.gz", manifest_path)
        self.assertEqual(result.returncode, 0, result.stderr)
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        self.assertEqual(manifest["fileCount"], 2)
        self.assertEqual(manifest["version"], "problem-cache-v1")
        self.assertTrue(manifest["url"].startswith("https://github.com/"))
        self.assertEqual(len(manifest["mirrors"]), 2)
        self.assertTrue(all("jsdelivr.net" in item for item in manifest["mirrors"]))
        self.assertEqual(len(manifest["sha256"]), 64)

    def test_empty_source_fails(self):
        empty = self.root / "empty"
        empty.mkdir()
        result = run_pack(empty, self.root / "empty.tar.gz", self.root / "m.json")
        self.assertEqual(result.returncode, 1)
        self.assertIn("缓存目录为空", result.stderr)


if __name__ == "__main__":
    unittest.main()
