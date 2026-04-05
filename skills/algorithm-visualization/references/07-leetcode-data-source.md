# LeetCode 题目数据源获取指南

## 快速使用（Claude Code 可执行）

```bash
python3 skills/algorithm-visualization/scripts/fetch-leetcode-problem.py {slug_or_number}
```

**示例：**
```bash
python3 skills/algorithm-visualization/scripts/fetch-leetcode-problem.py two-sum
python3 skills/algorithm-visualization/scripts/fetch-leetcode-problem.py 1
```

**输出格式：**
```json
{
  "number": "1",
  "title_cn": "两数之和",
  "slug": "two-sum",
  "difficulty": "Easy",
  "description": "给定一个整数数组...",
  "constraints": ["2 <= nums.length <= 104", ...]
}
```

**获取顺序**：`本地缓存` → `远程抓取` → `用户输入 fallback`。本地缓存未命中时才会联网。

---

## 目标

通过题号或 slug 自动获取 LeetCode 中文站的题目信息，减少用户输入负担。

## 获取方式

### 方式 1: 执行抓取脚本（推荐，已实现）

脚本位置：`skills/algorithm-visualization/scripts/fetch-leetcode-problem.py`

**工作原理（缓存优先）：**
1. 读取 `assets/leetcode-problems/index.json`：若输入是纯数字题号，则解析为 slug
2. 检查本地缓存 `assets/leetcode-problems/{slug}.json`，命中则直接返回 JSON
3. 缓存未命中时，调用 GraphQL API 获取描述、难度等；如需要再抓取 HTML 标题获取中文标题
4. 从描述文本中提取约束条件，并将结果回写本地缓存

**缓存相关文件：**
- `assets/leetcode-problems/index.json`：由 `build-problem-cache.py` 生成，包含 `bySlug`（slug → 元信息）和 `byNumber`（题号 → slug）两张映射表
- `assets/leetcode-problems/{slug}.json`：单题完整数据结构，作为运行时优先读取的缓存

**注意：**
- leetcode.cn 的 GraphQL 没有 `titleCn` 字段，中文标题通常从 HTML 抓取（全量预抓取时已存入缓存，日常使用无需再抓）
- 需要设置 `User-Agent` 头避免 403
- 约束条件以 "提示:" 或 "Constraints:" 开头

### 方式 2: WebFetch 直接抓取（备用）

如果脚本不可用，使用 Claude Code 的 WebFetch 工具：

```
URL 格式: https://leetcode.cn/problems/{slug}/description/
```

**需要提取的字段：**
- 题号：页面标题中的数字（如 "1. 两数之和" → 1）
- 中文标题：页面标题中的中文部分
- 题目描述：`translatedContent` 字段或页面内容区域
- 输入约束：描述中 "提示:" 部分

### 方式 3: GraphQL API 直接调用（底层）

```bash
curl -s 'https://leetcode.cn/graphql/' \
  -H 'content-type: application/json' \
  -H 'user-agent: Mozilla/5.0' \
  -H 'referer: https://leetcode.cn/problems/two-sum/' \
  -d '{
    "query": "query questionData($titleSlug: String!) { question(titleSlug: $titleSlug) { questionFrontendId title translatedContent content difficulty } }",
    "variables": { "titleSlug": "two-sum" },
    "operationName": "questionData"
  }'
```

**响应字段映射：**
- `questionFrontendId` → 题号
- `title` → 英文标题（中文站返回的也是英文）
- `translatedContent` → 中文题目描述（HTML，需清理）
- `content` → 英文描述（fallback）
- `difficulty` → 难度

**注意：** 不要查询 `titleCn`，leetcode.cn 没有这个字段。

### 方式 4: 用户输入（最后手段）

当自动获取失败时，一次性请用户提供：
- 题号
- 中文标题
- 题目描述
- 输入约束

## 字段提取优先级

| 字段 | 自动获取来源 | 用户输入 fallback |
|------|-------------|------------------|
| 题号 | 本地缓存 `number` 字段 / API `questionFrontendId` | 必需 |
| 中文标题 | 本地缓存 `title_cn` 字段 / HTML 页面 title | 必需 |
| slug | 本地 `index.json`（byNumber 映射）/ 用户输入 | 必需 |
| 题目描述 | 本地缓存 `description` 字段 / API `translatedContent` | 可选 |
| 输入约束 | 本地缓存 `constraints` 字段 / 描述中的 "提示:" | 可选 |
| 示例 | 描述中的示例部分 | 可选 |

## 使用流程

1. **识别题目标识**：从用户输入中提取题号或 slug
2. **执行抓取脚本（本地优先）**：运行 `fetch-leetcode-problem.py`
   - 脚本自动读取 `index.json` 解析 slug
   - 命中本地缓存则直接返回，无需联网
3. **解析并填充**：提取字段，填入模板变量
4. **确认缺失项**：如有字段缺失，一次性向用户确认
5. **继续后续流程**：信息完整后进入项目骨架初始化

## 常见问题与解决

### 403 Forbidden

**原因：** 缺少 User-Agent 或被识别为爬虫

**解决：**
```python
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Referer": f"https://leetcode.cn/problems/{slug}/",
}
```

### 返回英文描述而非中文

**原因：** 使用了 leetcode.com 而非 leetcode.cn，或查询了 `content` 而非 `translatedContent`

**解决：**
- 确保使用 `leetcode.cn/graphql/`
- 优先使用 `translatedContent` 字段

### titleCn 字段不存在

**原因：** leetcode.cn 的 GraphQL schema 与 leetcode.com 不同

**解决：** 从 HTML 页面标题抓取中文标题：
```python
import urllib.request
import re

url = f"https://leetcode.cn/problems/{slug}/description/"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
html = urllib.request.urlopen(req).read().decode("utf-8")
match = re.search(r"<title[^>]*>(.*?)</title>", html)
# 格式: "1. 两数之和 - 力扣（LeetCode）"
```

## 注意事项

- 优先使用中文站 (leetcode.cn) 获取翻译内容
- 题目描述中的 HTML 标签需要清理为纯文本
- 约束条件通常在描述底部，以 "提示:" 开头
- 获取失败时明确告知用户原因，并提供手动输入选项

## 全量预抓取与索引生成

为了提升稳定性和速度，skill 已预抓取全部 ~4280 道题目到 `assets/leetcode-problems/` 并生成 `index.json`。

**索引文件结构** (`index.json`)：
```json
{
  "bySlug": {
    "two-sum": {
      "number": "1",
      "slug": "two-sum",
      "title_cn": "两数之和",
      "title_en": "Two Sum",
      "difficulty": "Easy"
    },
    ...
  },
  "byNumber": {
    "1": "two-sum",
    ...
  }
}
```

**重新生成索引**（如有新题）：
```bash
python3 skills/algorithm-visualization/scripts/build-problem-cache.py
```
