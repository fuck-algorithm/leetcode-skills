# 质量门禁（发布前必过）

## 最终判定模型（唯一口径）

最终结论只允许两种状态：`PASS` 或 `FAIL`。

必须按以下 Blocking Gate 判定：

- B1：一票否决项为 0
- B2：`npm run lint`、`npm run type-check`、`npm run build`、`npm run test:e2e` 全部 exit code = 0
- B3：Playwright 必过集合 100% 通过
- B4：`ACCEPTANCE_CHECKLIST.md` 中 AC-001~AC-018 全部 PASS（仅 AC-006 可在无多解法时标注 N/A）
- B5：P0/P1 缺陷数为 0
- B6：Rubric 综合分 >= 80
- B7：证据完整（命令输出、关键截图、缺陷闭环记录）

判定规则：

- B1-B7 全部满足：`PASS`
- 任一 Gate 失败：`FAIL`

## 一票否决

任意一项命中，直接 `FAIL`：

1. 页面出现紫色系主视觉
2. 代码高亮与分镜步骤明显错位
3. 进度条无法拖拽
4. 快捷键（Left/Right/Space/R）失效
5. lint/type-check/build 任一失败

## 强制命令

发布前必须执行：

```bash
npm run qa:guard
npm run lint
npm run type-check
npm run build
npm run test:e2e
```

或统一执行：

```bash
npm run qa:full
```

## 失败闭环（FAIL 后必须循环）

若结论为 `FAIL`，必须执行以下循环，直到 `PASS`：

1. 记录失败证据（命令输出、截图、trace、复现输入）
2. 缺陷分级（P0/P1/P2/P3）
3. 根因定位（实现缺陷 / 测试脚本缺陷 / 环境问题）
4. 修复并回归（受影响集 + 核心冒烟）
5. 更新验收报告（本轮失败项、修复动作、复测结果）
6. 重新执行最终判定模型（B1-B7）

补充规则：

- flaky 用例最多重试 2 次；仍失败按真实缺陷处理
- 禁止跳过失败 Gate 直接结束任务