# LeetCode 题目数据源获取指南

## 目标

通过题号或 slug 自动获取 LeetCode 中文站的题目信息，减少用户输入负担。

## 获取方式

### 方式 1: WebFetch 直接抓取（推荐）

使用 Claude Code 的 WebFetch 工具从题目页面提取信息：

```
URL 格式: https://leetcode.cn/problems/{slug}/description/
```

**需要提取的字段：**
- 题号：页面标题或面包屑中的数字
- 中文标题：`<h1>` 或标题中的中文部分
- 题目描述：`.content__u3I1` 或 `[data-cy="question-description"]` 中的文本
- 输入约束：描述中 "约束"、"限制" 或 "Constraints" 部分
- 示例输入/输出：代码块或示例区域

### 方式 2: GraphQL API（备用）

LeetCode 中文站 GraphQL 端点：

```bash
curl -s 'https://leetcode.cn/graphql/' \
  -H 'content-type: application/json' \
  -d '{
    "query": "query questionData($titleSlug: String!) { question(titleSlug: $titleSlug) { questionId questionFrontendId title titleCn content translatedContent difficulty } }",
    "variables": { "titleSlug": "two-sum" }
  }'
```

**响应字段映射：**
- `questionFrontendId` → 题号
- `titleCn` → 中文标题
- `translatedContent` → 题目描述（HTML，需清理）
- `content` → 英文描述（fallback）

### 方式 3: 用户输入（最后手段）

当自动获取失败时，礼貌地请用户提供：
- 题号
- 中文标题
- 题目描述（可粘贴）
- 输入约束

## 字段提取优先级

| 字段 | 自动获取来源 | 用户输入 fallback |
|------|-------------|------------------|
| 题号 | URL 或 API | 必需 |
| 中文标题 | 页面 H1 或 API titleCn | 必需 |
| slug | URL 路径或用户输入 | 必需 |
| 题目描述 | API translatedContent | 可选 |
| 输入约束 | 描述中的约束部分 | 可选 |
| 示例 | 描述中的示例部分 | 可选 |

## 使用流程

1. **识别题目标识**：从用户输入中提取题号或 slug
2. **尝试自动获取**：先用 WebFetch，失败再用 API
3. **解析并填充**：提取字段，填入模板变量
4. **确认缺失项**：如有字段缺失，一次性向用户确认
5. **继续后续流程**：信息完整后进入项目骨架初始化

## 注意事项

- 优先使用中文站 (leetcode.cn) 获取翻译内容
- 题目描述中的 HTML 标签需要清理为纯文本或 Markdown
- 约束条件通常在描述底部，格式为 "- 2 <= nums.length <= 10^4"
- 获取失败时明确告知用户原因，并提供手动输入选项
