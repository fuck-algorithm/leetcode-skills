#!/usr/bin/env python3
"""把全量题库缓存打包成可上传的 Release 资产，并写入校验清单。

用法：
  python3 pack-problem-cache.py --out dist/leetcode-problems-v1.tar.gz
  gh release create problem-cache-v1 dist/leetcode-problems-v1.tar.gz

打包结果确定（文件排序、mtime/uid/gid 归零），同样输入得到同样 sha256。
"""

import argparse
import gzip
import hashlib
import json
import sys
import tarfile
from datetime import datetime, timezone
from pathlib import Path

import problem_cache

REPO = "fuck-algorithm/leetcode-skills"
DEFAULT_TAG = "problem-cache-v1"


def problem_files(source: Path) -> list[Path]:
    return sorted(
        (
            item
            for item in source.glob("*.json")
            if item.name != "index.json" and not item.name.startswith(".")
        ),
        key=lambda item: item.name,
    )


def pack(files: list[Path], out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "wb") as raw:
        # filename="" 防止 gzip 头写入输出文件名，否则换个 --out 名字 sha256 就变
        with gzip.GzipFile(filename="", fileobj=raw, mode="wb", compresslevel=9, mtime=0) as gz:
            with tarfile.open(fileobj=gz, mode="w", format=tarfile.GNU_FORMAT) as tar:
                for path in files:
                    info = tarfile.TarInfo(path.name)
                    info.size = path.stat().st_size
                    info.mtime = 0
                    info.mode = 0o644
                    info.uid = info.gid = 0
                    info.uname = info.gname = ""
                    with open(path, "rb") as f:
                        tar.addfile(info, f)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description="Pack the problem cache into a release asset")
    parser.add_argument("--source", type=Path, default=problem_cache.primary_cache_dir())
    parser.add_argument("--out", type=Path, required=True, help="输出 .tar.gz 路径")
    parser.add_argument("--tag", default=DEFAULT_TAG, help="GitHub Release 标签")
    parser.add_argument("--repo", default=REPO)
    parser.add_argument(
        "--manifest",
        type=Path,
        default=problem_cache.MANIFEST_FILE,
        help="校验清单输出路径（默认仓库内 assets/leetcode-problems/cache-manifest.json）",
    )
    parser.add_argument("--base-url", help="覆盖下载地址（默认 GitHub Release）")
    parser.add_argument(
        "--mirror",
        action="append",
        default=[],
        help="备用下载地址（可重复）；客户端会在主地址失败时依次尝试",
    )
    args = parser.parse_args()

    source = args.source.expanduser()
    files = problem_files(source)
    if not files:
        print(f"缓存目录为空：{source}", file=sys.stderr)
        return 1

    pack(files, args.out)
    url = args.base_url or (
        f"https://github.com/{args.repo}/releases/download/{args.tag}/{args.out.name}"
    )
    mirrors = args.mirror or [
        f"https://cdn.jsdelivr.net/gh/{args.repo}@{args.tag}/{args.out.name}",
        f"https://gcore.jsdelivr.net/gh/{args.repo}@{args.tag}/{args.out.name}",
    ]
    manifest = {
        "version": args.tag,
        "url": url,
        "mirrors": list(dict.fromkeys(mirrors)),
        "sha256": sha256(args.out),
        "bytes": args.out.stat().st_size,
        "fileCount": len(files),
        "builtAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    with open(args.manifest, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(
        f"打包完成：{args.out}（{len(files)} 道题，{manifest['bytes']} 字节）\n"
        f"sha256：{manifest['sha256']}\n"
        f"清单：{args.manifest}\n"
        f"上传：gh release create {args.tag} {args.out}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
