"""LeetCode 描述文本的清洗与约束提取工具（被抓取脚本共享）。

旧缓存中的文本可能残留 HTML 实体（`&nbsp;`）、Markdown 强调标记
（`**提示：**`）以及被剥离的 `<sup>` 上标（`10^4` 变成 `104`）。
读取缓存时统一在这里归一化，避免重新全量抓取。
"""

import html
import re

_SUP_RE = re.compile(r"<sup>(.*?)</sup>", re.IGNORECASE | re.DOTALL)
_SUB_RE = re.compile(r"<sub>(.*?)</sub>", re.IGNORECASE | re.DOTALL)
_BREAK_RE = re.compile(r"<br\s*/?>", re.IGNORECASE)
_BLOCK_END_RE = re.compile(r"</(?:p|div|li|h[1-6]|pre|blockquote|tr)>", re.IGNORECASE)
_TAG_RE = re.compile(r"<[^>]+>")
_INLINE_MARK_RE = re.compile(r"\*\*|__|~~|`")
_BULLET_RE = re.compile(r"^\s*(?:[-*+]\s+|#{1,6}\s+|>\s*)")
_SPACE_RE = re.compile(r"[ \t 　]+")
_BLANK_LINES_RE = re.compile(r"\n{3,}")

_CONSTRAINT_HEADER_RE = re.compile(
    r"^(?:提示|约束|限制|constraints?)\s*[:：]\s*(?P<inline>.+)$", re.IGNORECASE
)
_CONSTRAINT_HEADER_ONLY_RE = re.compile(
    r"^(?:提示|约束|限制|constraints?)\s*[:：]?\s*$", re.IGNORECASE
)
_CONSTRAINT_LIKE_RE = re.compile(
    r"^\s*(?:[-*]\s*)?(?:-?\d[\d^.,\s*]*|[A-Za-z_][\w.\[\]]*)\s*(?:<=|<|>=|>|==)\s*\S"
)
_CONSTRAINT_STOP_RE = re.compile(
    r"^(?:示例|输入|输出|解释|进阶|说明|注意|example|input|output|explanation|follow\s*-?\s*up|note)\b",
    re.IGNORECASE,
)

# 旧缓存丢了 <sup>：`10<sup>4</sup>` 被清洗成 `104`。只在比较符后修复，
# 避免把真实存在的 104 之类的常量误改成 10^4。
_LOST_EXPONENT_RE = re.compile(r"(^|[<>=]\s)(-?)10([4-9])(?![0-9])", re.MULTILINE)
_LOST_EXPONENT_MUL_RE = re.compile(r"(?<=\*)(10)([4-9])(?![0-9])")


def clean_html(raw: str) -> str:
    """把 LeetCode 的 HTML 描述清洗为稳定、可读的纯文本。"""
    if not raw:
        return ""
    text = _SUP_RE.sub(r"^\1", raw)
    text = _SUB_RE.sub(r"_\1", text)
    text = _BREAK_RE.sub("\n", text)
    text = _BLOCK_END_RE.sub("\n", text)
    text = _TAG_RE.sub("", text)
    text = html.unescape(text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("​", "").replace("﻿", "")
    lines = [_SPACE_RE.sub(" ", line).strip() for line in text.split("\n")]
    text = "\n".join(lines)
    return _BLANK_LINES_RE.sub("\n\n", text).strip()


def _strip_inline_markup(text: str) -> str:
    text = _BULLET_RE.sub("", text)
    text = _INLINE_MARK_RE.sub("", text)
    return text.strip().strip("*_#").strip()


def repair_lost_exponents(text: str) -> str:
    """修复旧缓存中被当作数字的 `10^4` 等上标。"""
    text = _LOST_EXPONENT_RE.sub(lambda m: f"{m.group(1)}{m.group(2)}10^{m.group(3)}", text)
    text = _LOST_EXPONENT_MUL_RE.sub(lambda m: f"{m.group(1)}^{m.group(2)}", text)
    return text


def extract_constraints(description: str) -> list[str]:
    """从描述中提取约束条目，兼容 `提示：`、`**提示：**`、`- xxx` 等写法。"""
    constraints: list[str] = []
    in_constraints = False

    for raw_line in description.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        normalized = _strip_inline_markup(line)

        header = _CONSTRAINT_HEADER_RE.match(normalized)
        if header:
            inline = _strip_inline_markup(header.group("inline"))
            if inline:
                constraints.append(inline)
            in_constraints = True
            continue
        if _CONSTRAINT_HEADER_ONLY_RE.match(normalized):
            in_constraints = True
            continue

        if _CONSTRAINT_STOP_RE.match(normalized):
            in_constraints = False
            continue

        if in_constraints:
            item = _strip_inline_markup(line)
            if item:
                constraints.append(item)

    return [repair_lost_exponents(item) for item in constraints]


def extract_constraint_like_lines(description: str) -> list[str]:
    """兜底：部分题目把约束直接写在描述末尾，没有“提示/Constraints”标题。"""
    lines = [line.strip() for line in description.splitlines() if line.strip()]
    matches = [
        _strip_inline_markup(line)
        for line in lines
        if _CONSTRAINT_LIKE_RE.match(line) and not _CONSTRAINT_STOP_RE.match(_strip_inline_markup(line))
    ]
    matches = [item for item in matches if item]
    if len(matches) >= 2:
        return [repair_lost_exponents(item) for item in matches]
    tail = [_strip_inline_markup(line) for line in lines[-8:]]
    if len(matches) == 1 and matches[0] in tail:
        return [repair_lost_exponents(matches[0])]
    return []


def normalize_problem(problem: dict) -> dict:
    """归一化单题数据；对旧缓存安全（可重复调用）。"""
    result = dict(problem or {})
    description = clean_html(result.get("description") or "")
    result["description"] = description

    constraints: list[str] = []
    raw_constraints = result.get("constraints") or []
    if isinstance(raw_constraints, list):
        for item in raw_constraints:
            if not isinstance(item, str):
                continue
            cleaned = _strip_inline_markup(clean_html(item))
            if cleaned:
                constraints.append(repair_lost_exponents(cleaned))
    if not constraints:
        constraints = extract_constraints(description) or extract_constraint_like_lines(description)
    result["constraints"] = constraints

    for key in ("number", "title_cn", "title_en", "slug", "difficulty"):
        value = result.get(key)
        if isinstance(value, str):
            result[key] = html.unescape(value).replace(" ", " ").strip()

    return result
