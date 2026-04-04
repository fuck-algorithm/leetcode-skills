import { expect, test, type Page } from '@playwright/test';

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
    await expect(page.getByTestId('code-panel')).toBeVisible();
    await expect(page.getByTestId('playback-controls')).toBeVisible();

    const noVerticalScroll = await page.evaluate(() => {
      return document.documentElement.scrollHeight <= window.innerHeight + 4;
    });
    expect(noVerticalScroll).toBeTruthy();
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
    await input.fill('abc');
    await input.blur();

    await expect(page.getByTestId('input-error')).toBeVisible();
    await expect(meta).toHaveText(before);

    await input.fill('[1,2,3]');
    await input.blur();

    await expect(page.getByTestId('input-error')).toHaveCount(0);
    await expect(page.getByTestId('canvas-input-echo')).toContainText('[1,2,3]');
    await expect(meta).toContainText('Step 1');
  });

  test('E2E-004 样例按钮与随机数据可用', async ({ page }) => {
    await gotoHome(page);

    await page.getByTestId('sample-s2').click();
    await expect(page.getByTestId('canvas-input-echo')).toContainText('[5,5,5]');

    await page.getByTestId('random-input-btn').click();
    const randomRaw = await page.getByTestId('algo-input').inputValue();
    const parsed = JSON.parse(randomRaw) as unknown;
    expect(Array.isArray(parsed)).toBeTruthy();
    expect((parsed as unknown[]).length).toBeGreaterThan(0);
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

    await expect(page.locator('.code-line.active')).toHaveCount(2);
    await expect(page.getByTestId('variable-watch')).toContainText('ans');

    await page.getByTestId('next-step-btn').click();
    await expect(page.getByTestId('timeline-meta')).toContainText('Step 2');
    await expect(page.locator('.code-line.active')).toHaveCount(1);
    await expect(page.getByTestId('variable-watch')).toContainText('x');
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
