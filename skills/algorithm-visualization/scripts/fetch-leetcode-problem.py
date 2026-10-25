#!/usr/bin/env python3
"""获取 LeetCode 中文站题目信息（本地缓存优先）。

用法：
  python3 fetch-leetcode-problem.py two-sum        # 按 slug
  python3 fetch-leetcode-problem.py 1              # 按题号
  python3 fetch-leetcode-problem.py --prefetch     # 预下载全量题库缓存（推荐首次执行）

题目缓存按以下顺序查找：
  1. $LEETCODE_SKILL_CACHE_DIR（若设置）
  2. ~/.cache/leetcode-skills/problems（首次使用 --prefetch 下载）
  3. 插件目录 assets/leetcode-problems（开发仓库兜底）

未命中缓存时会联网抓取单题并写入用户缓存；联网失败则尝试下载全量缓存。
下载地址可用 $LEETCODE_SKILL_CACHE_URL 覆盖为镜像。
"""

import argparse
import json
import re
import sys
import urllib.request

import problem_cache as cache
from leetcode_text import clean_html, extract_constraints, normalize_problem


def load_index():
    return cache.load_index()


def get_slug_from_input(inp: str) -> str:
    index = load_index()
    if inp.isdigit():
        return index.get("byNumber", {}).get(inp, inp)
    return inp


def load_from_cache(slug: str):
    path = cache.find_cached_problem(slug)
    if not path:
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return None


def save_to_cache(slug: str, data: dict):
    cache.save_problem(slug, data)


def fetch_graphql(slug: str) -> dict:
    url = "https://leetcode.cn/graphql/"
    payload = {
        "query": "query questionData($titleSlug: String!) { question(titleSlug: $titleSlug) { questionFrontendId title translatedContent content difficulty } }",
        "variables": {"titleSlug": slug},
        "operationName": "questionData",
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Referer": f"https://leetcode.cn/problems/{slug}/",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_html_title(slug: str):
    url = f"https://leetcode.cn/problems/{slug}/description/"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode("utf-8")
        match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE)
        if match:
            title_text = match.group(1)
            title_text = title_text.replace(" - 力扣（LeetCode）", "").strip()
            parts = title_text.split(". ", 1)
            if len(parts) == 2:
                return parts[1].strip()
            return title_text
    except Exception:
        pass
    return None


def fetch_online(slug: str):
    result = fetch_graphql(slug)
    question = result.get("data", {}).get("question")
    if not question:
        raise ValueError("question not found in response")
    raw_desc = question.get("translatedContent") or question.get("content") or ""
    description = clean_html(raw_desc)
    constraints = extract_constraints(description)
    title_cn = fetch_html_title(slug) or question.get("title")
    return normalize_problem({
        "number": question.get("questionFrontendId"),
        "title_cn": title_cn,
        "title_en": question.get("title"),
        "slug": slug,
        "difficulty": question.get("difficulty"),
        "description": description,
        "constraints": constraints,
    })


def prefetch(refresh: bool) -> int:
    try:
        directory = cache.ensure_full_cache(force=refresh)
    except Exception as exc:
        print(json.dumps({"error": str(exc), "cacheDir": str(cache.primary_cache_dir())}, ensure_ascii=False))
        return 1
    manifest = cache.load_manifest()
    print(json.dumps({
        "status": "ok",
        "cacheDir": str(directory),
        "version": manifest.get("version"),
        "fileCount": manifest.get("fileCount"),
        "sha256": manifest.get("sha256"),
    }, ensure_ascii=False, indent=2))
    return 0


def main():
    parser = argparse.ArgumentParser(description="Fetch LeetCode CN problem info (cache-first)")
    parser.add_argument("input", nargs="?", help="Problem slug or number, e.g. 'two-sum' or '1'")
    parser.add_argument("--prefetch", action="store_true", help="Download the full problem cache and exit")
    parser.add_argument("--refresh-cache", action="store_true", help="Re-download the full cache even if present")
    args = parser.parse_args()

    if args.prefetch:
        sys.exit(prefetch(args.refresh_cache))
    if not args.input:
        parser.error("需要题号或 slug（或使用 --prefetch）")

    raw_input = args.input.strip()
    slug = get_slug_from_input(raw_input)

    if raw_input.isdigit() and slug == raw_input:
        print(json.dumps({"error": f"Number {raw_input} not found in index"}, ensure_ascii=False))
        sys.exit(1)

    # Try cache first
    cached = load_from_cache(slug)
    if cached:
        print(json.dumps(normalize_problem(cached), ensure_ascii=False, indent=2))
        sys.exit(0)

    # Fetch online and cache
    try:
        data = fetch_online(slug)
        save_to_cache(slug, data)
        print(json.dumps(data, ensure_ascii=False, indent=2))
        sys.exit(0)
    except Exception as online_error:
        # 单题抓取失败时，退回全量缓存（可能需要下载）
        try:
            cache.ensure_full_cache()
        except Exception:
            print(json.dumps({"error": str(online_error)}, ensure_ascii=False))
            sys.exit(1)
        cached = load_from_cache(slug)
        if cached:
            print(json.dumps(normalize_problem(cached), ensure_ascii=False, indent=2))
            sys.exit(0)
        print(json.dumps({"error": str(online_error)}, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
