#!/usr/bin/env python3
"""从 LeetCode 中文站抓取题目信息（支持本地缓存优先）。

用法：
  python3 fetch-leetcode-problem.py two-sum   # 按 slug
  python3 fetch-leetcode-problem.py 1          # 按题号
"""

import argparse
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

CACHE_DIR = Path(__file__).resolve().parent.parent / "assets" / "leetcode-problems"
INDEX_FILE = CACHE_DIR / "index.json"


def load_index():
    if INDEX_FILE.exists():
        with open(INDEX_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"bySlug": {}, "byNumber": {}}


def get_slug_from_input(inp: str) -> str:
    index = load_index()
    if inp.isdigit():
        return index.get("byNumber", {}).get(inp, inp)
    return inp


def load_from_cache(slug: str):
    path = CACHE_DIR / f"{slug}.json"
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def save_to_cache(slug: str, data: dict):
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = CACHE_DIR / f"{slug}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


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


def clean_html(raw: str) -> str:
    if not raw:
        return ""
    text = re.sub(r"<[^>]+>", "", raw)
    text = text.replace("&quot;", '"').replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
    text = re.sub(r"\n\s*\n", "\n\n", text)
    return text.strip()


def extract_constraints(description: str) -> list[str]:
    lines = description.splitlines()
    constraints = []
    in_constraints = False
    for line in lines:
        stripped = line.strip()
        lower = stripped.lower()
        if stripped.startswith("约束") or stripped.startswith("限制") or lower.startswith("constraints") or lower.startswith("提示"):
            in_constraints = True
            continue
        if in_constraints:
            if stripped.startswith("示例") or stripped.startswith("输入") or stripped.startswith("Output") or stripped.startswith("Follow") or stripped.startswith("进阶"):
                in_constraints = False
            elif stripped != "" and stripped != "&nbsp;":
                constraints.append(stripped.lstrip("* \t"))
    return constraints


def fetch_online(slug: str):
    result = fetch_graphql(slug)
    question = result.get("data", {}).get("question")
    if not question:
        raise ValueError("question not found in response")
    raw_desc = question.get("translatedContent") or question.get("content") or ""
    description = clean_html(raw_desc)
    constraints = extract_constraints(description)
    title_cn = fetch_html_title(slug) or question.get("title")
    return {
        "number": question.get("questionFrontendId"),
        "title_cn": title_cn,
        "title_en": question.get("title"),
        "slug": slug,
        "difficulty": question.get("difficulty"),
        "description": description,
        "constraints": constraints,
    }


def main():
    parser = argparse.ArgumentParser(description="Fetch LeetCode CN problem info (cache-first)")
    parser.add_argument("input", help="Problem slug or number, e.g. 'two-sum' or '1'")
    args = parser.parse_args()

    raw_input = args.input.strip()
    slug = get_slug_from_input(raw_input)

    if raw_input.isdigit() and slug == raw_input:
        print(json.dumps({"error": f"Number {raw_input} not found in index"}, ensure_ascii=False))
        sys.exit(1)

    # Try cache first
    cached = load_from_cache(slug)
    if cached:
        print(json.dumps(cached, ensure_ascii=False, indent=2))
        sys.exit(0)

    # Fetch online and cache
    try:
        data = fetch_online(slug)
        save_to_cache(slug, data)
        print(json.dumps(data, ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
