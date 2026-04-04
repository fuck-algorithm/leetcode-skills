#!/usr/bin/env python3
"""从 LeetCode 中文站抓取题目信息。"""

import argparse
import json
import re
import sys
import urllib.request


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
    """从 HTML 页面标题提取中文标题。"""
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
            # 格式通常为: "1. 两数之和 - 力扣（LeetCode）"
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


def main():
    parser = argparse.ArgumentParser(description="Fetch LeetCode CN problem info")
    parser.add_argument("slug", help="Problem slug, e.g. two-sum")
    args = parser.parse_args()

    try:
        result = fetch_graphql(args.slug)
        question = result.get("data", {}).get("question")
        if not question:
            print(json.dumps({"error": "question not found"}, ensure_ascii=False))
            sys.exit(1)

        raw_desc = question.get("translatedContent") or question.get("content") or ""
        description = clean_html(raw_desc)
        constraints = extract_constraints(description)

        title_cn = fetch_html_title(args.slug) or question.get("title")

        output = {
            "number": question.get("questionFrontendId"),
            "title_cn": title_cn,
            "slug": args.slug,
            "difficulty": question.get("difficulty"),
            "description": description,
            "constraints": constraints,
        }
        print(json.dumps(output, ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
