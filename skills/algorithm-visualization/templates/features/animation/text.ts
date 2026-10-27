export type FittedNodeLabel = {
  text: string;
  fontSize: number;
  truncated: boolean;
};

function characterWidth(char: string): number {
  // CJK / 全角 / emoji 按 1em，其余按 0.6em 估算。
  return /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-￯]/.test(char) ? 1 : 0.6;
}

export function measureTextWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const char of text) {
    width += characterWidth(char) * fontSize;
  }
  return width;
}

/**
 * 节点文字必须留在圆内：先 12px → 9px 逐级缩小，仍放不下再截断加省略号。
 * 截断不会丢信息：调用方把完整文字写进 SVG <title> 与 aria-label。
 */
export function fitNodeLabel(
  text: string,
  radius: number,
  baseFontSize = 12,
  minFontSize = 9
): FittedNodeLabel {
  if (!text) {
    return { text, fontSize: baseFontSize, truncated: false };
  }
  const maxWidth = Math.max(radius * 2 - 12, 14);
  if (measureTextWidth(text, baseFontSize) <= maxWidth) {
    return { text, fontSize: baseFontSize, truncated: false };
  }

  let fontSize = baseFontSize;
  while (fontSize > minFontSize && measureTextWidth(text, fontSize) > maxWidth) {
    fontSize = Math.max(minFontSize, fontSize - 0.5);
  }
  if (measureTextWidth(text, fontSize) <= maxWidth) {
    return { text, fontSize, truncated: false };
  }

  let fitted = '';
  for (const char of text) {
    if (measureTextWidth(`${fitted}${char}…`, fontSize) > maxWidth) {
      break;
    }
    fitted += char;
  }
  return {
    text: fitted ? `${fitted}…` : '…',
    fontSize,
    truncated: true
  };
}
