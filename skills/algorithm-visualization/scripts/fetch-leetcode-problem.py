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
        "query": "query questionData($titleSlug: String!) { question(titleSlug: $titleSlug) { questionFrontendId title titleCn translatedContent content difficulty } }",
        "variables": {"titleSlug": slug},
        "operationName": "questionData",
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "Referer": f"https://leetcode.cn/problems/{slug}/"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def clean_html(raw: str) -> str:
    # 简单移除常见 HTML 标签
    text = re.sub(r"<[^>]+>", "", raw)
    text = text.replace("&quot;", '"').replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
    return text


def extract_constraints(description: str) -> list[str]:
    lines = description.splitlines()
    constraints = []
    in_constraints = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("约束") or stripped.startswith("限制") or stripped.lower().startswith("constraints"):
            in_constraints = True
            continue
        if in_constraints:
            if stripped.startswith("-") or stripped.startswith("*") or ("<=" in stripped or ">=" in stripped or "10^" in stripped):
                constraints.append(stripped.lstrip("-* "))
            elif stripped == "" or stripped.startswith("示例") or stripped.startswith("输入"):
                # 约束区结束
                in_constraints = False
            else:
                constraints.append(stripped)
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

        output = {
            "number": question.get("questionFrontendId"),
            "title_cn": question.get("titleCn") or question.get("title"),
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
