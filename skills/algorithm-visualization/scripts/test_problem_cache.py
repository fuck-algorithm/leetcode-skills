"""problem_cache.py 的回归测试：缓存定位、下载、校验与安全解包。"""

import hashlib
import io
import json
import os
import tarfile
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import problem_cache


def build_archive(path: Path, entries: dict[str, dict]) -> str:
    with tarfile.open(path, "w:gz") as tar:
        for name, payload in entries.items():
            data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            info = tarfile.TarInfo(name)
            info.size = len(data)
            info.mtime = 0
            tar.addfile(info, io.BytesIO(data))
    return hashlib.sha256(path.read_bytes()).hexdigest()


class CacheLocationTests(unittest.TestCase):
    def test_env_override_is_primary(self):
        with tempfile.TemporaryDirectory() as tmp, mock.patch.dict(
            os.environ, {"LEETCODE_SKILL_CACHE_DIR": tmp}
        ):
            self.assertEqual(problem_cache.primary_cache_dir(), Path(tmp))
            self.assertEqual(problem_cache.cache_candidates()[0], Path(tmp))

    def test_find_prefers_user_cache_then_bundled(self):
        with tempfile.TemporaryDirectory() as tmp, mock.patch.dict(
            os.environ, {"LEETCODE_SKILL_CACHE_DIR": tmp}
        ):
            self.assertIsNone(problem_cache.find_cached_problem("__missing__"))
            saved = problem_cache.save_problem("two-sum", {"slug": "two-sum"})
            self.assertEqual(saved, Path(tmp) / "two-sum.json")
            self.assertEqual(problem_cache.find_cached_problem("two-sum"), saved)

    def test_save_is_normalized_json(self):
        with tempfile.TemporaryDirectory() as tmp, mock.patch.dict(
            os.environ, {"LEETCODE_SKILL_CACHE_DIR": tmp}
        ):
            path = problem_cache.save_problem("add-two-numbers", {"title_cn": "两数相加"})
            self.assertEqual(json.loads(path.read_text(encoding="utf-8"))["title_cn"], "两数相加")
            self.assertFalse(path.with_suffix(".json.tmp").exists())


class SafeExtractTests(unittest.TestCase):
    def test_rejects_path_traversal(self):
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp) / "bad.tar.gz"
            build_archive(archive, {"../escape.json": {"slug": "x"}})
            with self.assertRaises(problem_cache.CacheError):
                problem_cache._safe_extract(archive, Path(tmp) / "dest")

    def test_rejects_links(self):
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp) / "link.tar.gz"
            with tarfile.open(archive, "w:gz") as tar:
                info = tarfile.TarInfo("link.json")
                info.type = tarfile.SYMTYPE
                info.linkname = "/etc/passwd"
                tar.addfile(info)
            with self.assertRaises(problem_cache.CacheError):
                problem_cache._safe_extract(archive, Path(tmp) / "dest")


class EnsureFullCacheTests(unittest.TestCase):
    def _manifest(self, archive: Path, sha: str | None = None, count: int = 1) -> dict:
        return {
            "version": "test",
            "url": archive.as_uri(),
            "sha256": sha if sha is not None else hashlib.sha256(archive.read_bytes()).hexdigest(),
            "fileCount": count,
        }

    def test_downloads_extracts_and_marks(self):
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp) / "cache.tar.gz"
            sha = build_archive(
                archive,
                {"two-sum.json": {"slug": "two-sum"}, "index.json": {"bySlug": {}}},
            )
            dest = Path(tmp) / "problems"
            manifest = self._manifest(archive, sha)
            result = problem_cache.ensure_full_cache(manifest=manifest, cache_dir=dest, quiet=True)
            self.assertEqual(result, dest)
            self.assertTrue((dest / "two-sum.json").is_file())
            self.assertFalse((dest / "index.json").exists())
            marker = json.loads((dest / problem_cache.MARKER_FILE).read_text(encoding="utf-8"))
            self.assertEqual(marker["fileCount"], 1)
            self.assertTrue(problem_cache.cache_ready(dest, sha))

    def test_skips_download_when_marker_matches(self):
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp) / "cache.tar.gz"
            sha = build_archive(archive, {"two-sum.json": {"slug": "two-sum"}})
            dest = Path(tmp) / "problems"
            manifest = self._manifest(archive, sha)
            problem_cache.ensure_full_cache(manifest=manifest, cache_dir=dest, quiet=True)
            # 第二次给一个不可达地址：命中标记就不应再下载。
            broken = dict(manifest, url="http://127.0.0.1:1/cache.tar.gz")
            problem_cache.ensure_full_cache(manifest=broken, cache_dir=dest, quiet=True)
            self.assertTrue((dest / "two-sum.json").is_file())

    def test_checksum_mismatch_raises(self):
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp) / "cache.tar.gz"
            build_archive(archive, {"two-sum.json": {"slug": "two-sum"}})
            manifest = self._manifest(archive, "0" * 64)
            with self.assertRaises(problem_cache.CacheError):
                problem_cache.ensure_full_cache(
                    manifest=manifest, cache_dir=Path(tmp) / "problems", quiet=True
                )
            self.assertFalse((Path(tmp) / "problems" / problem_cache.MARKER_FILE).exists())


class IndexTests(unittest.TestCase):
    def test_index_resolves_numbers(self):
        index = problem_cache.load_index()
        self.assertEqual(index.get("byNumber", {}).get("1"), "two-sum")
        self.assertEqual(index.get("bySlug", {}).get("two-sum", {}).get("title_cn"), "两数之和")


if __name__ == "__main__":
    unittest.main()
