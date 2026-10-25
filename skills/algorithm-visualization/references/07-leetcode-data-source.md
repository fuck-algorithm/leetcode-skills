# LeetCode 题目数据源获取指南

## 快速使用（Claude Code 可执行）

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/fetch-leetcode-problem.py {slug_or_number}
```

**示例：**
```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/fetch-leetcode-problem.py two-sum
python3 ${CLAUDE_SKILL_DIR}/scripts/fetch-leetcode-problem.py 1
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

**获取顺序**：`用户/插件缓存` → `远程抓取` → `用户输入 fallback`。缓存未命中时才会联网。

> 路径说明：`${CLAUDE_SKILL_DIR}` 由 Claude Code 在插件/Skill 环境下替换为当前 skill 目录。不要改写成仓库根相对路径 `skills/algorithm-visualization/...`，否则插件安装后必然找不到文件。

> 数据质量：缓存读取时会统一做 HTML 实体解码（`&nbsp;` 等）并补全缺失的 `constraints`；旧缓存无需重新全量抓取。

---

## 目标

通过题号或 slug 自动获取 LeetCode 中文站的题目信息，减少用户输入负担。

## 获取方式

### 方式 1: 执行抓取脚本（推荐，已实现）

脚本位置：`${CLAUDE_SKILL_DIR}/scripts/fetch-leetcode-problem.py`

**工作原理（缓存优先）：**
1. 读取插件内的 `assets/leetcode-problems/index.json`：若输入是纯数字题号，则解析为 slug
2. 按顺序查找单题缓存：`$LEETCODE_SKILL_CACHE_DIR` → `~/.cache/leetcode-skills/problems` → 插件内开发缓存；命中则直接返回 JSON
3. 缓存未命中时，调用 GraphQL API 获取描述、难度等；如需要再抓取 HTML 标题获取中文标题
4. 从描述文本中提取约束条件，并将结果回写用户缓存
5. 单题联网抓取失败时，自动下载全量缓存包后重试

**缓存相关文件：**
- `assets/leetcode-problems/index.json`：随插件分发（约 170KB），只含 `byNumber`（题号 → slug）映射；题目标题、难度、描述都在题目文件里
- `assets/leetcode-problems/cache-manifest.json`：全量缓存包的 Release 地址、sha256、文件数与版本
- `~/.cache/leetcode-skills/problems/{slug}.json`：运行时缓存；可用 `--prefetch` 一次性下载全量题库（约 1.7MB）

**首次使用建议：**

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/fetch-leetcode-problem.py --prefetch
```

**网络受限时**：`cache-manifest.json` 里的 `mirrors` 提供 jsDelivr 镜像，GitHub 主地址失败会自动切换；也可用 `LEETCODE_SKILL_CACHE_URL` 强制指定源、`LEETCODE_SKILL_CACHE_DIR` 指定缓存目录（适合共享/只读环境）、`LEETCODE_SKILL_CACHE_TIMEOUT` 放宽超时（默认 300s）。

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
| 题号 | 缓存 `number` 字段 / API `questionFrontendId` | 必需 |
| 中文标题 | 缓存 `title_cn` 字段 / HTML 页面 title | 必需 |
| slug | 本地 `index.json`（byNumber 映射）/ 用户输入 | 必需 |
| 题目描述 | 缓存 `description` 字段 / API `translatedContent` | 可选 |
| 输入约束 | 缓存 `constraints` 字段 / 描述中的 "提示:" | 可选 |
| 示例 | 描述中的示例部分 | 可选 |

## 使用流程

1. **识别题目标识**：从用户输入中提取题号或 slug
2. **执行抓取脚本（本地优先）**：运行 `fetch-leetcode-problem.py`
   - 脚本自动读取 `index.json` 解析 slug
   - 命中缓存则直接返回，无需联网
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

全量题库（~4280 道）**不放进 git 仓库**：plugin marketplace 安装需要浅克隆整个仓库，几万行题目 JSON 会让慢网络机器克隆超时。题库改为发布在 GitHub Release，运行时按需下载到 `~/.cache/leetcode-skills/problems`。

**维护题库（仅题库更新时）：**

```bash
# 1. 抓取全量题库到用户缓存，并更新插件内的紧凑索引
python3 ${CLAUDE_SKILL_DIR}/scripts/build-problem-cache.py

# 2. 打包为确定性 Release 资产，并更新 cache-manifest.json
python3 ${CLAUDE_SKILL_DIR}/scripts/pack-problem-cache.py \
  --out /tmp/leetcode-problems-v1.tar.gz

# 3. 上传资产（版本不变时上传覆盖，版本变化时换 tag 并同步清单）
gh release create problem-cache-v1 /tmp/leetcode-problems-v1.tar.gz
```

**项目骨架生成**：拿到题目信息后，使用脚手架脚本生成项目，不要手工复制 `templates/`：

```bash
node "${CLAUDE_SKILL_DIR}/scripts/scaffold-project.mjs" \
  --out ./leetcode-{题号}-{slug}-visualization \
  --number {题号} --title "{中文标题}" --slug {slug} \
  --repo "$(git remote get-url origin)"
```

**索引文件结构** (`index.json`)：
```json
{
  "byNumber": {
    "1": "two-sum",
    "2": "add-two-numbers",
    ...
  }
}
```

索引只用于题号 → slug 解析。标题、难度、描述、约束都在题目文件（Release 缓存）里，避免把元信息重复存两份。

**重新生成索引**（如有新题）：
```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/build-problem-cache.py
```
