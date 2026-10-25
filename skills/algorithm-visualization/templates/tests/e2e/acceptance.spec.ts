import { expect, test, type Page } from '@playwright/test';

/**
 * 通用验收用例：不得写死某道题的样例值或变量名。
 * 题目专属断言请新增用例，不要删除或弱化这里的通用用例。
 */

async function gotoHome(page: Page) {
  await page.goto('');
  await expect(page.getByTestId('app-root')).toBeVisible();
}

function parseStepText(text: string): { current: number; total: number } {
  const match = text.match(/Step\s+(\d+)\s*\/\s*(\d+)/i);
  if (!match) {
    throw new Error(`无法解析步骤文本: ${text}`);
  }
  return {
    current: Number(match[1]),
    total: Number(match[2])
  };
}

test.describe('Algorithm Visualization Acceptance', () => {
  test('E2E-001 首屏单屏布局与关键元素可见', async ({ page }) => {
    await gotoHome(page);

    await expect(page.getByTestId('problem-header')).toBeVisible();
    await expect(page.getByTestId('data-input-bar')).toBeVisible();
    await expect(page.getByTestId('visualization-canvas')).toBeVisible();
    await expect(page.getByTestId('step-narration')).toBeVisible();
    await expect(page.getByTestId('canvas-legend')).toBeVisible();
    await expect(page.getByTestId('operation-badge')).toBeVisible();
    await expect(page.getByTestId('code-panel')).toBeVisible();
    await expect(page.getByTestId('playback-controls')).toBeVisible();

    // 空间预算：画布优先。1920×1080 与 1366×768 都必须成立。
    const measureLayout = () =>
      page.evaluate(() => {
        const rect = (id: string) => {
          const node = document.querySelector(`[data-testid="${id}"]`);
          return node ? node.getBoundingClientRect() : null;
        };
        const header = rect('problem-header');
        const input = rect('data-input-bar');
        const tabs = rect('solution-tabs');
        const footer = rect('playback-controls');
        const canvas = rect('visualization-canvas');
        const svg = rect('canvas-svg');
        const code = rect('code-panel');
        const chromeHeight =
          (header?.height ?? 0) + (input?.height ?? 0) + (tabs?.height ?? 0) + (footer?.height ?? 0);
        return {
          innerHeight: window.innerHeight,
          headerHeight: header?.height ?? 0,
          chromeRatio: chromeHeight / window.innerHeight,
          canvasHeightRatio: (canvas?.height ?? 0) / window.innerHeight,
          svgHeightRatio: (svg?.height ?? 0) / window.innerHeight,
          canvasWidthShare: (canvas?.width ?? 0) / ((canvas?.width ?? 0) + (code?.width ?? 0)),
          scrollHeight: document.documentElement.scrollHeight
        };
      });

    const viewports = [
      { width: 1920, height: 1080, chrome: 0.22, canvas: 0.76, svg: 0.66, share: 0.7 },
      { width: 1366, height: 768, chrome: 0.26, canvas: 0.62, svg: 0.5, share: 0.68 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(250);
      const layout = await measureLayout();
      const tag = `${viewport.width}x${viewport.height}`;

      expect(layout.scrollHeight, `${tag} 出现纵向滚动`).toBeLessThanOrEqual(viewport.height + 4);
      expect(layout.headerHeight, `${tag} 顶部标题栏过高`).toBeLessThanOrEqual(52);
      expect(layout.chromeRatio, `${tag} 非画布区域占比过高`).toBeLessThanOrEqual(viewport.chrome + 0.005);
      expect(layout.canvasHeightRatio, `${tag} 画布高度占比不足`).toBeGreaterThanOrEqual(viewport.canvas);
      expect(layout.svgHeightRatio, `${tag} 绘图区高度占比不足`).toBeGreaterThanOrEqual(viewport.svg);
      expect(layout.canvasWidthShare, `${tag} 画布宽度占比不足`).toBeGreaterThanOrEqual(viewport.share);
    }
  });

  test('E2E-002 顶部三类外链具备新标签行为', async ({ page }) => {
    await gotoHome(page);

    const title = page.getByTestId('problem-title-link');
    const hot100 = page.getByTestId('hot100-link');
    const github = page.getByTestId('github-badge');

    await expect(title).toHaveAttribute('target', '_blank');
    await expect(hot100).toHaveAttribute('target', '_blank');
    await expect(github).toHaveAttribute('target', '_blank');

    await expect(hot100).toHaveAttribute('href', 'https://fuck-algorithm.github.io/leetcode-hot-100/');
    await expect(title).toHaveAttribute('href', /leetcode\.cn\/problems\//);
  });

  test('E2E-003 输入合法性：非法不重算，合法触发更新', async ({ page }) => {
    await gotoHome(page);

    const meta = page.getByTestId('timeline-meta');
    const before = await meta.innerText();

    const input = page.getByTestId('algo-input');
    const validRaw = await input.inputValue();

    await input.fill('abc');
    await input.blur();

    await expect(page.getByTestId('input-error')).toBeVisible();
    await expect(meta).toHaveText(before);

    // 使用题目自带的样例提交合法输入，避免 E2E 与具体题目的输入格式耦合。
    await page.getByTestId('sample-s1').click();

    await expect(page.getByTestId('input-error')).toHaveCount(0);
    await expect(page.getByTestId('canvas-input-echo')).toContainText(validRaw);
    await expect(meta).toContainText('Step 1');
  });

  test('E2E-004 样例按钮与随机数据可用', async ({ page }) => {
    await gotoHome(page);

    const input = page.getByTestId('algo-input');
    const echo = page.getByTestId('canvas-input-echo');

    await page.getByTestId('sample-s2').click();
    const sampleValue = await input.inputValue();
    expect(sampleValue.length).toBeGreaterThan(0);
    await expect(echo).toContainText(sampleValue);

    await page.getByTestId('random-input-btn').click();
    const randomRaw = await input.inputValue();
    expect(randomRaw.length).toBeGreaterThan(0);
    await expect(page.getByTestId('input-error')).toHaveCount(0);
    await expect(echo).toContainText(randomRaw);
  });

  test('E2E-005 语言切换与刷新记忆', async ({ page }) => {
    await gotoHome(page);

    const pythonBtn = page.getByTestId('language-python');
    await pythonBtn.click();
    await expect(pythonBtn).toHaveClass(/active/);

    await page.reload();
    await expect(page.getByTestId('language-python')).toHaveClass(/active/);
  });

  test('E2E-006 代码高亮与变量旁注随步骤变化', async ({ page }) => {
    await gotoHome(page);

    const activeLines = page.locator('.code-line.active');
    const watch = page.getByTestId('variable-watch');
    const narration = page.getByTestId('step-narration');
    const operation = page.getByTestId('operation-badge');

    const activeBefore = await activeLines.count();
    const watchBefore = await watch.innerText();
    const narrationBefore = await narration.innerText();
    const operationBefore = await operation.getAttribute('data-operation');
    expect(activeBefore).toBeGreaterThan(0);
    expect(watchBefore.trim().length).toBeGreaterThan(0);
    expect(narrationBefore.trim().length).toBeGreaterThan(0);
    expect(operationBefore).toBeTruthy();
    expect(await page.locator('.canvas-node[data-status="current"]').count()).toBeGreaterThan(0);

    await page.getByTestId('next-step-btn').click();
    await expect(page.getByTestId('timeline-meta')).toContainText('Step 2');

    const activeAfter = await activeLines.count();
    const watchAfter = await watch.innerText();
    const narrationAfter = await narration.innerText();
    expect(activeAfter).toBeGreaterThan(0);
    // 允许题目自定义变量名与高亮行数，只要求“切换步骤后有可见同步变化”。
    expect(watchAfter !== watchBefore || activeAfter !== activeBefore).toBeTruthy();
    // 每一步都必须有独立解说与操作徽标，且画布仍保留一个当前焦点。
    expect(narrationAfter).not.toBe(narrationBefore);
    expect(await operation.getAttribute('data-operation')).toBeTruthy();
    expect(await page.locator('.canvas-node[data-status="current"]').count()).toBeGreaterThan(0);
  });

  test('E2E-007 快捷键控制可用（Left/Right/Space/R）', async ({ page }) => {
    await gotoHome(page);

    const meta = page.getByTestId('timeline-meta');

    await page.keyboard.press('ArrowRight');
    await expect(meta).toContainText('Step 2');

    await page.keyboard.press('ArrowLeft');
    await expect(meta).toContainText('Step 1');

    await page.getByTestId('speed-3x').click();
    await page.keyboard.press('Space');
    await page.waitForTimeout(700);
    await page.keyboard.press('Space');

    const playingResult = parseStepText(await meta.innerText());
    expect(playingResult.current).toBeGreaterThanOrEqual(2);

    await page.keyboard.press('KeyR');
    await expect(meta).toContainText('Step 1');
  });

  test('E2E-008 进度条拖拽跳步生效', async ({ page }) => {
    await gotoHome(page);

    const track = page.getByTestId('timeline-track');
    const box = await track.boundingBox();
    expect(box).toBeTruthy();
    if (!box) {
      return;
    }

    await page.mouse.move(box.x + box.width * 0.85, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.up();

    const step = parseStepText(await page.getByTestId('timeline-meta').innerText());
    expect(step.current).toBeGreaterThanOrEqual(Math.max(2, step.total - 1));
  });

  test('E2E-009 画布支持缩放与平移', async ({ page }) => {
    await gotoHome(page);

    const svg = page.getByTestId('canvas-svg');
    const transformBefore = await page.locator('[data-testid="canvas-svg"] > g').first().getAttribute('transform');

    const box = await svg.boundingBox();
    expect(box).toBeTruthy();
    if (!box) {
      return;
    }

    await svg.hover();
    await page.mouse.wheel(0, -500);

    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6);
    await page.mouse.up();

    const transformAfter = await page.locator('[data-testid="canvas-svg"] > g').first().getAttribute('transform');
    expect(transformAfter).not.toBe(transformBefore);
  });

  test('E2E-010 算法思路弹窗可打开和关闭', async ({ page }) => {
    await gotoHome(page);

    await page.getByTestId('thought-btn').click();
    await expect(page.getByTestId('thought-modal')).toBeVisible();

    await page.getByTestId('thought-modal-close').click();
    await expect(page.getByTestId('thought-modal')).toHaveCount(0);
  });

  test('E2E-011 多解法切换行为（有多解时必须隔离）', async ({ page }) => {
    await gotoHome(page);

    const tabs = page.locator('[data-testid^="solution-tab-"]');
    const count = await tabs.count();

    if (count <= 1) {
      expect(count).toBe(1);
      return;
    }

    await page.getByTestId('next-step-btn').click();
    await expect(page.getByTestId('timeline-meta')).toContainText('Step 2');

    await tabs.nth(1).click();
    await expect(page.getByTestId('timeline-meta')).toContainText('Step 1');

    await tabs.nth(0).click();
    await expect(page.getByTestId('timeline-meta')).toContainText('Step 1');
  });

  test('E2E-012 交流群浮层与二维码比例正确', async ({ page }) => {
    await gotoHome(page);

    const button = page.getByTestId('community-btn');
    await button.hover();
    await expect(page.getByTestId('community-pop')).toBeVisible();

    const ratioCheck = await page.evaluate(() => {
      const img = document.querySelector('[data-testid="community-qr"]') as HTMLImageElement | null;
      if (!img) {
        return { ok: false, reason: 'missing-image' };
      }
      const naturalRatio = img.naturalWidth / Math.max(img.naturalHeight, 1);
      const renderedRatio = img.clientWidth / Math.max(img.clientHeight, 1);
      return {
        ok: Math.abs(naturalRatio - renderedRatio) < 0.02,
        reason: `natural=${naturalRatio}, rendered=${renderedRatio}`
      };
    });

    expect(ratioCheck.ok, ratioCheck.reason).toBeTruthy();
  });

  test('E2E-013 速度偏好刷新后保留', async ({ page }) => {
    await gotoHome(page);

    const speed2x = page.getByTestId('speed-2x');
    await speed2x.click();
    await expect(speed2x).toHaveClass(/active/);

    await page.reload();
    await expect(page.getByTestId('speed-2x')).toHaveClass(/active/);
  });

  test('E2E-014 GitHub 徽标与 Star 数展示有效', async ({ page }) => {
    await gotoHome(page);

    const badge = page.getByTestId('github-badge');
    await expect(badge).toHaveAttribute('title', '去 GitHub 仓库 Star 支持一下');

    const starText = await page.getByTestId('github-stars').innerText();
    expect(/⭐\s*\d+/.test(starText)).toBeTruthy();
  });

  test('E2E-015 无紫色主题 token', async ({ page }) => {
    await gotoHome(page);

    const hasPurple = await page.evaluate(() => {
      const cssText = Array.from(document.styleSheets)
        .map((sheet) => {
          try {
            return Array.from((sheet as CSSStyleSheet).cssRules)
              .map((rule) => rule.cssText)
              .join('\n');
          } catch {
            return '';
          }
        })
        .join('\n')
        .toLowerCase();

      return cssText.includes('purple') || cssText.includes('#800080') || cssText.includes('#7e22ce');
    });

    expect(hasPurple).toBeFalsy();
  });
});
