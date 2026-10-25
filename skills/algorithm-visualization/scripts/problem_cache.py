"""题库缓存的定位、下载与解包。

全量题库（约 4300 道题）不再随插件仓库分发：plugin marketplace 安装时需要
浅克隆整个仓库，缓存进 git 会让任何慢网络机器克隆超时。题目数据改放在
GitHub Release 资产中，运行时按需下载到用户缓存目录：

  ~/.cache/leetcode-skills/problems/        # 默认位置
  $LEETCODE_SKILL_CACHE_DIR                 # 覆盖位置（可选）
  $LEETCODE_SKILL_CACHE_URL                 # 覆盖下载地址（镜像/内网）

开发仓库里若仍存在 assets/leetcode-problems/*.json，会作为只读兜底缓存。
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import sys
import tarfile
import tempfile
import urllib.request
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
BUNDLED_DIR = SKILL_DIR / "assets" / "leetcode-problems"
MANIFEST_FILE = BUNDLED_DIR / "cache-manifest.json"
MARKER_FILE = ".cache-ready"
USER_AGENT = "leetcode-skills/1.1 (+https://github.com/fuck-algorithm/leetcode-skills)"


class CacheError(RuntimeError):
    """缓存不可用或已损坏。"""


def primary_cache_dir() -> Path:
    """可写的用户缓存目录。"""
    override = os.environ.get("LEETCODE_SKILL_CACHE_DIR")
    if override:
        return Path(override).expanduser()
    return Path.home() / ".cache" / "leetcode-skills" / "problems"


def cache_candidates() -> list[Path]:
    """按优先级返回可能的缓存目录（去重后）。"""
    dirs: list[Path] = []
    for directory in (primary_cache_dir(), BUNDLED_DIR):
        resolved = directory.expanduser()
        if resolved not in dirs:
            dirs.append(resolved)
    return dirs


def find_cached_problem(slug: str) -> Path | None:
    """在用户缓存与开发仓库缓存中查找单题文件。"""
    for directory in cache_candidates():
        path = directory / f"{slug}.json"
        if path.is_file():
            return path
    return None


def save_problem(slug: str, data: dict) -> Path:
    """把单题结果写入用户缓存，返回文件路径。"""
    directory = primary_cache_dir()
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{slug}.json"
    tmp = path.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)
    return path


def load_manifest() -> dict:
    if not MANIFEST_FILE.is_file():
        raise CacheError(f"缺少缓存清单：{MANIFEST_FILE}")
    try:
        with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError) as exc:
        raise CacheError(f"缓存清单不可读：{exc}") from exc


def load_index() -> dict:
    """读取随仓库分发的精简索引（bySlug / byNumber）。"""
    index_file = BUNDLED_DIR / "index.json"
    if index_file.is_file():
        with open(index_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"bySlug": {}, "byNumber": {}}


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _read_marker(directory: Path) -> dict:
    marker = directory / MARKER_FILE
    if not marker.is_file():
        return {}
    try:
        with open(marker, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return {}


def cache_ready(directory: Path | None = None, sha256: str | None = None) -> bool:
    """缓存是否已完整解包；给了 sha256 时要求版本一致。"""
    directory = directory or primary_cache_dir()
    marker = _read_marker(directory)
    if not marker:
        return False
    if sha256 and marker.get("sha256") != sha256:
        return False
    return True


def _safe_extract(archive: Path, dest: Path) -> None:
    """只允许普通文件，且路径必须落在 dest 内，防止路径穿越。"""
    dest = dest.resolve()
    with tarfile.open(archive, "r:gz") as tar:
        for member in tar.getmembers():
            if member.isdir():
                continue
            if not member.isfile():
                raise CacheError(f"缓存包包含不支持的条目：{member.name}")
            target = (dest / member.name).resolve()
            try:
                target.relative_to(dest)
            except ValueError as exc:
                raise CacheError(f"缓存包包含越界路径：{member.name}") from exc
        kwargs = {"filter": "data"} if hasattr(tarfile, "data_filter") else {}
        tar.extractall(dest, **kwargs)


def _download(url: str, dest: Path, timeout: float) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout) as resp, open(dest, "wb") as f:
        shutil.copyfileobj(resp, f, length=1 << 20)


def ensure_full_cache(
    force: bool = False,
    manifest: dict | None = None,
    cache_dir: Path | None = None,
    timeout: float = 120,
    quiet: bool = False,
) -> Path:
    """确保全量缓存已解包到用户缓存目录，返回该目录。

    force=True 时忽略本地标记重新下载；下载地址可用
    LEETCODE_SKILL_CACHE_URL 覆盖为镜像。
    """
    manifest = manifest or load_manifest()
    directory = Path(cache_dir).expanduser() if cache_dir else primary_cache_dir()
    expected_sha = manifest.get("sha256")
    if not force and cache_ready(directory, expected_sha):
        return directory

    url = os.environ.get("LEETCODE_SKILL_CACHE_URL") or manifest.get("url")
    if not url:
        raise CacheError("缓存清单缺少下载地址")

    directory.mkdir(parents=True, exist_ok=True)
    if not quiet:
        print(f"正在下载题库缓存：{url}", file=sys.stderr)

    handle, temp_name = tempfile.mkstemp(suffix=".tar.gz")
    os.close(handle)
    archive = Path(temp_name)
    staging = Path(tempfile.mkdtemp(prefix=".staging-", dir=directory))
    try:
        _download(url, archive, timeout)
        actual_sha = _sha256(archive)
        if expected_sha and actual_sha != expected_sha:
            raise CacheError(
                f"缓存校验失败（期望 {expected_sha[:12]}…，实际 {actual_sha[:12]}…）"
            )

        _safe_extract(archive, staging)
        files = [item for item in staging.glob("*.json") if item.name != "index.json"]
        expected_count = manifest.get("fileCount")
        if expected_count and len(files) < expected_count:
            raise CacheError(f"缓存包不完整：{len(files)}/{expected_count} 个题目文件")
        if not files and not quiet:
            print("警告：缓存包中没有题目文件", file=sys.stderr)

        for item in files:
            shutil.move(str(item), str(directory / item.name))
        marker = {
            "version": manifest.get("version"),
            "sha256": actual_sha,
            "fileCount": len(files),
        }
        with open(directory / MARKER_FILE, "w", encoding="utf-8") as f:
            json.dump(marker, f, ensure_ascii=False, indent=2)
        if not quiet:
            print(f"题库缓存就绪：{len(files)} 道题 → {directory}", file=sys.stderr)
        return directory
    finally:
        archive.unlink(missing_ok=True)
        shutil.rmtree(staging, ignore_errors=True)
