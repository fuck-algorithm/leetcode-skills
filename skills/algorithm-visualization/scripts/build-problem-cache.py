#!/usr/bin/env python3
"""全量预抓取 leetcode.cn 题目到本地缓存。

支持断点续传、限速、错误重试。
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

import problem_cache
from leetcode_text import clean_html, extract_constraints, normalize_problem

# main() 会根据参数覆盖这两个路径；默认写入用户缓存，避免把大缓存重新塞进 git。
CACHE_DIR = problem_cache.primary_cache_dir()
PROGRESS_FILE = CACHE_DIR / ".progress.json"
INDEX_PATH = problem_cache.BUNDLED_DIR / "index.json"
LIST_API_URL = "https://leetcode.cn/graphql/"
SINGLE_API_URL = "https://leetcode.cn/graphql/"
REQUEST_DELAY = 0.2
RETRY_DELAY = 2.0
MAX_RETRIES = 3
LIST_PAGE_SIZE = 200


def graphql_request(payload: dict, referer: str = "https://leetcode.cn/problemset/") -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        LIST_API_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Referer": referer,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_all_slugs() -> list[dict]:
    """获取全部题目的 slug 和基本元信息。"""
    # 先获取 total
    payload = {
        "query": "query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) { problemsetQuestionList(categorySlug: $categorySlug limit: $limit skip: $skip filters: $filters) { total questions { frontendQuestionId titleSlug titleCn title difficulty } } }",
        "variables": {"categorySlug": "", "skip": 0, "limit": 1, "filters": {}},
        "operationName": "problemsetQuestionList",
    }
    result = graphql_request(payload)
    total = result["data"]["problemsetQuestionList"]["total"]
    print(f"Total problems: {total}")

    slugs = []
    skip = 0
    while skip < total:
        limit = min(LIST_PAGE_SIZE, total - skip)
        payload["variables"]["skip"] = skip
        payload["variables"]["limit"] = limit
        result = graphql_request(payload)
        questions = result["data"]["problemsetQuestionList"]["questions"]
        if not questions:
            break
        slugs.extend(questions)
        print(f"  Fetched list: {skip + 1} ~ {skip + len(questions)} / {total}")
        skip += len(questions)
        time.sleep(REQUEST_DELAY)
    return slugs


def fetch_graphql_single(slug: str) -> dict:
    payload = {
        "query": "query questionData($titleSlug: String!) { question(titleSlug: $titleSlug) { questionFrontendId title translatedContent content difficulty } }",
        "variables": {"titleSlug": slug},
        "operationName": "questionData",
    }
    return graphql_request(payload, referer=f"https://leetcode.cn/problems/{slug}/")


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


def save_problem(slug: str, data: dict):
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = CACHE_DIR / f"{slug}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_progress() -> dict:
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"completed": [], "failed": []}


def save_progress(progress: dict):
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(progress, f, ensure_ascii=False, indent=2)


def build_index(slugs_meta: list[dict]):
    by_slug = {}
    by_number = {}
    for meta in slugs_meta:
        slug = meta["titleSlug"]
        number = meta.get("frontendQuestionId", "")
        entry = {
            "number": number,
            "slug": slug,
            "title_cn": meta.get("titleCn", ""),
            "title_en": meta.get("title", ""),
            "difficulty": meta.get("difficulty", ""),
        }
        by_slug[slug] = entry
        if number:
            by_number[number] = slug
    index = {"bySlug": by_slug, "byNumber": by_number}
    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        # 索引随插件分发，紧凑写出可少占约 250KB 克隆体积。
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Index written: {INDEX_PATH}")


def fetch_and_cache_problem(slug: str, title_cn_fallback: str = "", title_fallback: str = "", number_fallback: str = "", difficulty_fallback: str = "") -> dict:
    for attempt in range(MAX_RETRIES):
        try:
            result = fetch_graphql_single(slug)
            question = result.get("data", {}).get("question")
            if not question:
                raise ValueError("question not found in response")

            raw_desc = question.get("translatedContent") or question.get("content") or ""
            description = clean_html(raw_desc)
            constraints = extract_constraints(description)

            title_cn = title_cn_fallback or question.get("title") or title_fallback

            output = normalize_problem({
                "number": question.get("questionFrontendId") or number_fallback,
                "title_cn": title_cn,
                "title_en": question.get("title") or title_fallback,
                "slug": slug,
                "difficulty": question.get("difficulty") or difficulty_fallback,
                "description": description,
                "constraints": constraints,
            })
            save_problem(slug, output)
            return {"status": "ok", "slug": slug}
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY * (attempt + 1))
            else:
                return {"status": "error", "slug": slug, "error": str(e)}


def main():
    global CACHE_DIR, PROGRESS_FILE, INDEX_PATH

    parser = argparse.ArgumentParser(description="Pre-fetch all LeetCode CN problems")
    parser.add_argument(
        "--out",
        type=Path,
        default=problem_cache.primary_cache_dir(),
        help="题目缓存输出目录（默认用户缓存 ~/.cache/leetcode-skills/problems）",
    )
    parser.add_argument(
        "--index-out",
        type=Path,
        default=problem_cache.BUNDLED_DIR / "index.json",
        help="随插件分发的索引输出路径",
    )
    args = parser.parse_args()
    CACHE_DIR = args.out.expanduser()
    PROGRESS_FILE = CACHE_DIR / ".progress.json"
    INDEX_PATH = args.index_out.expanduser()
    print(f"Cache dir: {CACHE_DIR}")

    print("Step 1: Fetching problem list...")
    slugs_meta = fetch_all_slugs()
    print(f"Collected {len(slugs_meta)} problems.")

    print("Step 2: Building index...")
    build_index(slugs_meta)

    progress = load_progress()
    completed = set(progress.get("completed", []))
    failed = set(progress.get("failed", []))

    total = len(slugs_meta)
    for idx, meta in enumerate(slugs_meta, start=1):
        slug = meta["titleSlug"]
        if slug in completed:
            continue
        print(f"[{idx}/{total}] Fetching {slug} ...", end=" ", flush=True)
        result = fetch_and_cache_problem(
            slug,
            title_cn_fallback=meta.get("titleCn", ""),
            title_fallback=meta.get("title", ""),
            number_fallback=meta.get("frontendQuestionId", ""),
            difficulty_fallback=meta.get("difficulty", ""),
        )
        if result["status"] == "ok":
            completed.add(slug)
            if slug in failed:
                failed.remove(slug)
            print("OK")
        else:
            failed.add(slug)
            print(f"ERROR: {result.get('error')}")
        progress["completed"] = sorted(completed)
        progress["failed"] = sorted(failed)
        save_progress(progress)
        time.sleep(REQUEST_DELAY)

    print(f"\nDone. Cached: {len(completed)} / {total}, Failed: {len(failed)}")
    if failed:
        print(f"Failed slugs: {', '.join(sorted(failed))}")
        sys.exit(1)


if __name__ == "__main__":
    main()
