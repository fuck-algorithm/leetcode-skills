"""leetcode_text.py 的回归测试：缓存清洗与约束提取。"""

import unittest

from leetcode_text import clean_html, extract_constraints, normalize_problem


class CleanHtmlTests(unittest.TestCase):
    def test_decodes_entities_and_removes_tags(self):
        text = clean_html("给定 <code>a &lt; b</code>&nbsp;和 10<sup>4</sup>")
        self.assertEqual(text, "给定 a < b 和 10^4")

    def test_collapses_blank_lines(self):
        text = clean_html("第一段&nbsp;\n\n&nbsp;\n\n\n第二段")
        self.assertEqual(text, "第一段\n\n第二段")


class ExtractConstraintsTests(unittest.TestCase):
    def test_markdown_header_and_bullets(self):
        description = (
            "**提示：**\n"
            "- `2 <= n <= 104`\n"
            "- `-109 <= x <= 109`\n\n"
            "**示例 1：**\n"
            "输入：n = 2\n"
        )
        self.assertEqual(
            extract_constraints(description),
            ["2 <= n <= 10^4", "-10^9 <= x <= 10^9"],
        )

    def test_stops_at_next_section(self):
        description = "提示：\n1 <= n <= 100\n\n进阶：你能做到 O(n) 吗？"
        self.assertEqual(extract_constraints(description), ["1 <= n <= 100"])

    def test_inline_header_content(self):
        description = "提示：1 <= n <= 10^4\n解释：略"
        self.assertEqual(extract_constraints(description), ["1 <= n <= 10^4"])


class NormalizeProblemTests(unittest.TestCase):
    def test_backfills_missing_constraints_from_description(self):
        problem = normalize_problem(
            {
                "number": "1",
                "title_cn": "两数之和",
                "description": "示例 1：\n输入：nums = [2,7]\n\n1 <= nums.length <= 104",
                "constraints": [],
            }
        )
        self.assertEqual(problem["constraints"], ["1 <= nums.length <= 10^4"])

    def test_keeps_existing_constraints(self):
        problem = normalize_problem(
            {
                "description": "提示：\n1 <= n <= 10",
                "constraints": ["1 <= n <= 10"],
            }
        )
        self.assertEqual(problem["constraints"], ["1 <= n <= 10"])


if __name__ == "__main__":
    unittest.main()
